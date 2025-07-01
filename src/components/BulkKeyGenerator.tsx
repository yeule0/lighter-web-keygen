import { useState, useEffect } from 'react'
import { useSignMessage, useAccount, useSwitchChain } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { LighterFullCrypto } from '../lib/lighter-full'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { copyToClipboard } from '@/lib/clipboard'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

interface BulkGenerationResult {
  privateKey: string
  publicKey: string
  keyIndex: number
  accountIndex: number
  network: 'mainnet' | 'testnet'
}
import { 
  AlertCircle, 
  CheckCircle2, 
  Key, 
  Loader2, 
  Download,
  Copy,
  Layers,
  Eye,
  EyeOff,
  Link,
  Hash,
  AlertTriangle,
  Plus,
  Minus,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Settings2
} from 'lucide-react'

interface BulkKeyGeneratorProps {
  address: string
  accountIndex: number
  network: 'mainnet' | 'testnet'
}

export function BulkKeyGenerator({ accountIndex, network }: BulkKeyGeneratorProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [keyCount, setKeyCount] = useState('3')
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState<'setup' | 'processing' | 'complete'>('setup')
  const [generatedKeys, setGeneratedKeys] = useState<BulkGenerationResult[]>([])
  const [startingIndex, setStartingIndex] = useState('1')
  const [currentKeyIndex, setCurrentKeyIndex] = useState(0)
  const [showPrivateKeys, setShowPrivateKeys] = useState<{ [key: number]: boolean }>({})
  const [isWaitingForRateLimit, setIsWaitingForRateLimit] = useState(false)
  const [currentDelaySeconds, setCurrentDelaySeconds] = useState(3)
  const [useManualRateLimit, setUseManualRateLimit] = useState(false)
  const [manualDelaySeconds, setManualDelaySeconds] = useState('5')
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  
  const { signMessageAsync } = useSignMessage()
  const { chain } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const { toast } = useToast()

  useEffect(() => {
    setLoading(false)
    setError(null)
    setProgress(0)
    setCurrentStep('setup')
    setGeneratedKeys([])
    setCurrentKeyIndex(0)
    setShowPrivateKeys({})
    setIsWaitingForRateLimit(false)
    setCurrentDelaySeconds(3)
    setUseManualRateLimit(false)
    setManualDelaySeconds('5')
    setShowAdvancedSettings(false)
  }, [network])

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

  const handleBulkGenerate = async () => {
    const count = parseInt(keyCount)
    const startIndex = parseInt(startingIndex)

    if (isNaN(count) || count < 1 || count > 20) {
      setError('Please enter a valid number of keys between 1 and 20')
      return
    }

    if (isNaN(startIndex) || startIndex < 1 || startIndex > 1000) {
      setError('Please enter a valid starting index between 1 and 1000')
      return
    }

    setLoading(true)
    setError(null)
    setCurrentStep('processing')
    setProgress(0)
    setGeneratedKeys([])

    try {
      if (chain?.id !== mainnet.id) {
        await switchChainAsync({ chainId: mainnet.id })
      }
      const keys: BulkGenerationResult[] = []
      const crypto = await LighterFullCrypto.initialize()

      // Generate a bootstrap key
      const defaultKey = await crypto.getDefaultKey()
      await crypto.setCurrentKey(defaultKey.privateKey)
      
      // Rate limiting configuration
      let currentDelay = useManualRateLimit ? parseInt(manualDelaySeconds) * 1000 : 3000
      const MIN_DELAY = 2000 
      const MAX_DELAY = 15000 
      const INCREASE_FACTOR = 2.0 
      const DECREASE_FACTOR = 0.8 
      setCurrentDelaySeconds(useManualRateLimit ? parseInt(manualDelaySeconds) : 3) 
      
      setCurrentStep('processing')
      const keyPairs = await Promise.all(
        Array.from({ length: count }, async (_, i) => {
          const keyPair = await crypto.generateApiKey()
          return { keyPair, index: i }
        })
      )
      
      const noncePromises = Array.from({ length: count }, (_, i) => {
        const keyIndex = startIndex + i
        const nonceUrl = `${networkConfig[network].url}/api/v1/nextNonce?account_index=${accountIndex}&api_key_index=${keyIndex}`
        return fetch(nonceUrl)
          .then(res => {
            if (!res.ok) {
              return res.text().then(text => {
                throw new Error(`Failed to fetch nonce for key ${keyIndex}: ${res.status} ${text}`)
              })
            }
            return res.json()
          })
          .then(data => ({ keyIndex, nonce: data.nonce }))
      })
      
      const nonces = await Promise.all(noncePromises)
      const nonceMap = new Map(nonces.map(n => [n.keyIndex, n.nonce]))
      
      let i = 0
      while (i < count) {
        const keyIndex = startIndex + i
        setCurrentKeyIndex(keyIndex)
        setProgress(((i + 1) / count) * 100)

        const { keyPair } = keyPairs[i]
        const nonce = nonceMap.get(keyIndex)
        
        const MAX_TIMESTAMP = 281474976710655
        const TEN_MINUTES = 10 * 60 * 1000
        const expiredAt = Math.min(Date.now() + TEN_MINUTES, MAX_TIMESTAMP)
        
        // Sign the change pubkey transaction
        let result;
        try {
          result = await crypto.signChangePubKey({
            newPubkey: keyPair.publicKey,
            newPrivkey: keyPair.privateKey,
            accountIndex: accountIndex,
            apiKeyIndex: keyIndex,
            nonce: nonce,
            expiredAt: expiredAt,
            chainId: networkConfig[network].chainId,
          })
        } catch (err) {
          throw new Error(err instanceof Error ? err.message : 'Failed to create transaction')
        }
        
        // Switch to mainnet for L1 signature if needed
        let l1Signature: string
        try {
          if (chain && chain.id !== mainnet.id) {
            await switchChainAsync({ chainId: mainnet.id })
          }
          
          l1Signature = await signMessageAsync({ message: result.messageToSign })
        } catch (error: any) {
          if (error?.message?.includes('User rejected') || error?.message?.includes('User denied')) {
            throw new Error('Transaction cancelled by user')
          }
          throw new Error(`Failed to sign message: ${error?.message || 'Unknown error'}`)
        }

        // Prepare transaction data
        const { MessageToSign, ...transactionWithoutMessage } = result.transaction
        const txInfo = {
          ...transactionWithoutMessage,
          L1Sig: l1Signature
        }
        
        // Submit transaction using FormData
        const formData = new FormData()
        formData.append('tx_type', '8')
        formData.append('tx_info', JSON.stringify(txInfo))
        
        const response = await fetch(`${networkConfig[network].url}/api/v1/sendTx`, {
          method: 'POST',
          body: formData
        })

        const responseText = await response.text()
        
        if (!response.ok) {
          let errorMessage = `Failed to register key ${keyIndex}`
          let isRateLimited = false
          
          
          if (response.status === 429 || response.status === 503) {
            isRateLimited = true
            
            if (!useManualRateLimit) {
              currentDelay = Math.min(currentDelay * INCREASE_FACTOR, MAX_DELAY)
              setCurrentDelaySeconds(Math.round(currentDelay / 1000))
            }
          }
          
          try {
            const errorData = JSON.parse(responseText)
            errorMessage = errorData.message || errorData.error || errorMessage
            // Also check for rate limit messages in the response
            if (errorMessage.toLowerCase().includes('rate limit') || 
                errorMessage.toLowerCase().includes('too many request') ||
                errorMessage.toLowerCase().includes('ratelimit')) {
              isRateLimited = true
              if (!useManualRateLimit) {
                currentDelay = Math.min(currentDelay * INCREASE_FACTOR, MAX_DELAY)
                setCurrentDelaySeconds(Math.round(currentDelay / 1000))
              }
            }
          } catch {
          }
          
          
          if (isRateLimited) {
            console.log(`Rate limited. Increasing delay to ${currentDelay}ms`)
            setIsWaitingForRateLimit(true)
            await new Promise(resolve => setTimeout(resolve, currentDelay))
            setIsWaitingForRateLimit(false)
            continue 
          }
          
          throw new Error(errorMessage)
        }
        
        // Success! Decrease delay for next request (only if not using manual rate limit)
        if (!useManualRateLimit) {
          currentDelay = Math.max(currentDelay * DECREASE_FACTOR, MIN_DELAY)
          setCurrentDelaySeconds(Math.round(currentDelay / 1000))
        }
        
        // Wait a bit for transaction to be processed before next one
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Add to successful keys
        keys.push({
          privateKey: keyPair.privateKey,
          publicKey: keyPair.publicKey,
          keyIndex,
          accountIndex,
          network
        })

        // Move to next key
        i++
        
        if (i < count) {
          setIsWaitingForRateLimit(true)
          await new Promise(resolve => setTimeout(resolve, currentDelay)) 
          setIsWaitingForRateLimit(false)
        }

      }
      
      setGeneratedKeys(keys)
      setCurrentStep('complete')
      
      toast({
        title: "Success!",
        description: `Generated and registered ${keys.length} API keys`,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk generation failed')
      setCurrentStep('setup')
    } finally {
      setLoading(false)
    }
  }


  const downloadAllKeys = () => {
    const content = generatedKeys.map(key => 
      `=== API Key #${key.keyIndex} ===\n` +
      `Network: ${key.network}\n` +
      `Base URL: ${key.network === 'mainnet' ? 'https://mainnet.zklighter.elliot.ai' : 'https://testnet.zklighter.elliot.ai'}\n` +
      `Account Index: ${key.accountIndex}\n` +
      `API Key Index: ${key.keyIndex}\n` +
      `Public Key: ${key.publicKey}\n` +
      `Private Key: ${key.privateKey}\n` +
      `\nSecurity Notice: Save this configuration securely. The private key cannot be recovered if lost.\n` +
      `${'='.repeat(50)}\n`
    ).join('\n')

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lighter-api-keys-${network}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="card-hover shadow-glow animate-slide-up">
      <CardHeader className="p-6 sm:p-8 pb-4 sm:pb-6">
        <div className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl font-medium tracking-tight">
            <Layers className="h-5 w-5 text-primary" />
            Bulk Key Generation
            <Badge variant="secondary" className="ml-auto text-xs bg-primary/10 border-primary/20 font-mono animate-pulse-soft">Beta</Badge>
          </CardTitle>
          <CardDescription className="text-body-small text-secondary">
            Generate multiple API keys at once for different trading strategies
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-6 sm:p-8 pt-2 sm:pt-4">
        {currentStep === 'setup' && (
          <div className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Number of Keys to Generate</label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => {
                      const value = Math.max(1, parseInt(keyCount) - 1)
                      setKeyCount(value.toString())
                    }}
                    disabled={parseInt(keyCount) <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={keyCount}
                    onChange={(e) => {
                      const value = parseInt(e.target.value)
                      if (value >= 1 && value <= 20) {
                        setKeyCount(e.target.value)
                      }
                    }}
                    min="1"
                    max="20"
                    placeholder="Enter number of keys (1-20)"
                    className="text-center"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => {
                      const value = Math.min(20, parseInt(keyCount) + 1)
                      setKeyCount(value.toString())
                    }}
                    disabled={parseInt(keyCount) >= 20}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Maximum 20 keys at once for safety
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Starting Key Index</label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => {
                      const value = Math.max(1, parseInt(startingIndex) - 1)
                      setStartingIndex(value.toString())
                    }}
                    disabled={parseInt(startingIndex) <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={startingIndex}
                    onChange={(e) => {
                      const value = parseInt(e.target.value)
                      if (value >= 1 && value <= 1000) {
                        setStartingIndex(e.target.value)
                      }
                    }}
                    min="1"
                    max="1000"
                    placeholder="Enter starting index (1-1000)"
                    className="text-center"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => {
                      const value = Math.min(1000, parseInt(startingIndex) + 1)
                      setStartingIndex(value.toString())
                    }}
                    disabled={parseInt(startingIndex) >= 1000}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Keys will be generated with indices {startingIndex} to {parseInt(startingIndex) + parseInt(keyCount) - 1}
                </p>
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Settings2 className="h-4 w-4" />
                <span>Advanced Settings</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showAdvancedSettings ? 'rotate-180' : ''}`} />
              </button>
              
              {showAdvancedSettings && (
                <div className="rounded-lg border border-border/40 p-4 space-y-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="manual-rate-limit">Manual Rate Limiting</Label>
                      <p className="text-xs text-muted-foreground">
                        Override dynamic rate limiting with a fixed delay
                      </p>
                    </div>
                    <Checkbox
                      id="manual-rate-limit"
                      checked={useManualRateLimit}
                      onCheckedChange={(checked) => setUseManualRateLimit(checked as boolean)}
                    />
                  </div>
                  
                  {useManualRateLimit && (
                    <div className="space-y-2">
                      <Label htmlFor="manual-delay">Delay between requests (seconds)</Label>
                      <Input
                        id="manual-delay"
                        type="number"
                        value={manualDelaySeconds}
                        onChange={(e) => {
                          const value = parseInt(e.target.value)
                          if (value >= 2 && value <= 60) {
                            setManualDelaySeconds(e.target.value)
                          }
                        }}
                        min="2"
                        max="60"
                        placeholder="2-60 seconds"
                      />
                      <p className="text-xs text-muted-foreground">
                        All requests will use this fixed delay (minimum 2s, maximum 60s)
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button
              onClick={handleBulkGenerate}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" />
                  Generate {keyCount} Keys
                </>
              )}
            </Button>
          </div>
        )}

        {currentStep === 'processing' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>
                  {isWaitingForRateLimit 
                    ? `Waiting to avoid rate limits...` 
                    : `Processing key index ${currentKeyIndex}`} ({Math.min(Math.ceil((progress / 100) * parseInt(keyCount)), parseInt(keyCount))} of {keyCount})
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {isWaitingForRateLimit 
                  ? `Adding a ${currentDelaySeconds}-second delay between keys to respect API rate limits.`
                  : 'Please approve each signature request in your wallet.'}
              </p>
              {!useManualRateLimit && currentDelaySeconds !== 3 && (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  {currentDelaySeconds > 3 ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-orange-500" />
                      <span>Delay increased due to rate limiting</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 text-green-500" />
                      <span>Delay decreased due to successful requests</span>
                    </>
                  )}
                </div>
              )}
              {useManualRateLimit && (
                <p className="text-xs text-muted-foreground text-center">
                  Using manual rate limit: {manualDelaySeconds}s delay
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Each key requires a separate transaction. You may need to switch to Ethereum mainnet for signatures.
              </p>
            </div>
          </div>
        )}

        {currentStep === 'complete' && generatedKeys.length > 0 && (
          <div className="space-y-6">
            <Alert className="border-green-500/50">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription>
                Successfully generated and registered {generatedKeys.length} API keys!
              </AlertDescription>
            </Alert>

            <div className="flex gap-2 mb-4">
              <Button
                variant="outline"
                size="default"
                onClick={downloadAllKeys}
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                Download All
              </Button>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {generatedKeys.map((key, index) => (
                <Card key={index} className="border-green-500/20">
                  <CardContent className="p-4 sm:p-6">
                    <div className="space-y-4 sm:space-y-6">
                      <div className="flex items-start gap-2 sm:gap-3">
                        <div className="p-2 rounded-lg bg-green-500/10 animate-in-scale">
                          <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base sm:text-lg font-medium">
                            API Key #{key.keyIndex} Generated Successfully
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                            Your API key has been created for {key.network}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-3 sm:space-y-4">
                        <div className="space-y-1.5 sm:space-y-2">
                          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                            <Link className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                            <span>Base URL</span>
                          </div>
                          <div className="group relative flex items-center gap-1.5 sm:gap-2">
                            <input
                              readOnly
                              value={key.network === 'mainnet' 
                                ? 'https://mainnet.zklighter.elliot.ai' 
                                : 'https://testnet.zklighter.elliot.ai'}
                              className="flex-1 min-w-0 bg-muted/50 rounded-md px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring overflow-hidden text-ellipsis transition-all duration-200 hover:bg-muted/70"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="shrink-0 transition-all duration-200 hover:scale-110"
                              onClick={() => copyToClipboard(
                                key.network === 'mainnet' 
                                  ? 'https://mainnet.zklighter.elliot.ai' 
                                  : 'https://testnet.zklighter.elliot.ai',
                                'Base URL'
                              )}
                            >
                              <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-1.5 sm:space-y-2">
                          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                            <Key className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                            <span>Private Key</span>
                          </div>
                          <div className="group relative flex items-center gap-1.5 sm:gap-2">
                            <div className="relative flex-1 min-w-0">
                              <input
                                readOnly
                                type={showPrivateKeys[key.keyIndex] ? "text" : "password"}
                                value={key.privateKey}
                                className="w-full bg-muted/50 rounded-md px-2 sm:px-3 py-1.5 sm:py-2 pr-9 sm:pr-10 text-[11px] sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute right-0.5 sm:right-1 top-1/2 -translate-y-1/2 h-6 w-6 sm:h-7 sm:w-7 p-0"
                                onClick={() => setShowPrivateKeys(prev => ({ ...prev, [key.keyIndex]: !prev[key.keyIndex] }))}
                              >
                                {showPrivateKeys[key.keyIndex] ? (
                                  <EyeOff className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                ) : (
                                  <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                )}
                              </Button>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="shrink-0 transition-all duration-200 hover:scale-110"
                              onClick={() => copyToClipboard(key.privateKey, 'Private key')}
                            >
                              <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                          <div className="space-y-1.5 sm:space-y-2">
                            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                              <Hash className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                              <span>Account Index</span>
                            </div>
                            <div className="group relative flex items-center gap-1.5 sm:gap-2">
                              <input
                                readOnly
                                value={key.accountIndex}
                                className="flex-1 min-w-0 bg-muted/50 rounded-md px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="shrink-0"
                                onClick={() => copyToClipboard(key.accountIndex.toString(), 'Account index')}
                              >
                                <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-1.5 sm:space-y-2">
                            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                              <Layers className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                              <span>API Key Index</span>
                            </div>
                            <div className="group relative flex items-center gap-1.5 sm:gap-2">
                              <input
                                readOnly
                                value={key.keyIndex}
                                className="flex-1 min-w-0 bg-muted/50 rounded-md px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="shrink-0"
                                onClick={() => copyToClipboard(key.keyIndex.toString(), 'Key index')}
                              >
                                <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        <Alert variant="default" className="border-amber-500/50 p-3 sm:p-4">
                          <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
                          <AlertDescription className="text-[11px] sm:text-xs">
                            <strong>Security Notice</strong><br />
                            Save this configuration securely. The private key cannot be recovered if lost.
                          </AlertDescription>
                        </Alert>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setCurrentStep('setup')
                setGeneratedKeys([])
                setProgress(0)
                setShowPrivateKeys({})
              }}
              className="w-full"
            >
              Generate More Keys
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}