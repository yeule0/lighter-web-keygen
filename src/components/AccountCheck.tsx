import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Wallet, Globe, User, Users, Check } from 'lucide-react'

interface AccountInfo {
  index: number
  l1Address: string
  l2PublicKey: string
  nonce: number
}

interface AccountCheckProps {
  address: string
  onAccountFound?: (accountIndex: number) => void
  onNetworkChange?: (network: 'mainnet' | 'testnet') => void
}

export function AccountCheck({ address, onAccountFound, onNetworkChange }: AccountCheckProps) {
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<AccountInfo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedNetwork, setSelectedNetwork] = useState<'mainnet' | 'testnet'>('testnet')
  const [selectedAccountIndex, setSelectedAccountIndex] = useState<number | null>(null)

  const networkUrls = {
    mainnet: 'https://mainnet.zklighter.elliot.ai',
    testnet: 'https://testnet.zklighter.elliot.ai'
  }

  useEffect(() => {
    if (address) {
      checkAccount()
    }
    if (onNetworkChange) {
      onNetworkChange(selectedNetwork)
    }
  }, [address, selectedNetwork, onNetworkChange])

  const checkAccount = async () => {
    if (!address) {
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(
        `${networkUrls[selectedNetwork]}/api/v1/accountsByL1Address?l1_address=${address}`,
        {
          headers: {
            'Accept': 'application/json',
          }
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          throw new Error('Failed to fetch account')
        }
        
        if (errorData.message === 'account not found') {
          setAccounts([])
          setError('No account found. You need to create an account on Lighter first.')
        } else {
          throw new Error(errorData.message || 'Failed to fetch account')
        }
        return
      }

      const responseText = await response.text()
      let data
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        throw new Error('Invalid response from server')
      }
      
      const subAccounts = data.sub_accounts || []
      setAccounts(subAccounts)
      
      if (subAccounts.length === 1 && onAccountFound) {
        setSelectedAccountIndex(subAccounts[0].index)
        onAccountFound(subAccounts[0].index)
      } else if (subAccounts.length > 1) {
        setSelectedAccountIndex(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check account')
    } finally {
      setLoading(false)
    }
  }

  const handleNetworkChange = (value: string) => {
    const network = value as 'mainnet' | 'testnet'
    setSelectedNetwork(network)
    if (onNetworkChange) {
      onNetworkChange(network)
    }
    setSelectedAccountIndex(null)
  }

  const handleAccountSelect = (index: number) => {
    setSelectedAccountIndex(index)
    if (onAccountFound) {
      onAccountFound(index)
    }
  }

  return (
    <Card className="card-hover shadow-glow animate-slide-up">
      <CardHeader className="p-6 sm:p-8 pb-4 sm:pb-6">
        <div className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl font-bold tracking-tight">
            <Wallet className="h-5 w-5 text-primary" />
            Account Selection
          </CardTitle>
          <CardDescription className="text-body-small text-secondary">
            Select your Lighter network and account to generate API keys
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-6 sm:p-8 pt-2 sm:pt-4">
        {/* Network Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground/80">Select Network</label>
          <Select value={selectedNetwork} onValueChange={handleNetworkChange}>
            <SelectTrigger className="w-full transition-all duration-200 hover:border-foreground/30 dark:hover:border-white/50 focus:border-primary dark:focus:border-white shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background dark:bg-black border border-border dark:border-white/20">
              <SelectItem value="testnet">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <Globe className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="font-semibold">Testnet</span>
                  </div>
                  <Badge variant="outline" className="ml-auto text-xs bg-amber-500/10 border-amber-500/20 font-mono">Chain ID: 300</Badge>
                </div>
              </SelectItem>
              <SelectItem value="mainnet">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                      <Globe className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="font-semibold">Mainnet</span>
                  </div>
                  <Badge variant="outline" className="ml-auto text-xs bg-green-500/10 border-green-500/20 font-mono">Chain ID: 304</Badge>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Accounts List */}
        {!loading && !error && accounts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground/80">Your Accounts</label>
              <Badge variant="secondary" className="text-xs">
                {accounts.length} account{accounts.length > 1 ? 's' : ''} found
              </Badge>
            </div>
            
            {accounts.length === 1 ? (
              <div className="rounded-xl border border-border/40 dark:border-white/20 p-4 transition-all duration-200 hover:border-foreground/30 dark:hover:border-white/30 hover:shadow-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl transition-all duration-300 border ${
                      accounts[0].index > 1000000 
                        ? 'bg-purple-500/10 border-purple-500/20' 
                        : 'bg-blue-500/10 border-blue-500/20'
                    }`}>
                      {accounts[0].index > 1000000 ? (
                        <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      ) : (
                        <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-base">
                              {accounts[0].index > 1000000 ? 'Sub-Account' : 'Main Account'}
                            </span>
                            <span className="text-sm text-muted-foreground break-all">#{accounts[0].index}</span>
                          </div>
                          <div className="text-xs text-muted-foreground font-mono mt-1">
                            {accounts[0].l2PublicKey ? 
                              `${accounts[0].l2PublicKey.slice(0, 16)}...${accounts[0].l2PublicKey.slice(-8)}` :
                              'No public key'}
                          </div>
                        </div>
                        <Badge className="bg-green-500/10 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 shrink-0">
                          <Check className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {accounts.map((account, index) => {
                  // Check if it's a sub-account based on the large index value
                  const isSubAccount = account.index > 1000000;
                  const accountLabel = isSubAccount ? 'Sub-Account' : 'Main Account';
                  
                  return (
                    <div
                      key={account.index}
                      onClick={() => handleAccountSelect(account.index)}
                      className={`rounded-xl border p-4 cursor-pointer transition-all duration-200 ${
                        selectedAccountIndex === account.index
                          ? 'border-primary dark:border-white bg-primary/5 dark:bg-white/5 shadow-sm scale-[1.02]'
                          : 'border-border/40 dark:border-white/20 hover:border-foreground/30 dark:hover:border-white/30 hover:shadow-sm hover:scale-[1.01]'
                      }`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg transition-all duration-300 ${
                          isSubAccount ? 'bg-purple-500/10' : 'bg-blue-500/10'
                        } ${selectedAccountIndex === account.index ? 'scale-110' : ''}`}>
                          {isSubAccount ? (
                            <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          ) : (
                            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-base">{accountLabel}</span>
                                <span className="text-sm text-muted-foreground break-all">#{account.index}</span>
                              </div>
                              <div className="text-xs text-muted-foreground font-mono mt-1">
                                {account.l2PublicKey ? 
                                  `${account.l2PublicKey.slice(0, 16)}...${account.l2PublicKey.slice(-8)}` :
                                  'No public key'}
                              </div>
                            </div>
                            {selectedAccountIndex === account.index && (
                              <Badge className="bg-green-500/10 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 animate-in-scale shrink-0">
                                <Check className="h-3 w-3 mr-1" />
                                Selected
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* No Accounts State */}
        {!loading && !error && accounts.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No accounts found for this address on {selectedNetwork}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}