import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Wallet, Globe } from 'lucide-react'

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
    <Card>
      <CardHeader className="p-6 sm:p-8 pb-4 sm:pb-6">
        <div className="space-y-2">
          <CardTitle className="flex items-center gap-2.5 text-xl sm:text-2xl font-semibold">
            <div className="p-2 rounded-lg bg-primary/10">
              <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            Account Selection
          </CardTitle>
          <CardDescription className="text-sm sm:text-base text-muted-foreground">
            Select your Lighter network and account to generate API keys
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-6 sm:p-8 pt-2 sm:pt-4">
        {/* Network Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground/80">Select Network</label>
          <Select value={selectedNetwork} onValueChange={handleNetworkChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="testnet">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <span>Testnet</span>
                  </div>
                  <Badge variant="outline" className="ml-auto text-xs">Chain ID: 300</Badge>
                </div>
              </SelectItem>
              <SelectItem value="mainnet">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <span>Mainnet</span>
                  </div>
                  <Badge variant="outline" className="ml-auto text-xs">Chain ID: 304</Badge>
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
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Account #{accounts[0].index}</span>
                    <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">
                      Active
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {accounts[0].l2PublicKey ? 
                      `${accounts[0].l2PublicKey.slice(0, 16)}...${accounts[0].l2PublicKey.slice(-8)}` :
                      'No public key'}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  Nonce: {accounts[0].nonce}
                </Badge>
              </div>
            ) : (
              <div className="space-y-2">
                {accounts.map((account) => (
                  <div
                    key={account.index}
                    onClick={() => handleAccountSelect(account.index)}
                    className={`relative rounded-lg border p-3 cursor-pointer transition-all ${
                      selectedAccountIndex === account.index
                        ? 'border-primary bg-accent'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Account #{account.index}</span>
                          {selectedAccountIndex === account.index && (
                            <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">
                              Selected
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {account.l2PublicKey ? 
                            `${account.l2PublicKey.slice(0, 16)}...${account.l2PublicKey.slice(-8)}` :
                            'No public key'}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Nonce: {account.nonce}
                      </Badge>
                    </div>
                  </div>
                ))}
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