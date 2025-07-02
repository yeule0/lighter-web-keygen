import { useState } from 'react'
import { useAccount } from 'wagmi'
import { walletVaultService, type VaultData } from '@/lib/wallet-vault-service'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { copyToClipboard } from '@/lib/clipboard'
import { useToast } from '@/hooks/use-toast'
import { 
  Save, 
  Loader2, 
  Shield,
  Copy,
  CheckCircle2,
  AlertCircle,
  Lock,
  Download,
  Info,
  AlertTriangle
} from 'lucide-react'

interface SavedKey {
  privateKey: string
  publicKey: string
  keyIndex: number
  accountIndex: number
  network: 'mainnet' | 'testnet'
  address?: string
}

interface WalletKeyVaultProps {
  keys: SavedKey[]
  label?: string
  onClear?: () => void
}

export function WalletKeyVault({ keys, label = 'Generated Keys', onClear }: WalletKeyVaultProps) {
  const { address, isConnected } = useAccount()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [error, setError] = useState('')
  const [showWarning, setShowWarning] = useState(true)


  const saveToWallet = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first')
      return
    }

    const currentProvider = (window as any).ethereum
    if (!currentProvider) {
      setError('Wallet provider not available. Please make sure MetaMask or a compatible wallet is installed.')
      return
    }

    setLoading(true)
    setError('')
    setShareLink('')

    try {
      const vaultData: VaultData = {
        keys: keys,
        version: '1.0',
        timestamp: Date.now()
      }
      
      const encryptedVault = await walletVaultService.encryptVault(
        vaultData,
        address,
        currentProvider
      )
      
      const link = walletVaultService.createShareableLink(encryptedVault)
      setShareLink(link)
      
      toast({
        title: "Keys Encrypted Successfully!",
        description: "Your keys are securely encrypted using industry-standard wallet encryption",
      })
    } catch (err) {
      console.error('Encryption error:', err)
      
      let errorMessage = 'Failed to encrypt keys'
      if (err instanceof Error) {
        if (err.message.includes('User denied')) {
          errorMessage = 'You denied the encryption request'
        } else {
          errorMessage = err.message
        }
      }
      
      setError(errorMessage)
      toast({
        title: "Encryption Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyShareLink = () => {
    if (shareLink) {
      copyToClipboard(shareLink, 'Encrypted vault link')
    }
  }

  const downloadVault = () => {
    if (!shareLink) return
    
    const encryptedVault = walletVaultService.parseShareableLink(shareLink)
    if (!encryptedVault) return

    const blob = new Blob([JSON.stringify(encryptedVault, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lighter-vault-ecies-${encryptedVault.account.slice(2, 8)}-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (keys.length === 0) {
    return null
  }

  const totalKeys = keys.length

  return (
    <div className="w-full">
      <div className="space-y-1 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold">Secure Key Storage</h3>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary mr-8">
            Secure
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Encrypt your keys using secure wallet encryption
        </p>
      </div>
      <div className="space-y-4">
        {!isConnected ? (
          <Alert className="border-destructive/50 bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to use secure key storage
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {showWarning && (
              <div className="relative rounded-lg bg-muted/30 p-5">
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500/10">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                    </div>
                    <h4 className="font-medium text-base">Important: One-Time Setup</h4>
                  </div>
                  
                  <div className="space-y-4 text-sm">
                    <p className="text-muted-foreground leading-relaxed">
                      You'll see two popups:
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-background text-xs font-medium">
                          1
                        </span>
                        <div className="text-muted-foreground">
                          <p className="leading-relaxed">Request for your encryption public key</p>
                          <p className="text-xs opacity-70">(one-time only)</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-background text-xs font-medium">
                          2
                        </span>
                        <div className="text-muted-foreground">
                          <p className="leading-relaxed">Request to decrypt when retrieving keys</p>
                          <p className="text-xs opacity-70">(each time)</p>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground/60 leading-relaxed pt-2">
                      This is normal and ensures maximum security.
                    </p>
                  </div>
                  
                  <div className="pt-1">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => setShowWarning(false)}
                      className="w-full"
                    >
                      Got it
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <Alert className="border-primary/20">
              <Info className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p>This will encrypt {totalKeys} {label.toLowerCase()} using wallet encryption.</p>
                <p className="text-sm opacity-80">Works across ALL wallets - no risk of data loss!</p>
              </AlertDescription>
            </Alert>

            {!shareLink ? (
              <div className="space-y-4">
                <Button
                  onClick={saveToWallet}
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Encrypting with Wallet...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Encrypt with Wallet
                    </>
                  )}
                </Button>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <Alert className="border-green-500/50">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertDescription>
                    Keys encrypted successfully! This vault works with any compatible wallet.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>Encrypted Vault Link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={shareLink}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      onClick={copyShareLink}
                      size="icon"
                      variant="outline"
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={downloadVault}
                    variant="outline"
                    className="flex-1"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Vault
                  </Button>
                  <Button
                    onClick={() => {
                      setShareLink('')
                      setError('')
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Encrypt Again
                  </Button>
                </div>

                {onClear && (
                  <Button
                    onClick={onClear}
                    variant="ghost"
                    className="w-full"
                  >
                    Clear Keys & Start Over
                  </Button>
                )}
              </div>
            )}

          </>
        )}
      </div>
    </div>
  )
}