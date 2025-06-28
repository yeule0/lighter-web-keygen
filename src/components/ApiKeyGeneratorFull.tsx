import { useState } from 'react'
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
  onApiKeyGenerated: (data: {
    privateKey: string
    publicKey: string
    accountIndex: number
    apiKeyIndex: number
    network: 'mainnet' | 'testnet'
  }) => void
}

export function ApiKeyGeneratorFull({ accountIndex, network, onApiKeyGenerated }: ApiKeyGeneratorFullProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [step, setStep] = useState<'setup' | 'generate' | 'sign' | 'submit' | 'success'>('setup')
  
  const [setupMode, setSetupMode] = useState<'new' | 'existing' | null>(null)
  const [currentL2Key, setCurrentL2Key] = useState('')
  const [currentKeyIndex, setCurrentKeyIndex] = useState('0')
  
  const [targetKeyIndex, setTargetKeyIndex] = useState('1')
  const [generatedKeys, setGeneratedKeys] = useState<{ privateKey: string; publicKey: string } | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  
  const { signMessageAsync } = useSignMessage()
  const { chain } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const { toast } = useToast()
  
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
      
      if (setupMode === 'new') {
        setInfo('Generating a secure random bootstrap key for initial setup...')
        const defaultKey = await crypto.getDefaultKey()
        await crypto.setCurrentKey(defaultKey.privateKey)
        setCurrentL2Key(defaultKey.privateKey)
        setCurrentKeyIndex('0')
      } else if (setupMode === 'existing' && currentL2Key) {
        let keyToUse = currentL2Key.trim()
        
        if (keyToUse.startsWith('0x') || keyToUse.startsWith('0X')) {
          keyToUse = keyToUse.slice(2)
        }
        
        if (!/^[0-9a-fA-F]+$/.test(keyToUse)) {
          throw new Error('Invalid private key format. Must be hexadecimal.')
        }
        
        if (keyToUse.length !== 80) {
          throw new Error(`Invalid private key length. Expected 40 bytes (80 hex characters), got ${keyToUse.length / 2} bytes.`)
        }
        
        const pubKey = await crypto.setCurrentKey('0x' + keyToUse)
        setInfo(`Current key loaded. Public key: ${pubKey}`)
      } else {
        throw new Error('Invalid setup state')
      }
      
      setStep('generate')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateApiKey = async () => {
    setLoading(true)
    setError(null)
    setInfo(null)
    
    try {
      const crypto = await LighterFullCrypto.initialize()
      
      const keyPair = await crypto.generateApiKey()
      setGeneratedKeys(keyPair)
      
      setStep('sign')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate API key')
    } finally {
      setLoading(false)
    }
  }

  const handleSignAndSubmit = async () => {
    if (!generatedKeys) return
    
    setShowConfirmDialog(true)
  }
  
  const handleConfirmedSign = async () => {
    if (!generatedKeys) return
    
    setShowConfirmDialog(false)
    setLoading(true)
    setError(null)
    setInfo('Creating transaction with L2 signature...')
    
    try {
      const crypto = await LighterFullCrypto.initialize()
      
      setInfo('Fetching next nonce...')
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
        newPubkey: generatedKeys.publicKey,
        newPrivkey: generatedKeys.privateKey,
        accountIndex: accountIndex,
        apiKeyIndex: parseInt(targetKeyIndex),
        nonce: nonce,
        expiredAt: expiredAt,
        chainId: networkConfig[network].chainId
      })
      
      setInfo('Requesting wallet signature for L1 authorization...')

      let l1Signature: string
      try {
        if (chain && chain.id !== mainnet.id) {
          setInfo('Switching to Ethereum mainnet for L1 signature...')
          try {
            await switchChainAsync({ chainId: mainnet.id })
          } catch (switchError: any) {
            throw new Error('Please switch to Ethereum mainnet to sign the transaction')
          }
        }
        
        l1Signature = await signMessageAsync({ message: result.messageToSign })
      } catch (error: any) {
        if (error?.message?.includes('User rejected') || error?.message?.includes('User denied')) {
          throw new Error('Transaction cancelled by user')
        }
        throw new Error(`Failed to sign message: ${error?.message || 'Unknown error'}`)
      }

      const { MessageToSign, ...transactionWithoutMessage } = result.transaction
      const txInfo = {
        ...transactionWithoutMessage,
        L1Sig: l1Signature
      }
      
      setInfo('Submitting transaction to Lighter...')
      
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

      setStep('submit')
      setInfo('Transaction submitted! Waiting for confirmation...')
      
      await new Promise(resolve => setTimeout(resolve, 10000))
      
      onApiKeyGenerated({
        privateKey: generatedKeys.privateKey,
        publicKey: generatedKeys.publicKey,
        accountIndex: accountIndex,
        apiKeyIndex: parseInt(targetKeyIndex),
        network: network
      })
      
      setStep('success')
      setInfo('API key successfully registered!')
      
      toast({
        title: "Success!",
        description: "Your API key has been registered with Lighter.",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete transaction')
      setStep('sign')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: "Value copied to clipboard",
    })
  }

  return (
    <>
      <Card>
      <CardHeader className="p-6 sm:p-8 pb-4 sm:pb-6">
        <div className="space-y-2">
          <CardTitle className="flex items-center gap-2.5 text-xl sm:text-2xl font-semibold">
            <div className="p-2 rounded-lg bg-primary/10">
              <Key className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            Generate API Key
            <Badge variant="secondary" className="ml-auto text-xs">Full Crypto</Badge>
          </CardTitle>
          <CardDescription className="text-sm sm:text-base text-muted-foreground">
            Using Goldilocks field arithmetic, Poseidon2 hashing, and Schnorr signatures
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-6 sm:p-8 pt-2 sm:pt-4">
        {/* Setup Phase */}
        {step === 'setup' && (
          <div className="space-y-4">
            <Alert className="border-blue-200 dark:border-blue-900">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                This generator uses the full Lighter cryptographic library compiled to WebAssembly
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Do you have an existing L2 API key for this account?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => setSetupMode('new')}
                  variant={setupMode === 'new' ? 'default' : 'outline'}
                  className="w-full"
                >
                  No, first time setup
                </Button>
                <Button
                  onClick={() => setSetupMode('existing')}
                  variant={setupMode === 'existing' ? 'default' : 'outline'}
                  className="w-full"
                >
                  Yes, I have a key
                </Button>
              </div>
            </div>

            {setupMode === 'new' && (
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
                    Index 0 is reserved for frontend. Use 1 or higher for API access.
                  </p>
                </div>
              </div>
            )}

            {setupMode === 'existing' && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="current-key">Current L2 Private Key</Label>
                  <Input
                    id="current-key"
                    type="password"
                    value={currentL2Key}
                    onChange={(e) => setCurrentL2Key(e.target.value)}
                    placeholder="0x..."
                    className="mt-1 font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter 40 bytes (80 hex characters) with or without 0x prefix
                  </p>
                </div>
                <div>
                  <Label htmlFor="current-key-index">Current Key Index</Label>
                  <Input
                    id="current-key-index"
                    type="number"
                    value={currentKeyIndex}
                    onChange={(e) => setCurrentKeyIndex(e.target.value)}
                    min="0"
                    max="255"
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {setupMode && (
              <Button
                onClick={handleSetupComplete}
                disabled={loading || (setupMode === 'existing' && !currentL2Key)}
                className="w-full"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue
              </Button>
            )}
          </div>
        )}

        {/* Generate Phase */}
        {step === 'generate' && (
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

            {setupMode === 'existing' && (
              <div>
                <Label htmlFor="new-key-index">Target API Key Index (1-255)</Label>
                <Input
                  id="new-key-index"
                  type="number"
                  value={targetKeyIndex}
                  onChange={(e) => setTargetKeyIndex(e.target.value)}
                  min="1"
                  max="255"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Index 0 is reserved for frontend. Use 1 or higher for API access.
                </p>
              </div>
            )}

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
        {step === 'sign' && generatedKeys && (
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
                  onClick={() => copyToClipboard(generatedKeys.publicKey)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="mt-1 break-all">{generatedKeys.publicKey}</p>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Click below to sign the transaction. You'll sign with your wallet to authorize this key change.
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStep('generate')
                  setGeneratedKeys(null)
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
        {step === 'submit' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">Processing your API key registration...</p>
              <p className="text-sm text-muted-foreground mt-2">This may take up to 10 seconds</p>
            </div>
          </div>
        )}

        {/* Info Messages */}
        {info && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{info}</AlertDescription>
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
        newPublicKey: generatedKeys?.publicKey || '',
        targetKeyIndex: targetKeyIndex
      }}
    />
    </>
  )
}