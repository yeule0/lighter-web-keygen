import { useState, useEffect } from 'react'
import { useAccount, useSignMessage, useSwitchChain } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { AccountService, AccountTier, AccountInfo } from '../lib/account-service'
import { AlertCircle, CheckCircle, Clock, Info, Zap, Shield, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AccountTierVault } from './AccountTierVault'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

interface AccountTierManagerProps {
  network: 'mainnet' | 'testnet'
}

export function AccountTierManager({ network }: AccountTierManagerProps) {
  const { address, chain } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { switchChainAsync } = useSwitchChain()
  const [currentTier, setCurrentTier] = useState<AccountTier>('standard')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null)
  
  // Form fields
  const [privateKey, setPrivateKey] = useState('')
  const [accountIndex, setAccountIndex] = useState('')
  const [apiKeyIndex, setApiKeyIndex] = useState('')
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  
  // Check if feature is available (mainnet only)
  const isMainnetOnly = network !== 'mainnet'
  
  // Current account info for vault
  const [currentAccountInfo, setCurrentAccountInfo] = useState<AccountInfo | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingTier, setPendingTier] = useState<AccountTier | null>(null)
  const [tempAccountIndex, setTempAccountIndex] = useState<number | null>(null)
  const [isGeneratingTempKey, setIsGeneratingTempKey] = useState(false)

  useEffect(() => {
    // Check time restriction on mount and update
    const checkTimeRestriction = () => {
      const timeCheck = AccountService.canSwitchBasedOnTime(address)
      if (!timeCheck.canSwitch && timeCheck.timeRemaining) {
        const hours = Math.floor(timeCheck.timeRemaining / (1000 * 60 * 60))
        const minutes = Math.floor((timeCheck.timeRemaining % (1000 * 60 * 60)) / (1000 * 60))
        setTimeRemaining(`${hours}h ${minutes}m`)
      } else {
        setTimeRemaining(null)
      }
    }
    
    checkTimeRestriction()
    const interval = setInterval(checkTimeRestriction, 60000) // Update every minute
    
    return () => clearInterval(interval)
  }, [address])

  // Handle vault restore
  const handleVaultRestore = (info: AccountInfo) => {
    setPrivateKey(info.privateKey)
    setAccountIndex(info.accountIndex.toString())
    setApiKeyIndex(info.apiKeyIndex.toString())
    setCurrentAccountInfo(info)
    setFormError(null)
    
    // Load tier from localStorage
    if (!isMainnetOnly) {
      const tier = AccountService.getCurrentTier(network, info.accountIndex)
      setCurrentTier(tier)
    }
  }
  
  // Update current account info when form changes
  useEffect(() => {
    if (privateKey && accountIndex && apiKeyIndex) {
      const accountIndexNum = parseInt(accountIndex, 10)
      const apiKeyIndexNum = parseInt(apiKeyIndex, 10)
      
      if (!isNaN(accountIndexNum) && !isNaN(apiKeyIndexNum)) {
        const info: AccountInfo = {
          accountIndex: accountIndexNum,
          apiKeyIndex: apiKeyIndexNum,
          privateKey: privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`,
          network
        }
        setCurrentAccountInfo(info)
        
        // Load tier from localStorage
        if (!isMainnetOnly) {
          const tier = AccountService.getCurrentTier(network, accountIndexNum)
          setCurrentTier(tier)
        }
      }
    } else {
      setCurrentAccountInfo(null)
    }
  }, [privateKey, accountIndex, apiKeyIndex, network, isMainnetOnly])

  const validateForm = (): boolean => {
    setFormError(null)
    
    if (!privateKey.trim()) {
      setFormError('Private key is required')
      return false
    }
    
    if (!accountIndex.trim()) {
      setFormError('Account index is required')
      return false
    }
    
    const accountIndexNum = parseInt(accountIndex, 10)
    if (isNaN(accountIndexNum) || accountIndexNum < 0) {
      setFormError('Account index must be a valid positive number')
      return false
    }
    
    if (!apiKeyIndex.trim()) {
      setFormError('API key index is required')
      return false
    }
    
    const apiKeyIndexNum = parseInt(apiKeyIndex, 10)
    if (isNaN(apiKeyIndexNum) || apiKeyIndexNum < 0 || apiKeyIndexNum > 255) {
      setFormError('API key index must be between 0 and 255')
      return false
    }
    
    // Basic private key validation (hex string)
    const cleanKey = privateKey.replace('0x', '')
    if (!/^[0-9a-fA-F]{80}$/.test(cleanKey)) {
      setFormError('Invalid private key format')
      return false
    }
    
    return true
  }

  const handleGenerateTempKeyAndSwitch = async () => {
    if (!tempAccountIndex || !pendingTier || !address) return
    
    setIsGeneratingTempKey(true)
    setShowConfirmDialog(false)
    setMessage(null)
    
    try {
      
      if (chain && chain.id !== mainnet.id) {
        setMessage({ type: 'info', text: 'Switching to Ethereum mainnet for signature...' })
        try {
          await switchChainAsync({ chainId: mainnet.id })
        } catch (switchError: any) {
          throw new Error('Please switch to Ethereum mainnet to sign the transaction')
        }
      }
      
      setMessage({ type: 'info', text: 'Generating temporary API key...' })
      
      
      const tempCredentials = await AccountService.generateAndRegisterTempKey(
        network,
        tempAccountIndex,
        0, 
        signMessageAsync
      )
      
      setMessage({ type: 'info', text: 'Switching account tier...' })
      
      
      const result = await AccountService.switchTier(tempCredentials, pendingTier, address)
      
      if (result.success) {
        setCurrentTier(pendingTier)
        const isVerifyingTemp = currentTier === pendingTier
        setMessage({ 
          type: 'success', 
          text: isVerifyingTemp 
            ? `Successfully verified ${pendingTier} tier (Using temporary API key)`
            : `${result.message} (Using temporary API key)`
        })
        AccountService.saveTierInfo(network, tempCredentials.accountIndex, pendingTier)
      } else {
        const errorMessage = result.message.toLowerCase()
        if (errorMessage.includes('already has this tier') || 
            errorMessage.includes('account already has this tier') ||
            errorMessage.includes('ineligible for changing tiers')) {
          setCurrentTier(pendingTier)
          AccountService.saveTierInfo(network, tempCredentials.accountIndex, pendingTier)
          setMessage({ 
            type: 'info', 
            text: `Your account is already on the ${pendingTier} tier.` 
          })
        } else {
          setMessage({ type: 'error', text: result.message })
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate temporary credentials'
      
      if (errorMessage.includes('User rejected') || errorMessage.includes('User denied') || errorMessage.includes('cancelled by user')) {
        setMessage({ 
          type: 'error', 
          text: 'Transaction cancelled' 
        })
      } else {
        setMessage({ 
          type: 'error', 
          text: errorMessage
        })
      }
    } finally {
      setIsGeneratingTempKey(false)
      setPendingTier(null)
      setTempAccountIndex(null)
    }
  }

  const handleTierSwitch = async (newTier: AccountTier) => {
    
    const hasFormData = privateKey || accountIndex || apiKeyIndex
    
    if (hasFormData && !validateForm()) {
      return
    }

    // If verifying current tier (not switching), skip time restriction
    const isVerifying = currentTier === newTier

    // Check time restriction only for actual tier changes
    if (!isVerifying) {
      const timeCheck = AccountService.canSwitchBasedOnTime(address)
      if (!timeCheck.canSwitch) {
        setMessage({ 
          type: 'error', 
          text: 'You must wait at least 3 hours between tier changes.' 
        })
        return
      }
    }

    setIsLoading(true)
    setMessage(null)

    try {
      let accountInfo: AccountInfo
      
      if (hasFormData) {
        
        accountInfo = {
          accountIndex: parseInt(accountIndex, 10),
          apiKeyIndex: parseInt(apiKeyIndex, 10),
          privateKey: privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`,
          network
        }
      } else {
        
        if (!address) {
          throw new Error('Please connect your wallet first')
        }
        
        try {
          
          const accountIdx = await AccountService.getAccountIndex(address, network)
          setTempAccountIndex(accountIdx)
          setPendingTier(newTier)
          setShowConfirmDialog(true)
          setIsLoading(false)
          return 
        } catch (error) {
          throw error
        }
      }
      
      const result = await AccountService.switchTier(accountInfo, newTier, address)
      
      if (result.success) {
        setCurrentTier(newTier)
        const successMessage = isVerifying
          ? `Successfully verified ${newTier} tier`
          : hasFormData 
            ? result.message 
            : `${result.message} (Using temporary credentials)`
        setMessage({ type: 'success', text: successMessage })
        // Save new tier to localStorage with timestamp
        AccountService.saveTierInfo(network, accountInfo.accountIndex, newTier)
        
        if (hasFormData) {
          setPrivateKey('')
          setAccountIndex('')
          setApiKeyIndex('')
          setShowPrivateKey(false)
          setCurrentAccountInfo(null)
        }
        // Update time restriction
        const timeCheck = AccountService.canSwitchBasedOnTime(address)
        if (!timeCheck.canSwitch && timeCheck.timeRemaining) {
          const hours = Math.floor(timeCheck.timeRemaining / (1000 * 60 * 60))
          const minutes = Math.floor((timeCheck.timeRemaining % (1000 * 60 * 60)) / (1000 * 60))
          setTimeRemaining(`${hours}h ${minutes}m`)
        }
      } else {
        // Check if error indicates account already has this tier
        const errorMessage = result.message.toLowerCase()
        if (errorMessage.includes('already has this tier') || 
            errorMessage.includes('account already has this tier') ||
            errorMessage.includes('ineligible for changing tiers')) {
          // Sync the actual tier
          setCurrentTier(newTier)
          AccountService.saveTierInfo(network, accountInfo.accountIndex, newTier)
          setMessage({ 
            type: 'info', 
            text: `Your account is already on the ${newTier} tier.` 
          })
        } else {
          setMessage({ type: 'error', text: result.message })
        }
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to switch tier' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Account Tier Management
        </h2>
        
        {isMainnetOnly && (
          <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <p className="text-amber-600 dark:text-amber-400 font-medium">Mainnet Only Feature</p>
              <p className="text-amber-600/80 dark:text-amber-400/80 text-sm">Account tier switching is only available on mainnet. Please switch to mainnet to use this feature.</p>
            </div>
          </div>
        )}
        
        {message && (
          <div className={`mb-4 p-4 rounded-lg flex items-start gap-3 ${
            message.type === 'success' ? 'bg-green-500/10 border border-green-500/20' :
            message.type === 'error' ? 'bg-red-500/10 border border-red-500/20' :
            'bg-blue-500/10 border border-blue-500/20'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            ) : message.type === 'error' ? (
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            ) : (
              <Info className="h-5 w-5 text-blue-500 mt-0.5" />
            )}
            <p className={`${
              message.type === 'success' ? 'text-green-600 dark:text-green-400' :
              message.type === 'error' ? 'text-red-600 dark:text-red-400' :
              'text-blue-600 dark:text-blue-400'
            }`}>{message.text}</p>
          </div>
        )}

        {timeRemaining && (
          <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
            <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="text-yellow-600 dark:text-yellow-400 font-medium">Time restriction active</p>
              <p className="text-yellow-600/80 dark:text-yellow-400/80 text-sm">You can switch tiers again in {timeRemaining}</p>
            </div>
          </div>
        )}

        {/* Vault Integration */}
        {!isMainnetOnly && (
          <div className="mb-6">
            <AccountTierVault
              accountInfo={currentAccountInfo}
              onRestore={handleVaultRestore}
              network={network}
            />
          </div>
        )}

        {/* Account Details Form */}
        <div className={`mb-6 border rounded-lg card-hover shadow-glow animate-fade-in ${
          isMainnetOnly 
            ? 'bg-muted/30 opacity-60' 
            : 'bg-background'
        }`}>
          <div className="p-6">
            <h3 className="text-lg font-medium mb-2">Enter Account Details <span className="text-sm font-normal text-muted-foreground">(Optional)</span></h3>
            <p className="text-sm text-muted-foreground mb-5">Leave empty to use temporary credentials for verification</p>
          
          {formError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm">{formError}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="privateKey" className="text-sm">API Private Key <span className="text-xs text-muted-foreground">(Optional)</span></Label>
              <div className="relative mt-1.5">
                <Input
                  id="privateKey"
                  type={showPrivateKey ? "text" : "password"}
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder="0x..."
                  className="pr-10 font-mono text-sm"
                  disabled={isMainnetOnly}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                  disabled={isMainnetOnly}
                >
                  {showPrivateKey ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="accountIndex" className="text-sm">Account Index</Label>
                <Input
                  id="accountIndex"
                  type="number"
                  value={accountIndex}
                  onChange={(e) => setAccountIndex(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="mt-1.5"
                  disabled={isMainnetOnly}
                />
              </div>
              
              <div>
                <Label htmlFor="apiKeyIndex" className="text-sm">API Key Index</Label>
                <Input
                  id="apiKeyIndex"
                  type="number"
                  value={apiKeyIndex}
                  onChange={(e) => setApiKeyIndex(e.target.value)}
                  placeholder="0"
                  min="0"
                  max="255"
                  className="mt-1.5"
                  disabled={isMainnetOnly}
                />
              </div>
            </div>
            
            <div className="pt-2">
              <span className="text-xs text-muted-foreground block">Network: {network}</span>
            </div>
          </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Standard Tier Card */}
          <div className={`relative border rounded-lg p-6 overflow-hidden card-hover shadow-glow animate-fade-in ${
            currentTier === 'standard' 
              ? 'border-primary bg-primary/5 shadow-glow-primary' 
              : 'border-border bg-card'
          }`}>
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 pointer-events-none" />
            <div className="relative z-10">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold">Standard Account</h3>
                  <p className="text-sm text-muted-foreground mt-1">Perfect for retail traders</p>
                </div>
                {currentTier === 'standard' && (
                  <div className="px-3 py-1 bg-green-500/20 dark:bg-green-500/10 rounded-full">
                    <span className="text-xs font-medium text-green-700 dark:text-green-400">Active</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="border-t pt-4 mb-6">
            <div className="space-y-3">
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                  <span>0% Maker Fee</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                  <span>0% Taker Fee</span>
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">300ms Taker Latency</span>
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">200ms Maker/Cancel Latency</span>
                </li>
                <li className="flex items-center gap-2">
                  <Info className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">60 API requests/minute</span>
                </li>
              </ul>
            </div>
            </div>
            
            <Button
              onClick={() => handleTierSwitch('standard')}
              disabled={isLoading || isMainnetOnly}
              variant={currentTier === 'standard' ? 'outline' : 'secondary'}
              className="w-full"
            >
              {currentTier === 'standard' ? 'Verify Standard Tier' : 'Switch to Standard'}
            </Button>
            </div>
          </div>

          {/* Premium Tier Card */}
          <div className={`relative border rounded-lg p-6 overflow-hidden card-hover shadow-glow animate-fade-in ${
            currentTier === 'premium' 
              ? 'border-primary bg-primary/5 shadow-glow-primary' 
              : 'border-border bg-card'
          }`}>
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-purple-500/10 dark:to-purple-500/5 pointer-events-none" />
            <div className="relative z-10">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold">Premium Account</h3>
                  <p className="text-sm text-muted-foreground mt-1">Optimized for HFT</p>
                </div>
                {currentTier === 'premium' && (
                  <div className="px-3 py-1 bg-green-500/20 dark:bg-green-500/10 rounded-full">
                    <span className="text-xs font-medium text-green-700 dark:text-green-400">Active</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="border-t pt-4 mb-6">
            <div className="space-y-3">
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                  <span>0.002% Maker Fee</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                  <span>0.02% Taker Fee</span>
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
                  <span>150ms Taker Latency</span>
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
                  <span>0ms Maker/Cancel Latency</span>
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
                  <span>2400 API requests/minute</span>
                </li>
              </ul>
            </div>
            </div>
            
            <Button
              onClick={() => handleTierSwitch('premium')}
              disabled={isLoading || isMainnetOnly}
              variant={currentTier === 'premium' ? 'outline' : 'default'}
              className="w-full"
            >
              {currentTier === 'premium' ? 'Verify Premium Tier' : 'Switch to Premium'}
            </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg card-hover shadow-glow animate-fade-in">
          <h4 className="text-sm font-medium mb-2">Requirements for Tier Switching:</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>No open positions</span>
            </li>
            <li className="flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>No open orders</span>
            </li>
            <li className="flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>At least 3 hours since last tier change</span>
            </li>
          </ul>
        </div>
        
        {/* Confirmation Dialog for Temporary Key Generation */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Temporary API Key</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Since no API key was provided, a temporary API key will be generated to verify your tier status.
              </p>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  A temporary key will be created and used only for this tier switch operation. It won't be stored anywhere.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirmDialog(false)
                  setPendingTier(null)
                  setTempAccountIndex(null)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateTempKeyAndSwitch}
                disabled={isGeneratingTempKey}
              >
                {isGeneratingTempKey ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}