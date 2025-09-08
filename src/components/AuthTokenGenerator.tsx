import { useState, useEffect } from 'react'
import { LighterFullCrypto } from '../lib/lighter-full'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { copyToClipboard } from '@/lib/clipboard'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Key,
  Loader2,
  Copy,
  Clock,
  Shield,
  AlertCircle,
  CheckCircle2,
  Info
} from 'lucide-react'

interface AuthTokenGeneratorProps {
  network: 'mainnet' | 'testnet'
  defaultAccountIndex?: number
}

export function AuthTokenGenerator({ network, defaultAccountIndex }: AuthTokenGeneratorProps) {
  const [privateKey, setPrivateKey] = useState('')
  const [accountIndex, setAccountIndex] = useState(defaultAccountIndex?.toString() || '')
  const [apiKeyIndex, setApiKeyIndex] = useState('1')
  const [expiryMinutes, setExpiryMinutes] = useState('10')
  const [customExpiry, setCustomExpiry] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [expiryInfo, setExpiryInfo] = useState<{
    expiresAt: Date
    expiresIn: string
  } | null>(null)
  
  const { toast } = useToast()
  
  const networkConfig = {
    mainnet: {
      url: 'https://mainnet.zklighter.elliot.ai',
      name: 'Mainnet'
    },
    testnet: {
      url: 'https://testnet.zklighter.elliot.ai',
      name: 'Testnet'
    }
  }

  useEffect(() => {
    setAuthToken(null)
    setExpiryInfo(null)
    setError(null)
  }, [network])

  useEffect(() => {
    if (defaultAccountIndex) {
      setAccountIndex(defaultAccountIndex.toString())
    }
  }, [defaultAccountIndex])

  const validateInputs = () => {
    if (!privateKey) {
      setError('Private key is required')
      return false
    }
    
    
    const cleanKey = privateKey.trim()
    
    if (!cleanKey.startsWith('0x')) {
      setError('Private key must start with 0x')
      return false
    }
    
   
    const hexPart = cleanKey.slice(2)
    if (hexPart.length === 0) {
      setError('Private key cannot be empty after 0x')
      return false
    }
    
    if (!/^[0-9a-fA-F]+$/.test(hexPart)) {
      setError('Private key must contain only hexadecimal characters (0-9, a-f, A-F)')
      return false
    }
    
    const accIdx = parseInt(accountIndex)
    if (isNaN(accIdx) || accIdx < 0) {
      setError('Account index must be a non-negative number')
      return false
    }
    
    const keyIdx = parseInt(apiKeyIndex)
    if (isNaN(keyIdx) || keyIdx < 1 || keyIdx > 255) {
      setError('API key index must be between 1 and 255')
      return false
    }
    
    const expiry = parseInt(expiryMinutes)
    if (isNaN(expiry) || expiry < 1 || expiry > 420) {
      setError('Expiry time must be between 1 and 420 minutes (7 hours)')
      return false
    }
    
    return true
  }

  const formatExpiryTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minute${minutes === 1 ? '' : 's'}`
    }
    
    const hours = minutes / 60
    if (hours === Math.floor(hours)) {
      return `${Math.floor(hours)} hour${hours === 1 ? '' : 's'}`
    }
    
    return `${hours.toFixed(1)} hours`
  }

  const handleGenerateToken = async () => {
    if (!validateInputs()) return
    
    setLoading(true)
    setError(null)
    setAuthToken(null)
    setExpiryInfo(null)
    
    try {
      const crypto = await LighterFullCrypto.initialize()
      
      
      await crypto.setCurrentKey(privateKey.trim())
      
      
      const expiryMs = parseInt(expiryMinutes) * 60 * 1000
      const deadline = Math.floor((Date.now() + expiryMs) / 1000)
      
      
      const token = await crypto.createAuthToken({
        deadline,
        accountIndex: parseInt(accountIndex),
        apiKeyIndex: parseInt(apiKeyIndex)
      })
      
     
      const expiresAt = new Date(deadline * 1000)
      const expiresIn = formatExpiryTime(parseInt(expiryMinutes))
      
      setAuthToken(token)
      setExpiryInfo({
        expiresAt,
        expiresIn
      })
      
      toast({
        title: "Auth Token Created",
        description: `Token expires in ${expiresIn}`,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate auth token'
      setError(errorMessage)
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCopyToken = () => {
    if (authToken) {
      copyToClipboard(authToken, 'Auth Token')
    }
  }

  const handleReset = () => {
    setAuthToken(null)
    setExpiryInfo(null)
    setPrivateKey('')
    setError(null)
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="shadow-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Auth Token Generator
          </CardTitle>
          <CardDescription>
            Generate authentication tokens for API access to Lighter {networkConfig[network].name}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {!authToken ? (
            <>
              <Alert className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-sm text-blue-800 dark:text-blue-300">
                  Auth tokens are required for programmatic access to Lighter's API. They expire after the specified duration and must be regenerated.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="privateKey">API Private Key</Label>
                  <Input
                    id="privateKey"
                    type="password"
                    placeholder="0x..."
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Lighter API private key (not your wallet private key)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountIndex">Account Index</Label>
                    <Input
                      id="accountIndex"
                      type="number"
                      placeholder="0"
                      value={accountIndex}
                      onChange={(e) => setAccountIndex(e.target.value)}
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiKeyIndex">API Key Index</Label>
                    <Input
                      id="apiKeyIndex"
                      type="number"
                      placeholder="1"
                      value={apiKeyIndex}
                      onChange={(e) => setApiKeyIndex(e.target.value)}
                      min="1"
                      max="255"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiry">Token Expiry</Label>
                  {!customExpiry ? (
                    <Select value={expiryMinutes} onValueChange={setExpiryMinutes}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                        <SelectItem value="240">4 hours</SelectItem>
                        <SelectItem value="420">7 hours (maximum)</SelectItem>
                        <SelectItem value="custom">Custom...</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Minutes (1-420)"
                        value={expiryMinutes}
                        onChange={(e) => setExpiryMinutes(e.target.value)}
                        min="1"
                        max="420"
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCustomExpiry(false)
                          setExpiryMinutes('10')
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                  {expiryMinutes === 'custom' && !customExpiry && (
                    <Button
                      variant="outline"
                      className="mt-2 w-full"
                      onClick={() => {
                        setCustomExpiry(true)
                        setExpiryMinutes('42')
                      }}
                    >
                      Set Custom Duration
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Maximum token lifetime is 7 hours (420 minutes)
                  </p>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleGenerateToken}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Token...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Generate Auth Token
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="space-y-6">
              <Alert className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-sm text-green-800 dark:text-green-300">
                  Auth token successfully generated!
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Authentication Token</Label>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="mr-1 h-3 w-3" />
                      Expires in {expiryInfo?.expiresIn}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={authToken}
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyToken}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Network</p>
                    <p className="font-medium">{networkConfig[network].name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Account Index</p>
                    <p className="font-medium">{accountIndex}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">API Key Index</p>
                    <p className="font-medium">{apiKeyIndex}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expires At</p>
                    <p className="font-medium">
                      {expiryInfo?.expiresAt.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-4">
                  <h4 className="text-sm font-medium mb-2">Usage Example</h4>
                  <pre className="text-xs font-mono overflow-x-auto">
{`curl -H "Authorization: ${authToken.substring(0, 20)}..." \\
  ${networkConfig[network].url}/api/v1/account`}
                  </pre>
                </div>
              </div>

              <Button
                onClick={handleReset}
                variant="outline"
                className="w-full"
              >
                Generate New Token
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}