import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { walletVaultService, type VaultData } from '@/lib/wallet-vault-service'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { AccountInfo } from '@/lib/account-service'
import { 
  Save, 
  Loader2, 
  Shield,
  CheckCircle2,
  Lock,
  Unlock,
  Key,
  Trash2,
  AlertTriangle,
  AlertCircle
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface AccountTierVaultProps {
  accountInfo?: AccountInfo | null
  onRestore?: (info: AccountInfo) => void
  network: 'mainnet' | 'testnet'
}

export function AccountTierVault({ accountInfo, onRestore, network }: AccountTierVaultProps) {
  const { address, isConnected } = useAccount()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [hasStoredData, setHasStoredData] = useState(false)
  const [checkingStorage, setCheckingStorage] = useState(true)
  const [showSecurityDialog, setShowSecurityDialog] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  // Storage key specific to network and address
  const getStorageKey = () => `lighter_tier_vault_${network}_${address?.toLowerCase()}`
  
  useEffect(() => {
    // Detect mobile browser
    const checkMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    setIsMobile(checkMobile)
  }, [])
  
  useEffect(() => {
    checkForStoredData()
  }, [address, network])
  
  const checkForStoredData = async () => {
    if (!address) {
      setCheckingStorage(false)
      return
    }
    
    try {
      const key = getStorageKey()
      const stored = localStorage.getItem(key)
      setHasStoredData(!!stored)
    } catch {
      setHasStoredData(false)
    }
    setCheckingStorage(false)
  }
  
  const handleSaveClick = () => {
    if (!isConnected || !address || !accountInfo) {
      toast({
        title: 'Error',
        description: 'Please connect your wallet and enter account details',
        variant: 'destructive'
      })
      return
    }
    
    setShowSecurityDialog(true)
  }
  
  const saveToVault = async () => {
    setShowSecurityDialog(false)
    
    if (!isConnected || !address || !accountInfo) {
      return
    }
    
    setLoading(true)
    
    try {
      // Create vault data structure
      const vaultData: VaultData = {
        keys: [{
          privateKey: accountInfo.privateKey,
          publicKey: '', 
          keyIndex: accountInfo.apiKeyIndex,
          accountIndex: accountInfo.accountIndex,
          network,
          address
        }],
        version: '1.0',
        timestamp: Date.now()
      }
      
      // Get wallet provider
      const provider = (window as any).ethereum
      if (!provider) {
        throw new Error('No wallet provider found')
      }
      
      // Encrypt the vault
      const encrypted = await walletVaultService.encryptVault(
        vaultData,
        address,
        provider
      )
      
      // Store encrypted data
      const key = getStorageKey()
      localStorage.setItem(key, JSON.stringify(encrypted))
      
      setHasStoredData(true)
      
      toast({
        title: 'Saved to Vault',
        description: 'Your account details have been encrypted and saved',
      })
    } catch (error) {
      // Error handled by toast notification
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save to vault',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  const restoreFromVault = async () => {
    if (!isConnected || !address) {
      toast({
        title: 'Error',
        description: 'Please connect your wallet',
        variant: 'destructive'
      })
      return
    }
    
    setLoading(true)
    
    try {
      const key = getStorageKey()
      const encryptedString = localStorage.getItem(key)
      
      if (!encryptedString) {
        throw new Error('No saved account details found')
      }
      
      // Parse encrypted vault
      const encryptedVault = JSON.parse(encryptedString)
      
      // Get wallet provider
      const provider = (window as any).ethereum
      if (!provider) {
        throw new Error('No wallet provider found')
      }
      
      // Decrypt the vault
      const decryptedVault = await walletVaultService.decryptVault(
        encryptedVault,
        address,
        provider
      )
      
      if (!decryptedVault.keys || decryptedVault.keys.length === 0) {
        throw new Error('No account details found in vault')
      }
      
      const savedKey = decryptedVault.keys[0]
      
      // Verify network matches
      if (savedKey.network !== network) {
        throw new Error(`Saved data is for ${savedKey.network}, but you're on ${network}`)
      }
      
      // Restore the data
      if (onRestore) {
        onRestore({
          accountIndex: savedKey.accountIndex,
          apiKeyIndex: savedKey.keyIndex,
          privateKey: savedKey.privateKey,
          network: savedKey.network
        })
      }
      
      toast({
        title: 'Restored from Vault',
        description: 'Your account details have been decrypted and filled',
      })
    } catch (error) {
      toast({
        title: 'Restore Failed',
        description: error instanceof Error ? error.message : 'Failed to restore from vault',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  const clearVault = async () => {
    if (!address) return
    
    try {
      const key = getStorageKey()
      localStorage.removeItem(key)
      setHasStoredData(false)
      
      toast({
        title: 'Vault Cleared',
        description: 'Your saved account details have been removed',
      })
    } catch (error) {
      toast({
        title: 'Clear Failed',
        description: 'Failed to clear vault data',
        variant: 'destructive'
      })
    }
  }
  
  if (checkingStorage) {
    return null
  }
  
  if (!isConnected) {
    return (
      <Alert className="mb-4">
        <Lock className="h-4 w-4" />
        <AlertDescription>
          Connect your wallet to use the encrypted vault feature
        </AlertDescription>
      </Alert>
    )
  }
  
  // Check if mobile
  if (isMobile) {
    return (
      <Alert className="border-yellow-500/50 bg-yellow-500/10">
        <AlertCircle className="h-4 w-4 text-yellow-500" />
        <AlertDescription className="space-y-2">
          <p className="font-medium">Desktop Feature</p>
          <p className="text-sm">Secure vault storage requires desktop browsers with MetaMask or Rabby extension. Mobile wallets don't support encryption/decryption methods.</p>
        </AlertDescription>
      </Alert>
    )
  }
  
  return (
    <div className="space-y-3">
      {/* Save Button - Show when user has entered data but hasn't saved */}
      {accountInfo && !hasStoredData && (
        <Alert className="mb-4">
          <Shield className="h-4 w-4" />
          <AlertDescription className="space-y-3">
            <p>Save your account details to an encrypted vault for quick access later</p>
            <Button
              onClick={handleSaveClick}
              disabled={loading}
              size="sm"
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Encrypting...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save to Encrypted Vault
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Restore Button */}
      {hasStoredData && !accountInfo && (
        <Alert>
          <Key className="h-4 w-4" />
          <AlertDescription className="space-y-3">
            <p>You have saved account details in your encrypted vault</p>
            <div className="flex gap-2 flex-col sm:flex-row">
              <Button
                onClick={restoreFromVault}
                disabled={loading}
                size="sm"
                variant="default"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Decrypting...
                  </>
                ) : (
                  <>
                    <Unlock className="mr-2 h-4 w-4" />
                    Restore from Vault
                  </>
                )}
              </Button>
              <Button
                onClick={clearVault}
                disabled={loading}
                size="sm"
                variant="outline"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Vault
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Update Button */}
      {hasStoredData && accountInfo && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="space-y-3">
            <p>Your account details are saved in the encrypted vault</p>
            <div className="flex gap-2">
              <Button
                onClick={handleSaveClick}
                disabled={loading}
                size="sm"
                variant="outline"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Vault
                  </>
                )}
              </Button>
              <Button
                onClick={clearVault}
                disabled={loading}
                size="sm"
                variant="outline"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Security Warning Dialog */}
      <Dialog open={showSecurityDialog} onOpenChange={setShowSecurityDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Security Notice
            </DialogTitle>
            <DialogDescription className="space-y-4 pt-4">
              <div className="space-y-4">
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="font-medium text-blue-600 dark:text-blue-400 mb-1 text-sm">Note: This only applies to the Account Tier Vault</p>
                  <p className="text-blue-600/80 dark:text-blue-400/80 text-xs leading-relaxed">The regular API key encryption tool (with sharable links) does NOT store anything - it's completely stateless and nothing is saved anywhere.</p>
                </div>
                
                <p className="font-medium text-foreground text-sm sm:text-base">You're about to save sensitive data to your browser's encrypted vault.</p>
                
                <div className="space-y-3">
                  <p className="font-medium text-foreground text-sm">How it works:</p>
                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex gap-2">
                      <span className="text-muted-foreground mt-0.5">•</span>
                      <span>Hybrid encryption using your wallet's encryption public key</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground mt-0.5">•</span>
                      <div>
                        <span>Key exchange via </span>
                        <span className="font-mono text-[10px] sm:text-xs bg-muted px-1 py-0.5 rounded inline-block">x25519-xsalsa20-poly1305</span>
                        <span> (NaCl box)</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground mt-0.5">•</span>
                      <div>
                        <span>Data encryption via </span>
                        <span className="font-mono text-[10px] sm:text-xs bg-muted px-1 py-0.5 rounded inline-block">AES-256-GCM</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground mt-0.5">•</span>
                      <span>Encrypted data is stored in your browser's localStorage</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground mt-0.5">•</span>
                      <span>Only your connected wallet can decrypt this data</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <p className="font-medium text-amber-600 text-sm">Security considerations:</p>
                  <div className="space-y-2 text-xs sm:text-sm text-amber-600">
                    <div className="flex gap-2">
                      <span className="mt-0.5">•</span>
                      <span>Browser extensions can potentially access localStorage</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="mt-0.5">•</span>
                      <span>Anyone with wallet access can decrypt the vault</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="mt-0.5">•</span>
                      <span>Data persists until manually cleared</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="mt-0.5">•</span>
                      <span>Not recommended on shared computers</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 sm:p-4 bg-muted rounded-lg">
                  <p className="font-medium mb-1 text-sm">For maximum security:</p>
                  <p className="text-muted-foreground text-xs sm:text-sm">Consider entering your API key manually each time instead of using the vault.</p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSecurityDialog(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={saveToVault}
              className="gap-2 w-full sm:w-auto"
            >
              <Lock className="h-4 w-4" />
              <span className="whitespace-nowrap">I Understand, Save to Vault</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}