import { useState, useEffect } from 'react'
import { useAccount, useSignMessage, useSwitchChain } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { LighterFullCrypto } from '../lib/lighter-full'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { copyToClipboard } from '@/lib/clipboard'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { WalletKeyVault } from '@/components/WalletKeyVault'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { BulkWalletImport } from '@/components/BulkWalletImport'
import { PrivateKeySigner } from '@/lib/private-key-signer'
import { 
  AlertCircle, 
  CheckCircle2, 
  Key, 
  Loader2, 
  Download,
  Copy,
  Eye,
  EyeOff,
  Link,
  Hash,
  Layers,
  AlertTriangle,
  Wallet,
  Plus,
  Trash2,
  Info,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Settings2,
  Shield,
  FileJson
} from 'lucide-react'

interface MultiWalletKeyGeneratorProps {
  network: 'mainnet' | 'testnet'
}

interface WalletInfo {
  address: string
  addressLowercase: string
  accounts: AccountInfo[]
  checking: boolean
  error?: string
  isConnected?: boolean
  privateKey?: string  
  isBulkImported?: boolean  
}

interface AccountInfo {
  accountIndex: number
  isMainAccount: boolean
  selected: boolean
  customKeyIndex?: string
}

interface AccountToGenerate {
  walletAddress: string
  accountIndex: number
  isMainAccount: boolean
  keyIndex: number
}

interface GeneratedKeyResult {
  address: string
  accountIndex: number
  keyIndex: number
  privateKey: string
  publicKey: string
  network: 'mainnet' | 'testnet'
}

