import { useState, useEffect } from 'react'
import { useSignMessage, useAccount, useSwitchChain } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { LighterFullCrypto } from '../lib/lighter-full'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { copyToClipboard } from '@/lib/clipboard'
import { 
  AlertCircle, 
  CheckCircle2, 
  Key, 
  Loader2, 
  ArrowRight,
  Sparkles,
  Shield,
  Copy
} from 'lucide-react'
import { TransactionConfirmDialog } from './TransactionConfirmDialog'

interface ApiKeyGeneratorFullProps {
  address: string
  accountIndex: number
  network: 'mainnet' | 'testnet'
  defaultKeyIndex?: number
  onApiKeyGenerated: (data: {
    privateKey: string
    publicKey: string
    accountIndex: number
    apiKeyIndex: number
    network: 'mainnet' | 'testnet'
  }) => void
}

interface WorkflowState {
  step: 'setup' | 'generate' | 'sign' | 'submit' | 'success'
  generatedKeys: { privateKey: string; publicKey: string } | null
  info: string | null
}

export function ApiKeyGeneratorFull({ accountIndex, network, defaultKeyIndex, onApiKeyGenerated }: ApiKeyGeneratorFullProps) {
  const [workflowState, setWorkflowState] = useState<WorkflowState>({
    step: 'setup',
    generatedKeys: null,
    info: null
  })
  
  const [targetKeyIndex, setTargetKeyIndex] = useState(defaultKeyIndex?.toString() || '2')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  
  const { signMessageAsync } = useSignMessage()
  const { chain } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const { toast } = useToast()
  
  // Reset component state when network or account changes
  useEffect(() => {
    setWorkflowState({
      step: 'setup',
      generatedKeys: null,
      info: null
    })
    setError(null)
    setTargetKeyIndex(defaultKeyIndex?.toString() || '1')
  }, [network, accountIndex, defaultKeyIndex])
  
  const networkConfig = {
    mainnet: {
      url: 'https://mainnet.zklighter.elliot.ai',
      chainId: 304
    },
    testnet: {
      url: 'https://testnet.zklighter.elliot.ai',
      chainId: 300
    }
  }

  const handleSetupComplete = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const crypto = await LighterFullCrypto.initialize()
      
      setWorkflowState(prev => ({ 
        ...prev, 
        info: 'Generating a secure random bootstrap key for initial setup...' 
      }))
      const defaultKey = await crypto.getDefaultKey()
      await crypto.setCurrentKey(defaultKey.privateKey)
      
      setWorkflowState(prev => ({ ...prev, step: 'generate', info: null }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateApiKey = async () => {
    setLoading(true)
    setError(null)
    setWorkflowState(prev => ({ ...prev, info: null }))
    
    try {
      const crypto = await LighterFullCrypto.initialize()
      
      const keyPair = await crypto.generateApiKey()
      setWorkflowState(prev => ({ 
        ...prev, 
        generatedKeys: keyPair,
        step: 'sign' 
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate API key')
    } finally {
      setLoading(false)
    }
  }

  const handleSignAndSubmit = async () => {
    if (!workflowState.generatedKeys) return
    
    setShowConfirmDialog(true)
  }
  
  const handleConfirmedSign = async () => {
    if (!workflowState.generatedKeys) return
    
    setShowConfirmDialog(false)
    setLoading(true)
    setError(null)
    setWorkflowState(prev => ({ ...prev, info: 'Creating transaction with L2 signature...' }))
    
    try {
      const crypto = await LighterFullCrypto.initialize()
      
      setWorkflowState(prev => ({ ...prev, info: 'Fetching next nonce...' }))
      const nonceUrl = `${networkConfig[network].url}/api/v1/nextNonce?account_index=${accountIndex}&api_key_index=${targetKeyIndex}`
      const nonceResponse = await fetch(nonceUrl)
      
      if (!nonceResponse.ok) {
        throw new Error(`Failed to fetch nonce: ${nonceResponse.status} ${nonceResponse.statusText}`)
      }
      
      const nonceData = await nonceResponse.json()
      const nonce = nonceData.nonce
      
      const MAX_TIMESTAMP = 281474976710655
      const TEN_MINUTES = 10 * 60 * 1000
      const expiredAt = Math.min(Date.now() + TEN_MINUTES, MAX_TIMESTAMP)
      
      const result = await crypto.signChangePubKey({
        newPubkey: workflowState.generatedKeys.publicKey,
        newPrivkey: workflowState.generatedKeys.privateKey,
        accountIndex: accountIndex,
        apiKeyIndex: parseInt(targetKeyIndex),
        nonce: nonce,
        expiredAt: expiredAt,
        chainId: networkConfig[network].chainId
      })
      
      setWorkflowState(prev => ({ ...prev, info: 'Requesting wallet signature for L1 authorization...' }))

      let l1Signature: string
      try {
        if (chain && chain.id !== mainnet.id) {
          setWorkflowState(prev => ({ ...prev, info: 'Switching to Ethereum mainnet for L1 signature...' }))
          try {
            await switchChainAsync({ chainId: mainnet.id })
          } catch {
            throw new Error('Please switch to Ethereum mainnet to sign the transaction')
          }
        }
        
        l1Signature = await signMessageAsync({ message: result.messageToSign })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        if (errorMessage.includes('User rejected') || errorMessage.includes('User denied')) {
          throw new Error('Transaction cancelled by user')
        }
        throw new Error(`Failed to sign message: ${errorMessage}`)
      }

      const { MessageToSign: _, ...transactionWithoutMessage } = result.transaction
      const txInfo = {
        ...transactionWithoutMessage,
        L1Sig: l1Signature
      }
      
      setWorkflowState(prev => ({ ...prev, info: 'Submitting transaction to Lighter...' }))
      
      const formData = new FormData()
      formData.append('tx_type', '8')
      formData.append('tx_info', JSON.stringify(txInfo))
      
      const response = await fetch(
        `${networkConfig[network].url}/api/v1/sendTx`,
        {
          method: 'POST',
          body: formData
        }
      )

      const responseText = await response.text()

      if (!response.ok) {
        let errorMessage = 'Failed to submit transaction'
        try {
          const errorData = JSON.parse(responseText)
          errorMessage = errorData.message || errorData.error || errorMessage
        } catch {
        }
        throw new Error(errorMessage)
      }

      setWorkflowState(prev => ({ 
        ...prev, 
        step: 'submit',
        info: 'Transaction submitted! Waiting for confirmation...' 
      }))
      
      await new Promise(resolve => setTimeout(resolve, 10000))
      
      onApiKeyGenerated({
        privateKey: workflowState.generatedKeys.privateKey,
        publicKey: workflowState.generatedKeys.publicKey,
        accountIndex: accountIndex,
        apiKeyIndex: parseInt(targetKeyIndex),
        network: network
      })
      
      setWorkflowState(prev => ({ 
        ...prev, 
        step: 'success',
        info: 'API key successfully registered!' 
      }))
      
      toast({
        title: "Success!",
        description: "Your API key has been registered with Lighter.",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete transaction')
      setWorkflowState(prev => ({ ...prev, step: 'sign' }))
    } finally {
      setLoading(false)
    }
  }


  return (
    <>
      <Card className="card-hover shadow-glow animate-slide-up">
      <CardHeader className="p-6 sm:p-8 pb-4 sm:pb-6">
        <div className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl font-medium tracking-tight">
            <Key className="h-5 w-5 text-primary" />
            Generate API Key
            <Badge variant="secondary" className="ml-auto text-xs bg-primary/10 border-primary/20 font-mono animate-pulse-soft">Full Crypto</Badge>
          </CardTitle>
          <CardDescription className="text-body-small text-secondary">
            Using Goldilocks field arithmetic, Poseidon2 hashing, and Schnorr signatures
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-6 sm:p-8 pt-2 sm:pt-4">
        {/* Setup Phase */}
        {workflowState.step === 'setup' && (
          <div className="space-y-4">
            <Alert className="border-blue-200 dark:border-blue-900">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                This generator uses the full Lighter cryptographic library compiled to WebAssembly
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  A cryptographically secure random key will be generated for initial setup. This ensures maximum security for your account. Save all generated keys securely.
                </AlertDescription>
              </Alert>
              <div>
                <Label htmlFor="target-key-index">Target API Key Index (1-255)</Label>
                <Input
                  id="target-key-index"
                  type="number"
                  value={targetKeyIndex}
                  onChange={(e) => setTargetKeyIndex(e.target.value)}
                  min="1"
                  max="255"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Index 0 is reserved for desktop frontend. Index 1 is reserved for mobile. Use 2 or higher for API access.
                </p>
              </div>
              
              <Button
                onClick={handleSetupComplete}
                disabled={loading}
                className="w-full shadow-sm hover:shadow-md transition-all hover-lift"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Generate Phase */}
        {workflowState.step === 'generate' && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                <span className="text-sm">Network</span>
                <Badge variant="outline">{network === 'mainnet' ? 'Mainnet' : 'Testnet'}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                <span className="text-sm">Account Index</span>
                <Badge variant="outline">{accountIndex}</Badge>
              </div>
            </div>


            <div className="flex items-center justify-between rounded-lg bg-muted p-3">
              <span className="text-sm">Target Key Index</span>
              <Badge variant="outline">{targetKeyIndex}</Badge>
            </div>

            <Button
              onClick={handleGenerateApiKey}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate New API Key
                </>
              )}
            </Button>
          </div>
        )}

        {/* Sign Phase */}
        {workflowState.step === 'sign' && workflowState.generatedKeys && (
          <div className="space-y-4">
            <Alert className="border-green-200 dark:border-green-900">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription>
                New API key generated! Click below to sign and register it.
              </AlertDescription>
            </Alert>
            
            <div className="rounded-lg bg-muted p-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Public Key:</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(workflowState.generatedKeys!.publicKey, 'Public key')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="mt-1 break-all">{workflowState.generatedKeys.publicKey}</p>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Click below to sign the transaction. You'll sign with your wallet to authorize this key change.
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setWorkflowState({
                    step: 'generate',
                    generatedKeys: null,
                    info: null
                  })
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSignAndSubmit}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Sign & Submit
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Submit Phase */}
        {workflowState.step === 'submit' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">Processing your API key registration...</p>
              <p className="text-sm text-muted-foreground mt-2">This may take up to 10 seconds</p>
            </div>
          </div>
        )}

        {/* Info Messages */}
        {workflowState.info && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{workflowState.info}</AlertDescription>
          </Alert>
        )}

        {/* Error Messages */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      </Card>
      
      <TransactionConfirmDialog
      open={showConfirmDialog}
      onConfirm={handleConfirmedSign}
      onCancel={() => setShowConfirmDialog(false)}
      details={{
        action: 'Change API Key',
        network: network,
        accountIndex: accountIndex,
        newPublicKey: workflowState.generatedKeys?.publicKey || '',
        targetKeyIndex: targetKeyIndex
      }}
    />
    </>
  )
}