import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { walletVaultService, type VaultData } from '@/lib/wallet-vault-service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { copyToClipboard } from '@/lib/clipboard'
import { useToast } from '@/hooks/use-toast'
import { 
  Key, 
  Loader2, 
  Shield,
  Copy,
  CheckCircle2,
  AlertCircle,
  Lock,
  Download,
  Eye,
  EyeOff,
  Unlock,
  Monitor
} from 'lucide-react'

interface WalletKeyRetrieverProps {
  initialVaultLink?: string | null
}

export function WalletKeyRetriever({ initialVaultLink }: WalletKeyRetrieverProps) {
  const { address, isConnected } = useAccount()
  const { toast } = useToast()
  const [vaultLink, setVaultLink] = useState(initialVaultLink || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [decryptedKeys, setDecryptedKeys] = useState<VaultData | null>(null)
  const [showPrivateKeys, setShowPrivateKeys] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showConnectPrompt, setShowConnectPrompt] = useState(false)

  useEffect(() => {
    // Detect mobile browser
    const checkMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    setIsMobile(checkMobile)
  }, [])

  useEffect(() => {
    if (initialVaultLink && !isConnected && !isMobile) {
      setShowConnectPrompt(true)
    }
  }, [initialVaultLink, isConnected, isMobile])

  const provider = (window as any).ethereum

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const vault = JSON.parse(content)
        const link = walletVaultService.createShareableLink(vault)
        setVaultLink(link)
      } catch (err) {
        setError('Invalid vault file')
      }
    }
    reader.readAsText(file)
  }

  const decryptVault = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first')
      return
    }

    const currentProvider = (window as any).ethereum
    if (!currentProvider) {
      setError('Wallet provider not available. Please make sure MetaMask or a compatible wallet is installed.')
      return
    }

    if (!vaultLink) {
      setError('Please enter or upload a vault')
      return
    }

    setLoading(true)
    setError('')
    setDecryptedKeys(null)

    try {
      const encryptedVault = walletVaultService.parseShareableLink(vaultLink)
      if (!encryptedVault) {
        throw new Error('Invalid vault link')
      }
      
      const vaultData = await walletVaultService.decryptVault(
        encryptedVault,
        address,
        currentProvider
      )
      
      setDecryptedKeys(vaultData)
      
      toast({
        title: "Vault Decrypted!",
        description: `Successfully decrypted ${vaultData.keys.length} keys using wallet encryption`,
      })
    } catch (err) {
      let errorMessage = 'Failed to decrypt vault'
      if (err instanceof Error) {
        if (err.message.includes('different account')) {
          errorMessage = 'This vault was encrypted by a different wallet'
        } else if (err.message.includes('User denied message decryption')) {
          errorMessage = 'Decryption was denied. Please check your MetaMask extension for the popup and click "Decrypt" to approve. If you don\'t see a popup, check if popups are blocked in your browser.'
        } else if (err.message.includes('User denied')) {
          errorMessage = 'You denied the decryption request'
        } else {
          errorMessage = err.message
        }
      }
      
      setError(errorMessage)
      toast({
        title: "Decryption Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyKey = (key: string, label: string) => {
    copyToClipboard(key, label)
  }

  const exportKeys = () => {
    if (!decryptedKeys) return

    const exportData = {
      keys: decryptedKeys.keys.map(key => ({
        ...key,
        apiKeyIndex: key.keyIndex  
      })),
      exportedAt: new Date().toISOString(),
      version: decryptedKeys.version
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lighter-keys-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Unlock className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Decrypt Key Vault</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            Secure
          </Badge>
        </div>
        <CardDescription>
          Decrypt your keys using secure wallet decryption
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!decryptedKeys ? (
          <>
            {showConnectPrompt && !isConnected ? (
              <Alert className="border-primary/50 bg-primary/5">
                <Lock className="h-4 w-4 text-primary" />
                <AlertDescription className="space-y-3">
                  <p className="font-semibold text-base">Connect Wallet to Decrypt</p>
                  <p className="text-sm leading-relaxed">
                    You've received an encrypted vault link. Please connect your wallet to decrypt the keys.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Only the wallet that created this vault can decrypt it.
                  </p>
                </AlertDescription>
              </Alert>
            ) : isMobile ? (
              <Alert className="border-yellow-500/50 bg-yellow-500/10">
                <Monitor className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="space-y-3">
                  <p className="font-semibold text-base">Desktop Feature</p>
                  <p className="text-sm leading-relaxed">
                    Secure wallet decryption is currently available on desktop browsers with MetaMask or Rabby extension.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Please visit this page on your computer to decrypt your vault.
                  </p>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-primary/20">
                <Shield className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <p>Decryption requires wallet confirmation for security.</p>
                  <p className="text-sm opacity-80">After clicking decrypt, check your wallet extension for the approval popup!</p>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Vault Link or Upload</Label>
                <Input
                  value={vaultLink}
                  onChange={(e) => setVaultLink(e.target.value)}
                  placeholder="Paste vault link here..."
                  className="font-mono text-xs"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or upload file</span>
                </div>
              </div>

              <div>
                <Input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                />
              </div>

              <Button
                onClick={decryptVault}
                disabled={loading || !vaultLink || !isConnected || !provider || isMobile}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Decrypting with Wallet...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    {isMobile ? 'Not Available on Mobile' : isConnected ? 'Decrypt with Wallet' : 'Connect Wallet First'}
                  </>
                )}
              </Button>

            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <Alert className="border-green-500/50">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription>
                Successfully decrypted {decryptedKeys.keys.length} keys
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between">
              <Label>Private Keys</Label>
              <Button
                onClick={() => setShowPrivateKeys(!showPrivateKeys)}
                variant="ghost"
                size="sm"
              >
                {showPrivateKeys ? (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Show
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {decryptedKeys.keys.map((key, index) => (
                <div key={index} className="p-3 bg-muted/50 rounded border">
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      API Key #{key.keyIndex} • Account #{key.accountIndex}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {key.network}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Private:</span>
                      <code className="flex-1 truncate">
                        {showPrivateKeys ? key.privateKey : '••••••••••••••••••••••••••••••••'}
                      </code>
                      {showPrivateKeys && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => copyKey(key.privateKey, 'Private key')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Public:</span>
                      <code className="flex-1 truncate">{key.publicKey}</code>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => copyKey(key.publicKey, 'Public key')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>

                    {key.address && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Address:</span>
                        <code className="flex-1 truncate">{key.address}</code>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => copyKey(key.address!, 'Address')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={exportKeys}
                variant="outline"
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                Export as JSON
              </Button>
              <Button
                onClick={() => {
                  setDecryptedKeys(null)
                  setVaultLink('')
                  setShowPrivateKeys(false)
                }}
                variant="outline"
                className="flex-1"
              >
                Decrypt Another
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}