export function MultiWalletKeyGenerator({ network }: MultiWalletKeyGeneratorProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [walletInput, setWalletInput] = useState('')
  const [wallets, setWallets] = useState<WalletInfo[]>([])
  const [keyIndex, setKeyIndex] = useState('2')
  const [useCustomKeyIndices, setUseCustomKeyIndices] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState<'setup' | 'processing' | 'complete'>('setup')
  const [generatedKeys, setGeneratedKeys] = useState<GeneratedKeyResult[]>([])
  const [currentOperation, setCurrentOperation] = useState<string>('')
  const [showPrivateKeys, setShowPrivateKeys] = useState<{ [key: string]: boolean }>({})
  const [processingStatus, setProcessingStatus] = useState<string>('')
  const [currentDelaySeconds, setCurrentDelaySeconds] = useState(3)
  const [useManualRateLimit, setUseManualRateLimit] = useState(false)
  const [manualDelaySeconds, setManualDelaySeconds] = useState('5')
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [showVaultDialog, setShowVaultDialog] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  
  const { address: connectedAddress, connector } = useAccount()
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

  useEffect(() => {
    setLoading(false)
    setError(null)
    setWallets([])
    setWalletInput('')
    setProgress(0)
    setCurrentStep('setup')
    setGeneratedKeys([])
    setCurrentOperation('')
    setShowPrivateKeys({})
    setProcessingStatus('')
    setCurrentDelaySeconds(3)
    setUseManualRateLimit(false)
    setManualDelaySeconds('5')
    setShowAdvancedSettings(false)
  }, [network])

  useEffect(() => {
    if (connectedAddress) {
      const addressLower = connectedAddress.toLowerCase()
      
      
      const existingWalletIndex = wallets.findIndex(w => w.addressLowercase === addressLower)
      
      if (existingWalletIndex !== -1) {
        setWallets(prev => prev.map((w, index) => ({
          ...w,
          isConnected: index === existingWalletIndex
        })))
      } else {
        setWallets(prev => {
          const updated = prev.map(w => ({ ...w, isConnected: false }))
          return updated
        })
        
        
        checkWalletAccounts(connectedAddress, true)
      }
    }
  }, [connectedAddress, network])
  
  useEffect(() => {
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0 && accounts[0]) {
        const newAddress = accounts[0].toLowerCase()
        
        
        if (newAddress === connectedAddress?.toLowerCase()) {
          return
        }
        
        
        const existingWalletIndex = wallets.findIndex(w => w.addressLowercase === newAddress)
        
        if (existingWalletIndex !== -1) {
          
          setWallets(prev => prev.map((w, index) => ({
            ...w,
            isConnected: index === existingWalletIndex
          })))
        } else {
          
          setWallets(prev => {
            
            const updated = prev.map(w => ({ ...w, isConnected: false }))
            return updated
          })
          
          
          checkWalletAccounts(accounts[0], true)
        }
      }
    }
    
    if ((window as any).ethereum) {
      (window as any).ethereum.on?.('accountsChanged', handleAccountsChanged)
      
      return () => {
        (window as any).ethereum.removeListener?.('accountsChanged', handleAccountsChanged)
      }
    }
  }, [connectedAddress, wallets, network])

  const addWallet = () => {
    const trimmedAddress = walletInput.trim()
    const addressLowercase = trimmedAddress.toLowerCase()
    
    if (!addressLowercase.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError('Please enter a valid Ethereum address')
      return
    }

    if (wallets.some(w => w.addressLowercase === addressLowercase)) {
      setError('This wallet is already added')
      return
    }

    setError(null)
    checkWalletAccounts(trimmedAddress)
    setWalletInput('')
  }

  const checkWalletAccounts = async (walletAddress: string, isConnected: boolean = false, privateKey?: string) => {
    const addressLowercase = walletAddress.toLowerCase()
    
    setWallets(prev => [...prev, {
      address: walletAddress,
      addressLowercase: addressLowercase,
      accounts: [],
      checking: true,
      isConnected: isConnected,
      privateKey: privateKey,
      isBulkImported: !!privateKey
    }])

    try {
      const response = await fetch(
        `${networkConfig[network].url}/api/v1/accountsByL1Address?l1_address=${walletAddress}`,
        {
          headers: {
            'Accept': 'application/json',
          }
        }
      )

      if (!response.ok) {
        const responseText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(responseText)
        } catch {
          throw new Error('Failed to fetch accounts')
        }
        
        if (errorData.message === 'account not found' || response.status === 404) {
          setWallets(prev => prev.map(w => 
            w.addressLowercase === addressLowercase
              ? {
                  ...w,
                  accounts: [],
                  checking: false,
                  error: `No accounts found on ${network}. You need to register an account on Lighter first.`
                }
              : w
          ))
          return
        } else {
          throw new Error(errorData.message || 'Failed to fetch accounts')
        }
      }

      const data = await response.json()
      const subAccounts = data.sub_accounts || []
      
      // Convert the API response to our AccountInfo format
      const foundAccounts: AccountInfo[] = subAccounts.map((acc: any) => ({
        accountIndex: acc.index,
        isMainAccount: acc.index === 0,
        selected: true // Auto-select by default
      }))

      // Update wallet with found accounts
      setWallets(prev => prev.map(w => 
        w.addressLowercase === addressLowercase
          ? {
              ...w,
              accounts: foundAccounts,
              checking: false,
              error: foundAccounts.length === 0 ? `No accounts found on ${network}` : undefined
            }
          : w
      ))
    } catch (err) {
      setWallets(prev => prev.map(w => 
        w.addressLowercase === addressLowercase
          ? {
              ...w,
              checking: false,
              error: err instanceof Error ? err.message : 'Failed to check accounts'
            }
          : w
      ))
    }
  }

  const refreshAllWallets = async () => {
    // Re-check all wallets
    const walletsToCheck = [...wallets]
    setWallets([])
    for (const wallet of walletsToCheck) {
      await checkWalletAccounts(wallet.address, wallet.isConnected, wallet.privateKey)
    }
  }

  const handleBulkImport = async (importedWallets: any[]) => {
    setShowBulkImport(false)
    setError(null)
    
    // Process bulk imported wallets
    for (const imported of importedWallets) {
      const addressLowercase = imported.addressLowercase
      
      
      if (wallets.some(w => w.addressLowercase === addressLowercase)) {
        continue
      }
      
      
      setWallets(prev => [...prev, {
        address: imported.address,
        addressLowercase: addressLowercase,
        accounts: [],
        checking: true,
        privateKey: imported.privateKey,
        isBulkImported: true,
        isConnected: false
      }])
      
      
      try {
        const response = await fetch(
          `${networkConfig[network].url}/api/v1/accountsByL1Address?l1_address=${imported.address}`,
          {
            headers: {
              'Accept': 'application/json',
            }
          }
        )

        if (!response.ok) {
          const responseText = await response.text()
          let errorData
          try {
            errorData = JSON.parse(responseText)
          } catch {
            throw new Error('Failed to fetch accounts')
          }
          
          if (errorData.message === 'account not found' || response.status === 404) {
            setWallets(prev => prev.map(w => 
              w.addressLowercase === addressLowercase
                ? {
                    ...w,
                    accounts: [],
                    checking: false,
                    error: `No accounts found on ${network}. You need to register an account on Lighter first.`
                  }
                : w
            ))
            continue
          } else {
            throw new Error(errorData.message || 'Failed to fetch accounts')
          }
        }

        const data = await response.json()
        const subAccounts = data.sub_accounts || []
        
       
        const foundAccounts: AccountInfo[] = subAccounts.map((acc: any) => ({
          accountIndex: acc.index,
          isMainAccount: acc.index === 0,
          selected: true 
        }))

        
        setWallets(prev => prev.map(w => 
          w.addressLowercase === addressLowercase
            ? {
                ...w,
                accounts: foundAccounts,
                checking: false,
                error: foundAccounts.length === 0 ? `No accounts found on ${network}` : undefined
              }
            : w
        ))
      } catch (err) {
        setWallets(prev => prev.map(w => 
          w.addressLowercase === addressLowercase
            ? {
                ...w,
                checking: false,
                error: err instanceof Error ? err.message : 'Failed to check accounts'
              }
            : w
        ))
      }
    }
  }

  const removeWallet = (addressLowercase: string) => {
    setWallets(prev => prev.filter(w => w.addressLowercase !== addressLowercase))
  }

  const toggleAccountSelection = (addressLowercase: string, accountIndex: number) => {
    setWallets(prev => prev.map(wallet => 
      wallet.addressLowercase === addressLowercase
        ? {
            ...wallet,
            accounts: wallet.accounts.map(acc =>
              acc.accountIndex === accountIndex
                ? { ...acc, selected: !acc.selected }
                : acc
            )
          }
        : wallet
    ))
  }

  const getSelectedAccounts = (): AccountToGenerate[] => {
    const selected: AccountToGenerate[] = []
    wallets.forEach(wallet => {
      wallet.accounts.forEach(account => {
        if (account.selected) {
          const keyIndexNum = useCustomKeyIndices && account.customKeyIndex 
            ? parseInt(account.customKeyIndex) 
            : parseInt(keyIndex)
          
          if (!isNaN(keyIndexNum) && keyIndexNum >= 0 && keyIndexNum <= 255) {
            selected.push({
              walletAddress: wallet.address,
              accountIndex: account.accountIndex,
              isMainAccount: account.isMainAccount,
              keyIndex: keyIndexNum
            })
          }
        }
      })
    })
    return selected
  }

  const selectedAccounts = getSelectedAccounts()

  const getCurrentConnectedAddress = async (): Promise<string | undefined> => {
    try {
      if (connector && connector.getAccounts) {
        const accounts = await connector.getAccounts()
        return accounts[0]
      } else if ((window as any).ethereum) {
        const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' })
        return accounts[0]
      }
    } catch (error) {
    }
    return connectedAddress
  }

  const waitForWalletSwitch = async (targetAddress: string): Promise<boolean> => {
    // Wait up to 30 seconds for wallet to switch
    const maxAttempts = 60
    const targetAddressLower = targetAddress.toLowerCase()
    
    for (let i = 0; i < maxAttempts; i++) {
      // Get the current account directly from the provider
      let currentAccount: string | undefined
      
      try {
        if (connector && connector.getAccounts) {
          const accounts = await connector.getAccounts()
          currentAccount = accounts[0]
        } else if ((window as any).ethereum) {
          // Fallback to direct ethereum provider query
          const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' })
          currentAccount = accounts[0]
        }
      } catch (error) {
        }
      
      // Check if the current account matches the target
      if (currentAccount?.toLowerCase() === targetAddressLower) {
        // Force a small delay to ensure wagmi hooks catch up
        await new Promise(resolve => setTimeout(resolve, 1000))
        return true
      }
      
      // Also check the hook value as a fallback
      if (connectedAddress?.toLowerCase() === targetAddressLower) {
        return true
      }
      
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    return false
  }

  const handleGenerateKeys = async () => {
    if (selectedAccounts.length === 0) {
      setError('No accounts selected')
      return
    }

    // Validate key indices
    if (useCustomKeyIndices) {
      const invalidAccounts = wallets.flatMap(wallet => 
        wallet.accounts.filter(account => {
          if (account.selected) {
            const idx = parseInt(account.customKeyIndex || '')
            return isNaN(idx) || idx < 0 || idx > 255
          }
          return false
        })
      )
      
      if (invalidAccounts.length > 0) {
        setError('Please enter valid key indices (0-255) for all selected accounts')
        return
      }
    } else {
      const keyIndexNum = parseInt(keyIndex)
      if (isNaN(keyIndexNum) || keyIndexNum < 0 || keyIndexNum > 255) {
        setError('Please enter a valid key index between 0 and 255')
        return
      }
    }

    setLoading(true)
    setError(null)
    setCurrentStep('processing')
    setProgress(0)
    setGeneratedKeys([])

    try {
      const keys: GeneratedKeyResult[] = []
      
      // Rate limiting configuration
      let currentDelay = useManualRateLimit ? parseInt(manualDelaySeconds) * 1000 : 3000
      const MIN_DELAY = 2000 
      const MAX_DELAY = 15000 
      const INCREASE_FACTOR = 2.0 
      const DECREASE_FACTOR = 0.8 
      setCurrentDelaySeconds(useManualRateLimit ? parseInt(manualDelaySeconds) : 3) 
      
      // Group accounts by wallet address
      const accountsByWallet = new Map<string, AccountToGenerate[]>()
      selectedAccounts.forEach(account => {
        if (!accountsByWallet.has(account.walletAddress)) {
          accountsByWallet.set(account.walletAddress, [])
        }
        accountsByWallet.get(account.walletAddress)!.push(account)
      })

      let processedCount = 0
      const totalAccounts = selectedAccounts.length

      // Process each wallet's accounts
      for (const [walletAddress, accounts] of accountsByWallet) {
        setProcessingStatus(`Processing wallet ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`)
        
        
        const walletInfo = wallets.find(w => w.address.toLowerCase() === walletAddress.toLowerCase())
        const isBulkImported = walletInfo?.isBulkImported || false
        const privateKey = walletInfo?.privateKey
        
        
        if (!isBulkImported) {
          
          const currentConnectedAddress = await getCurrentConnectedAddress()
          if (currentConnectedAddress?.toLowerCase() !== walletAddress.toLowerCase()) {
            setCurrentOperation(`Please switch to wallet ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} in your wallet provider`)
            
            
            toast({
              title: "Action Required: Switch Account",
              description: `Please switch to account ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} in MetaMask/wallet (do NOT disconnect)`,
              duration: 15000,
            })

            
            const switched = await waitForWalletSwitch(walletAddress)
            if (!switched) {
              
              throw new Error(`Timed out waiting for wallet switch to ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}. Please switch accounts in your wallet (without disconnecting) and try again.`)
            }
          }
        }

        // Initialize crypto
        const crypto = await LighterFullCrypto.initialize()
        const defaultKey = await crypto.getDefaultKey()
        await crypto.setCurrentKey(defaultKey.privateKey)

        
        setCurrentOperation(`Generating ${accounts.length} keys for wallet ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`)
        const keyPairs = await Promise.all(
          accounts.map(async () => {
            const keyPair = await crypto.generateApiKey()
            return keyPair
          })
        )

        
        setCurrentOperation(`Fetching nonces for wallet ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`)
        const noncePromises = accounts.map(async (account) => {
          const nonceUrl = `${networkConfig[network].url}/api/v1/nextNonce?account_index=${account.accountIndex}&api_key_index=${account.keyIndex}`
          const res = await fetch(nonceUrl)
          
          if (!res.ok) {
            const text = await res.text()
            throw new Error(`Failed to fetch nonce for account ${account.accountIndex}: ${res.status} ${text}`)
          }
          
          const data = await res.json()
          return { 
            key: `${account.accountIndex}-${account.keyIndex}`,
            nonce: data.nonce 
          }
        })
        
        const nonces = await Promise.all(noncePromises)
        const nonceMap = new Map(nonces.map(n => [n.key, n.nonce]))

        
        for (let i = 0; i < accounts.length; i++) {
          const account = accounts[i]
          const keyPair = keyPairs[i]
          const nonce = nonceMap.get(`${account.accountIndex}-${account.keyIndex}`)
          
          processedCount++
          setProgress((processedCount / totalAccounts) * 100)
          setCurrentOperation(`Processing Account #${account.accountIndex} (Key Index: ${account.keyIndex}) of ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`)
          
          const MAX_TIMESTAMP = 281474976710655
          const TEN_MINUTES = 10 * 60 * 1000
          const expiredAt = Math.min(Date.now() + TEN_MINUTES, MAX_TIMESTAMP)
          
          // Sign the change pubkey transaction
          setCurrentOperation(`Creating transaction for Account #${account.accountIndex}...`)
          const result = await crypto.signChangePubKey({
            newPubkey: keyPair.publicKey,
            newPrivkey: keyPair.privateKey,
            accountIndex: account.accountIndex,
            apiKeyIndex: account.keyIndex,
            nonce: nonce,
            expiredAt: expiredAt,
            chainId: networkConfig[network].chainId,
          })
          
          
          let l1Signature: string
          
          if (isBulkImported && privateKey) {
            
            setCurrentOperation(`Signing transaction for Account #${account.accountIndex}...`)
            try {
              const signer = new PrivateKeySigner(privateKey)
              l1Signature = await signer.signMessage(result.messageToSign)
            } catch (error: any) {
              throw new Error(`Failed to sign with private key: ${error?.message || 'Unknown error'}`)
            }
          } else {
            setCurrentOperation('Please sign the transaction in your wallet...')
            try {
              if (chain && chain.id !== mainnet.id) {
                setCurrentOperation('Switching to Ethereum mainnet for L1 signature...')
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
          }

          // Prepare and submit transaction
          setCurrentOperation(`Submitting transaction for Account #${account.accountIndex}...`)
          const { MessageToSign, ...transactionWithoutMessage } = result.transaction
          const txInfo = {
            ...transactionWithoutMessage,
            L1Sig: l1Signature
          }
          
          const formData = new FormData()
          formData.append('tx_type', '8')
          formData.append('tx_info', JSON.stringify(txInfo))
          
          const response = await fetch(`${networkConfig[network].url}/api/v1/sendTx`, {
            method: 'POST',
            body: formData
          })

          const responseText = await response.text()
          
          if (!response.ok) {
            let errorMessage = `Failed to register key for account ${account.accountIndex}`
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
              setCurrentOperation(`Rate limited. Waiting ${Math.round(currentDelay / 1000)} seconds before continuing...`)
              await new Promise(resolve => setTimeout(resolve, currentDelay))
              continue
            } else {
              throw new Error(errorMessage)
            }
          }
          
          
          // Success! Decrease delay for next request (only if not using manual rate limit)
          if (!useManualRateLimit) {
            currentDelay = Math.max(currentDelay * DECREASE_FACTOR, MIN_DELAY)
            setCurrentDelaySeconds(Math.round(currentDelay / 1000))
          }
          
          // Wait for transaction to be processed
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          
          if (processedCount < totalAccounts) {
            setCurrentOperation(`Waiting ${currentDelaySeconds} seconds to avoid rate limits...`)
            await new Promise(resolve => setTimeout(resolve, currentDelay))
          }
          
          // Add to successful keys
          keys.push({
            address: walletAddress,
            accountIndex: account.accountIndex,
            keyIndex: account.keyIndex,
            privateKey: keyPair.privateKey,
            publicKey: keyPair.publicKey,
            network
          })

        }
      }
      
      setGeneratedKeys(keys)
      setCurrentStep('complete')
      setCurrentOperation('')
      
      toast({
        title: "Success!",
        description: `Generated API keys for ${keys.length} accounts`,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Multi-wallet generation failed')
      setCurrentStep('setup')
      setCurrentOperation('')
    } finally {
      setLoading(false)
      setProcessingStatus('')
    }
  }


  const downloadAllKeys = () => {
    const content = generatedKeys.map(key => 
      `=== API Key for ${key.address} ===\n` +
      `Network: ${key.network}\n` +
      `Base URL: ${key.network === 'mainnet' ? 'https://mainnet.zklighter.elliot.ai' : 'https://testnet.zklighter.elliot.ai'}\n` +
      `Wallet Address: ${key.address}\n` +
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
    a.download = `lighter-multi-wallet-keys-${network}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Card className="card-hover shadow-glow animate-slide-up">
      <CardHeader className="p-6 sm:p-8 pb-4 sm:pb-6">
        <div className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl md:text-2xl font-medium tracking-tight">
            <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <span className="flex-1">Multi-Account Key<br className="sm:hidden" /> Generation</span>
            <Badge variant="secondary" className="text-[10px] sm:text-xs bg-primary/10 border-primary/20 font-mono animate-pulse-soft">Beta</Badge>
          </CardTitle>
          <CardDescription className="text-xs sm:text-body-small text-secondary">
            Generate API keys for multiple accounts with automatic wallet switching
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-6 sm:p-8 pt-2 sm:pt-4">
        {currentStep === 'setup' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border/40 dark:border-white/10 p-4 sm:p-6 space-y-3 sm:space-y-4 bg-muted/30 dark:bg-white/[0.02]">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 dark:bg-white/10">
                  <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary dark:text-white" />
                </div>
                <div className="flex-1 space-y-3 sm:space-y-4">
                  <h3 className="text-sm sm:text-base font-medium tracking-tight">Multi-account generation workflow</h3>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex gap-2 sm:gap-3">
                      <span className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/10 dark:bg-white/10 text-[10px] sm:text-xs font-medium flex items-center justify-center">1</span>
                      <p className="text-xs sm:text-body-small text-secondary">Add wallet addresses you want to generate keys for</p>
                    </div>
                    <div className="flex gap-2 sm:gap-3">
                      <span className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/10 dark:bg-white/10 text-[10px] sm:text-xs font-medium flex items-center justify-center">2</span>
                      <p className="text-xs sm:text-body-small text-secondary">Select the accounts you need</p>
                    </div>
                    <div className="flex gap-2 sm:gap-3">
                      <span className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/10 dark:bg-white/10 text-[10px] sm:text-xs font-medium flex items-center justify-center">3</span>
                      <p className="text-xs sm:text-body-small text-secondary">Click generate and follow the wallet prompts</p>
                    </div>
                    <div className="flex gap-2 sm:gap-3">
                      <span className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/10 dark:bg-white/10 text-[10px] sm:text-xs font-medium flex items-center justify-center">4</span>
                      <p className="text-xs sm:text-body-small text-secondary">Switch accounts when prompted (don't disconnect)</p>
                    </div>
                    <div className="flex gap-2 sm:gap-3">
                      <span className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/10 dark:bg-white/10 text-[10px] sm:text-xs font-medium flex items-center justify-center">5</span>
                      <p className="text-xs sm:text-body-small text-secondary">Approve signatures as they appear</p>
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 rounded-lg bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/20">
                    <p className="text-[11px] sm:text-body-small font-medium text-amber-700 dark:text-amber-400">
                      Use your wallet's account switcher • Do not disconnect/reconnect
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {/* Add Wallet Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Wallet Addresses</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkImport(true)}
                  >
                    <FileJson className="h-4 w-4 mr-2" />
                    Bulk Import
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshAllWallets}
                    disabled={wallets.length === 0}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh All
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="0x... wallet address"
                  value={walletInput}
                  onChange={(e) => setWalletInput(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && addWallet()}
                />
                <Button onClick={addWallet} size="default">
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>

            {/* Wallet List */}
            {wallets.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Available Accounts</label>
                  <p className="text-xs text-muted-foreground">
                    {selectedAccounts.length} account{selectedAccounts.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {wallets.map((wallet) => (
                    <div key={wallet.address} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                          </span>
                          {wallet.isConnected && (
                            <Badge variant="secondary">Connected</Badge>
                          )}
                          {wallet.isBulkImported && (
                            <Badge variant="outline" className="text-xs">
                              <FileJson className="h-3 w-3 mr-1" />
                              Imported
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeWallet(wallet.addressLowercase)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {wallet.checking ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Checking for registered accounts on {network}...</span>
                        </div>
                      ) : wallet.error ? (
                        <Alert variant="default" className="border-amber-500/50">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <AlertDescription className="text-sm">
                            {wallet.error}
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Found {wallet.accounts.length} account{wallet.accounts.length !== 1 ? 's' : ''} on {network}:
                          </p>
                          <div className="space-y-2 ml-4">
                            {wallet.accounts.map((account) => (
                              <div
                                key={account.accountIndex}
                                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                                onClick={() => toggleAccountSelection(wallet.addressLowercase, account.accountIndex)}
                              >
                                <Checkbox
                                  checked={account.selected}
                                  onCheckedChange={() => toggleAccountSelection(wallet.addressLowercase, account.accountIndex)}
                                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                />
                                <Badge variant={account.isMainAccount ? "default" : "secondary"}>
                                  {account.isMainAccount ? "Main" : "Sub"} Account #{account.accountIndex}
                                </Badge>
                                {useCustomKeyIndices && account.selected && (
                                  <Input
                                    type="number"
                                    value={account.customKeyIndex || ''}
                                    onChange={(e) => {
                                      const updatedWallets = wallets.map(w => {
                                        if (w.addressLowercase === wallet.addressLowercase) {
                                          return {
                                            ...w,
                                            accounts: w.accounts.map(a => {
                                              if (a.accountIndex === account.accountIndex) {
                                                return { ...a, customKeyIndex: e.target.value }
                                              }
                                              return a
                                            })
                                          }
                                        }
                                        return w
                                      })
                                      setWallets(updatedWallets)
                                    }}
                                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                    min="0"
                                    max="255"
                                    placeholder="Key index"
                                    className="w-24 h-8 text-xs ml-auto"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">API Key Index Configuration</label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setUseCustomKeyIndices(false)}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm transition-all ${
                      !useCustomKeyIndices 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                  >
                    <span>Same for all</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseCustomKeyIndices(true)}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm transition-all ${
                      useCustomKeyIndices 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                  >
                    <span>Custom per account</span>
                  </button>
                </div>
              </div>
              
              {!useCustomKeyIndices && (
                <div className="space-y-2">
                  <Input
                    type="number"
                    value={keyIndex}
                    onChange={(e) => setKeyIndex(e.target.value)}
                    min="0"
                    max="255"
                    placeholder="Enter key index (2-255)"
                  />
                  <p className="text-xs text-muted-foreground">
                    The same key index will be used for all selected accounts. Index 0 is reserved for desktop frontend. Index 1 is reserved for mobile. Use 2 or higher for API access.
                  </p>
                </div>
              )}
              
              {useCustomKeyIndices && selectedAccounts.length > 0 && (
                <Alert className="border-amber-500/50">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-xs">
                    Set custom key indices next to each selected account above
                  </AlertDescription>
                </Alert>
              )}
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
                      <Label htmlFor="manual-rate-limit-multi">Manual Rate Limiting</Label>
                      <p className="text-xs text-muted-foreground">
                        Override dynamic rate limiting with a fixed delay
                      </p>
                    </div>
                    <Checkbox
                      id="manual-rate-limit-multi"
                      checked={useManualRateLimit}
                      onCheckedChange={(checked) => setUseManualRateLimit(checked as boolean)}
                    />
                  </div>
                  
                  {useManualRateLimit && (
                    <div className="space-y-2">
                      <Label htmlFor="manual-delay-multi">Delay between requests (seconds)</Label>
                      <Input
                        id="manual-delay-multi"
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
              onClick={handleGenerateKeys}
              disabled={loading || selectedAccounts.length === 0}
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
                  Generate Keys for {selectedAccounts.length} Account{selectedAccounts.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        )}

        {currentStep === 'processing' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            
            {processingStatus && (
              <div className="text-sm text-muted-foreground">
                {processingStatus}
              </div>
            )}

            {currentOperation && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="font-medium">
                  {currentOperation}
                </AlertDescription>
              </Alert>
            )}
            
            {!useManualRateLimit && currentDelaySeconds !== 3 && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                {currentDelaySeconds > 3 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-orange-500" />
                    <span>Delay increased to {currentDelaySeconds}s due to rate limiting</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 text-green-500" />
                    <span>Delay decreased to {currentDelaySeconds}s due to successful requests</span>
                  </>
                )}
              </div>
            )}
            {useManualRateLimit && (
              <p className="text-xs text-muted-foreground text-center">
                Using manual rate limit: {manualDelaySeconds}s delay
              </p>
            )}

            <div className="rounded-xl border border-border/40 dark:border-white/10 p-4 sm:p-6 bg-muted/30 dark:bg-white/[0.02]">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/10 dark:bg-blue-500/10">
                  <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 space-y-2.5 sm:space-y-3">
                  <h3 className="text-sm sm:text-base font-medium tracking-tight">Tips for smooth operation</h3>
                  <div className="space-y-2 sm:space-y-2.5">
                    <div className="flex items-start gap-1.5 sm:gap-2">
                      <span className="text-xs sm:text-body-small text-secondary">•</span>
                      <p className="text-xs sm:text-body-small text-secondary">Keep your wallet provider window open</p>
                    </div>
                    <div className="flex items-start gap-1.5 sm:gap-2">
                      <span className="text-xs sm:text-body-small text-secondary">•</span>
                      <p className="text-xs sm:text-body-small text-secondary">Switch accounts when prompted — don't disconnect</p>
                    </div>
                    <div className="flex items-start gap-1.5 sm:gap-2">
                      <span className="text-xs sm:text-body-small text-secondary">•</span>
                      <p className="text-xs sm:text-body-small text-secondary">Use your wallet's account switcher, not the disconnect button</p>
                    </div>
                    <div className="flex items-start gap-1.5 sm:gap-2">
                      <span className="text-xs sm:text-body-small text-secondary">•</span>
                      <p className="text-xs sm:text-body-small text-secondary">Approve each signature request promptly</p>
                    </div>
                    <div className="flex items-start gap-1.5 sm:gap-2">
                      <span className="text-xs sm:text-body-small text-secondary">•</span>
                      <p className="text-xs sm:text-body-small text-secondary">Don't refresh the page during generation</p>
                    </div>
                    <div className="flex items-start gap-1.5 sm:gap-2 pt-2 border-t border-border/40 dark:border-white/10">
                      <Info className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground mt-0.5" />
                      <p className="text-[11px] sm:text-body-small text-muted-foreground">A 10-second delay is added between accounts to avoid rate limits</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'complete' && generatedKeys.length > 0 && (
          <div className="space-y-6">
            <Alert className="border-green-500/50">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription>
                Successfully generated API keys for {generatedKeys.length} accounts!
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
                Download All Keys
              </Button>
              <Button
                variant="outline"
                size="default"
                onClick={() => setShowVaultDialog(true)}
                className="flex-1"
              >
                <Shield className="mr-2 h-4 w-4" />
                Encrypt Keys
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
                            API Key Generated
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 break-all">
                            {key.address.slice(0, 6)}...{key.address.slice(-4)} - Account #{key.accountIndex}
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
                                type={showPrivateKeys[`${key.address}-${key.accountIndex}-${key.keyIndex}`] ? "text" : "password"}
                                value={key.privateKey}
                                className="w-full bg-muted/50 rounded-md px-2 sm:px-3 py-1.5 sm:py-2 pr-9 sm:pr-10 text-[11px] sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute right-0.5 sm:right-1 top-1/2 -translate-y-1/2 h-6 w-6 sm:h-7 sm:w-7 p-0"
                                onClick={() => setShowPrivateKeys(prev => ({ 
                                  ...prev, 
                                  [`${key.address}-${key.accountIndex}-${key.keyIndex}`]: !prev[`${key.address}-${key.accountIndex}-${key.keyIndex}`] 
                                }))}
                              >
                                {showPrivateKeys[`${key.address}-${key.accountIndex}-${key.keyIndex}`] ? (
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
                // Don't clear wallets, just reset selection
                setWallets(prev => prev.map(w => ({
                  ...w,
                  accounts: w.accounts.map(a => ({ ...a, selected: false }))
                })))
              }}
              className="w-full"
            >
              Generate More Keys
            </Button>
          </div>
        )}
      </CardContent>
    </Card>

    <Dialog 
      open={showVaultDialog} 
      onOpenChange={setShowVaultDialog}
      modal={false}  
    >
      <DialogContent 
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}  
        onEscapeKeyDown={(e) => e.preventDefault()}  
      >
        <WalletKeyVault 
          keys={generatedKeys}
          label="Multi-Account Keys"
        />
      </DialogContent>
    </Dialog>

    <Dialog 
      open={showBulkImport} 
      onOpenChange={setShowBulkImport}
    >
      <DialogContent 
        className="max-w-3xl p-0 gap-0 overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="p-6">
          <BulkWalletImport 
            onImport={handleBulkImport}
            onCancel={() => setShowBulkImport(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}