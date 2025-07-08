import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { AccountService, AccountTier, AccountInfo } from '../lib/account-service'
import { AlertCircle, CheckCircle, Clock, Info, Zap, Shield, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AccountTierVault } from './AccountTierVault'

interface AccountTierManagerProps {
  network: 'mainnet' | 'testnet'
}

export function AccountTierManager({ network }: AccountTierManagerProps) {
  const { address } = useAccount()
  const [currentTier, setCurrentTier] = useState<AccountTier>('standard')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null)
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now())
  
  // Form fields
  const [privateKey, setPrivateKey] = useState('')
  const [accountIndex, setAccountIndex] = useState('')
  const [apiKeyIndex, setApiKeyIndex] = useState('')
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  
  const isMainnetOnly = network !== 'mainnet'
  
  const currentAccountInfo: AccountInfo | null = (() => {
    if (!privateKey || !accountIndex || !apiKeyIndex) return null
    
    const accountIndexNum = parseInt(accountIndex, 10)
    const apiKeyIndexNum = parseInt(apiKeyIndex, 10)
    
    if (isNaN(accountIndexNum) || isNaN(apiKeyIndexNum)) return null
    
    return {
      accountIndex: accountIndexNum,
      apiKeyIndex: apiKeyIndexNum,
      privateKey: privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`,
      network
    }
  })()
  
  const timeRestriction = (() => {
    lastUpdateTime; // Used to trigger re-renders for time-based updates
    
    const check = AccountService.canSwitchBasedOnTime(address)
    if (!check.canSwitch && check.timeRemaining) {
      const hours = Math.floor(check.timeRemaining / (1000 * 60 * 60))
      const minutes = Math.floor((check.timeRemaining % (1000 * 60 * 60)) / (1000 * 60))
      return `${hours}h ${minutes}m`
    }
    return null
  })()

 
  useEffect(() => {
    const loadTierForWallet = async () => {
      if (!address || isMainnetOnly) return
      
      try {
        
        const accountIdx = await AccountService.getAccountIndex(address, network)
        
        const tier = AccountService.getCurrentTier(network, accountIdx)
        setCurrentTier(tier)
      } catch {
        setCurrentTier('standard')
      }
    }
    
    loadTierForWallet()
  }, [address, network, isMainnetOnly])

  useEffect(() => {
    if (timeRestriction) {
      const interval = setInterval(() => {
        setLastUpdateTime(Date.now()) // Trigger re-render to update derived time
      }, 60000)
      
      return () => clearInterval(interval)
    }
  }, [timeRestriction])

  const handleVaultRestore = (info: AccountInfo) => {
    setPrivateKey(info.privateKey)
    setAccountIndex(info.accountIndex.toString())
    setApiKeyIndex(info.apiKeyIndex.toString())
    setFormError(null)
    
    // Load tier from localStorage
    if (!isMainnetOnly) {
      const tier = AccountService.getCurrentTier(network, info.accountIndex)
      setCurrentTier(tier)
    }
  }
  
  useEffect(() => {
    if (!isMainnetOnly && currentAccountInfo) {
      const tier = AccountService.getCurrentTier(network, currentAccountInfo.accountIndex)
      setCurrentTier(tier)
    }
  }, [currentAccountInfo?.accountIndex, network, isMainnetOnly])

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


  const handleTierSwitch = async (newTier: AccountTier) => {
    
    if (!validateForm()) {
      return
    }

    if (currentTier === newTier) {
      setMessage({ 
        type: 'info', 
        text: `You are already on the ${newTier} tier` 
      })
      return
    }

   
    const timeCheck = AccountService.canSwitchBasedOnTime(address)
    if (!timeCheck.canSwitch) {
      setMessage({ 
        type: 'error', 
        text: 'You must wait at least 3 hours between tier changes.' 
      })
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      const accountInfo: AccountInfo = {
        accountIndex: parseInt(accountIndex, 10),
        apiKeyIndex: parseInt(apiKeyIndex, 10),
        privateKey: privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`,
        network
      }
      
      const result = await AccountService.switchTier(accountInfo, newTier, address)
      
      if (result.success) {
        setCurrentTier(newTier)
        setMessage({ type: 'success', text: result.message })
        // Save new tier to localStorage with timestamp
        AccountService.saveTierInfo(network, accountInfo.accountIndex, newTier)
        
       
        setPrivateKey('')
        setAccountIndex('')
        setApiKeyIndex('')
        setShowPrivateKey(false)
        setLastUpdateTime(Date.now())
      } else {
        // Check if error indicates account already has this tier
        const errorMessage = result.message.toLowerCase()
        if (errorMessage.includes('already has this tier') || 
            errorMessage.includes('account already has this tier') ||
            errorMessage.includes('ineligible for changing tiers')) {
    
          setCurrentTier(newTier)
          AccountService.saveTierInfo(network, accountInfo.accountIndex, newTier)
          
         
          AccountService.saveLastTierChangeTime(address)
          
          setMessage({ 
            type: 'info', 
            text: `Your account is already on the ${newTier} tier. Timer has been set for tier changes.` 
          })
          
          
          setLastUpdateTime(Date.now())
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
            message.type === 'warning' ? 'bg-amber-500/10 border border-amber-500/20' :
            'bg-blue-500/10 border border-blue-500/20'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            ) : message.type === 'error' ? (
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            ) : message.type === 'warning' ? (
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
            ) : (
              <Info className="h-5 w-5 text-blue-500 mt-0.5" />
            )}
            <p className={`${
              message.type === 'success' ? 'text-green-600 dark:text-green-400' :
              message.type === 'error' ? 'text-red-600 dark:text-red-400' :
              message.type === 'warning' ? 'text-amber-600 dark:text-amber-400' :
              'text-blue-600 dark:text-blue-400'
            }`}>{message.text}</p>
          </div>
        )}

        {timeRestriction && (
          <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
            <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="text-yellow-600 dark:text-yellow-400 font-medium">Time restriction active</p>
              <p className="text-yellow-600/80 dark:text-yellow-400/80 text-sm">You can switch tiers again in {timeRestriction}</p>
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
            <h3 className="text-lg font-medium mb-2">Enter Account Details</h3>
            <p className="text-sm text-muted-foreground mb-5">Provide your API key details to verify or switch tiers</p>
          
          {formError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm">{formError}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="privateKey" className="text-sm">API Private Key</Label>
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
              disabled={isLoading || isMainnetOnly || !!timeRestriction}
              variant={currentTier === 'standard' ? 'outline' : 'secondary'}
              className="w-full"
            >
              {currentTier === 'standard' ? 'Current Tier' : 'Switch to Standard'}
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
              disabled={isLoading || isMainnetOnly || !!timeRestriction}
              variant={currentTier === 'premium' ? 'outline' : 'default'}
              className="w-full"
            >
              {currentTier === 'premium' ? 'Current Tier' : 'Switch to Premium'}
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
        
      </div>
    </div>
  )
}