import { useState, useEffect } from 'react'
import { ConnectKitButton } from 'connectkit'
import { useAccount, useDisconnect } from 'wagmi'
import { ApiKeyGeneratorFull } from './components/ApiKeyGeneratorFull'
import { AccountCheck } from './components/AccountCheck'
import { BulkKeyGenerator } from './components/BulkKeyGenerator'
import { MultiWalletKeyGenerator } from './components/MultiWalletKeyGenerator'
import { WalletKeyRetriever } from './components/WalletKeyRetriever'
import { WalletKeyVault } from './components/WalletKeyVault'
import { AccountTierManager } from './components/AccountTierManager'
import { ThemeProvider } from './components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { copyToClipboard } from '@/lib/clipboard'
import { Sparkles, Copy, Eye, EyeOff, LogOut, Key, Layers, Wallet, Unlock, Shield, Lock } from 'lucide-react'
import { ThemeToggle } from './components/theme-toggle'
import { ConnectKitWrapper } from './components/ConnectKitWrapper'
import { DomainWarning } from './components/DomainWarning'
import { DownloadOfflineButton } from './components/DownloadOfflineButton'

function App() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const [accountIndex, setAccountIndex] = useState<number | null>(null)
  const [selectedNetwork, setSelectedNetwork] = useState<'mainnet' | 'testnet'>('testnet')
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [apiKeyData, setApiKeyData] = useState<{
    privateKey: string
    publicKey: string
    accountIndex: number
    apiKeyIndex: number
    network: 'mainnet' | 'testnet'
  } | null>(null)
  const [activeTab, setActiveTab] = useState('generate')
  const [vaultLinkFromUrl, setVaultLinkFromUrl] = useState<string | null>(null)
  const [showVaultUI, setShowVaultUI] = useState(false)
  
  // Parse URL hash for vault links on mount
  useEffect(() => {
    const hash = window.location.hash
    if (hash.startsWith('#vault:')) {
      const vaultLink = window.location.href
      setVaultLinkFromUrl(vaultLink)
      setActiveTab('vault')
      // Clean up the URL 
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])
  
  // Clear state when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setAccountIndex(null)
      setApiKeyData(null)
      setShowPrivateKey(false)
    } else if (vaultLinkFromUrl) {
      setActiveTab('vault')
    }
  }, [isConnected, vaultLinkFromUrl])
  
  // Clear API key data when network or account changes
  useEffect(() => {
    setApiKeyData(null)
    setShowPrivateKey(false)
  }, [selectedNetwork, accountIndex])

  useEffect(() => {
    setAccountIndex(null)
  }, [selectedNetwork])

  return (
    <ThemeProvider defaultTheme="dark" storageKey="lighter-theme">
      <ConnectKitWrapper>
        <DomainWarning />
        <div className="min-h-screen bg-background flex flex-col">
        <header className="fixed top-0 z-50 w-full bg-background border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <a className="flex items-center gap-2" href="/">
                <Sparkles className="h-4 w-4" />
                <span className="font-normal text-sm tracking-wide">Lighter</span>
              </a>
              <div className="flex items-center gap-3">
                <DownloadOfflineButton />
                {isConnected && address && (
                  <div className="flex items-center gap-2">
                    <span className="text-body-small text-secondary font-mono">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => disconnect()}
                      className="text-body-small text-secondary hover:text-foreground -ml-1"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 pt-16 relative overflow-hidden">
          {/* Geometric shapes for visual interest */}
          <div className="absolute top-20 right-10 shape-circle opacity-20"></div>
          <div className="absolute bottom-40 left-20 shape-rectangle opacity-15 rotate-12"></div>
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 relative z-10">
            <div className="mx-auto max-w-6xl">
              <div className="mb-8 sm:mb-10">
                <span className="badge-minimal mb-3 sm:mb-4 inline-block text-[10px] sm:text-[11px]">LIGHTER DEX</span>
                <h1 className="serif-heading text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-normal leading-tight sm:leading-normal">
                  API Key<br />Generator
                </h1>
              </div>

              {!isConnected && (
                <div className="mb-12">
                  {vaultLinkFromUrl ? (
                    <div className="space-y-8">
                      <div className="rounded-lg bg-primary/5 border border-primary/20 p-6 max-w-2xl mb-8">
                        <div className="flex items-start gap-3">
                          <Lock className="h-5 w-5 text-primary mt-0.5" />
                          <div className="space-y-2">
                            <h3 className="font-semibold text-base">Connect to Decrypt Vault</h3>
                            <p className="text-sm text-muted-foreground">
                              You've received an encrypted vault link. Connect your wallet to decrypt the keys.
                            </p>
                            <p className="text-xs text-muted-foreground/80">
                              Only the wallet that created this vault can decrypt it.
                            </p>
                          </div>
                        </div>
                      </div>
                      <ConnectKitButton />
                    </div>
                  ) : (
                    <>
                      <ConnectKitButton />
                      <div className="mt-8 max-w-2xl">
                        <p className="text-sm sm:text-body-small text-secondary leading-relaxed hidden sm:block">
                          API key generation for Lighter DEX involves cryptographic operations and requires careful handling. Private keys generated are non-recoverable if lost. This tool operates entirely in your browser no<br />data is transmitted to external servers.
                        </p>
                        <div className="sm:hidden space-y-3 max-w-[70%]">
                          <p className="text-xs text-secondary leading-relaxed">
                            API key generation for Lighter DEX involves cryptographic operations and requires<br className="sm:hidden" /> careful handling.
                          </p>
                          <p className="text-xs text-secondary leading-relaxed">
                            Private keys generated are non-recoverable if lost. This tool operates entirely in your browser.
                          </p>
                          <p className="text-xs text-secondary leading-relaxed">
                            No data is transmitted to external servers.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
              {isConnected && address && (
                <div className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8">
                <AccountCheck 
                  address={address} 
                  onAccountFound={setAccountIndex}
                  onNetworkChange={setSelectedNetwork}
                />
                
                {accountIndex !== null && (
                  <Tabs 
                    value={activeTab}
                    defaultValue="generate" 
                    className="w-full"
                    onValueChange={(value) => {
                      setActiveTab(value)
                      setApiKeyData(null)
                      setShowPrivateKey(false)
                      setShowVaultUI(false)
                    }}
                  >
                    <TabsList className="flex w-full gap-2 sm:gap-8 p-0 bg-transparent border-0 h-auto mb-6 sm:mb-12 border-b border-border overflow-x-auto scrollbar-hide">
                      <TabsTrigger value="generate" className="tab-text text-sm sm:text-base data-[state=active]:border-b-2 data-[state=active]:border-foreground pb-3 sm:pb-4 rounded-none bg-transparent border-b-2 border-transparent transition-all duration-200 data-[state=active]:text-foreground text-secondary whitespace-nowrap flex-shrink-0">
                        <Key className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        <span className="hidden sm:inline">Generate</span>
                        <span className="sm:hidden">Gen</span>
                      </TabsTrigger>
                      <TabsTrigger value="bulk" className="tab-text text-sm sm:text-base data-[state=active]:border-b-2 data-[state=active]:border-foreground pb-3 sm:pb-4 rounded-none bg-transparent border-b-2 border-transparent transition-all duration-200 data-[state=active]:text-foreground text-secondary whitespace-nowrap flex-shrink-0">
                        <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        Bulk
                      </TabsTrigger>
                      <TabsTrigger value="multi" className="tab-text text-sm sm:text-base data-[state=active]:border-b-2 data-[state=active]:border-foreground pb-3 sm:pb-4 rounded-none bg-transparent border-b-2 border-transparent transition-all duration-200 data-[state=active]:text-foreground text-secondary whitespace-nowrap flex-shrink-0">
                        <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        <span className="hidden sm:inline">Multi-Account</span>
                        <span className="sm:hidden">Multi</span>
                      </TabsTrigger>
                      <TabsTrigger value="vault" className="tab-text text-sm sm:text-base data-[state=active]:border-b-2 data-[state=active]:border-foreground pb-3 sm:pb-4 rounded-none bg-transparent border-b-2 border-transparent transition-all duration-200 data-[state=active]:text-foreground text-secondary whitespace-nowrap flex-shrink-0">
                        <Unlock className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        <span className="hidden sm:inline">Decrypt Vault</span>
                        <span className="sm:hidden">Decrypt</span>
                      </TabsTrigger>
                      <TabsTrigger value="tier" className="tab-text text-sm sm:text-base data-[state=active]:border-b-2 data-[state=active]:border-foreground pb-3 sm:pb-4 rounded-none bg-transparent border-b-2 border-transparent transition-all duration-200 data-[state=active]:text-foreground text-secondary whitespace-nowrap flex-shrink-0">
                        <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        <span className="hidden sm:inline">Account Tier</span>
                        <span className="sm:hidden">Tier</span>
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="generate" className="mt-6 animate-fade-in">
                      <ApiKeyGeneratorFull 
                        key={`${accountIndex}-${selectedNetwork}`}
                        address={address} 
                        accountIndex={accountIndex}
                        network={selectedNetwork}
                        onApiKeyGenerated={(data) => {
                          setApiKeyData(data)
                          setShowPrivateKey(false)
                        }}
                      />
                    </TabsContent>
                    
                    <TabsContent value="bulk" className="mt-6 animate-fade-in">
                      <BulkKeyGenerator
                        address={address}
                        accountIndex={accountIndex}
                        network={selectedNetwork}
                      />
                    </TabsContent>
                    
                    <TabsContent value="multi" className="mt-6 animate-fade-in">
                      <MultiWalletKeyGenerator
                        network={selectedNetwork}
                      />
                    </TabsContent>
                    
                    <TabsContent value="vault" className="mt-6 animate-fade-in">
                      <WalletKeyRetriever initialVaultLink={vaultLinkFromUrl} />
                    </TabsContent>
                    
                    <TabsContent value="tier" className="mt-6 animate-fade-in">
                      <AccountTierManager network={selectedNetwork} />
                    </TabsContent>
                  </Tabs>
                )}
                
                  {apiKeyData && (
                    <div className="card-hover shadow-glow animate-slide-up rounded-lg p-4 sm:p-6 lg:p-8 mt-6 sm:mt-8">
                      {!showVaultUI ? (
                        <div className="space-y-4 sm:space-y-6">
                          <div>
                            <span className="mb-2 sm:mb-4 inline-block px-2.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wider rounded-full bg-green-100 dark:bg-green-500/10 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-500/20">SUCCESS</span>
                            <h3 className="serif-heading text-2xl sm:text-3xl">
                              API Key Generated
                            </h3>
                            <p className="text-sm sm:text-body-small text-secondary mt-1 sm:mt-2">
                              Your key has been created for {apiKeyData.network}
                            </p>
                          </div>
                          
                          <div className="space-y-3 sm:space-y-4">
                            <div className="space-y-1.5 sm:space-y-2">
                              <span className="text-xs sm:text-body-small text-secondary font-medium">Base URL</span>
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                <input
                                  readOnly
                                  value={apiKeyData.network === 'mainnet' 
                                    ? 'https://mainnet.zklighter.elliot.ai' 
                                    : 'https://testnet.zklighter.elliot.ai'}
                                  className="flex-1 bg-transparent border border-gray-300 dark:border-white/20 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-mono focus:outline-none focus:border-gray-400 dark:focus:border-white/40 transition-colors"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="shrink-0 text-secondary hover:text-foreground"
                                  onClick={() => copyToClipboard(
                                    apiKeyData.network === 'mainnet' 
                                      ? 'https://mainnet.zklighter.elliot.ai' 
                                      : 'https://testnet.zklighter.elliot.ai',
                                    'Base URL'
                                  )}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="space-y-1.5 sm:space-y-2">
                              <span className="text-xs sm:text-body-small text-secondary font-medium">Private Key</span>
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                <input
                                  readOnly
                                  type={showPrivateKey ? "text" : "password"}
                                  value={apiKeyData.privateKey}
                                  className="flex-1 bg-transparent border border-gray-300 dark:border-white/20 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-mono focus:outline-none focus:border-gray-400 dark:focus:border-white/40 transition-colors"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="shrink-0 text-secondary hover:text-foreground"
                                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                                >
                                  {showPrivateKey ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="shrink-0 text-secondary hover:text-foreground"
                                  onClick={() => copyToClipboard(apiKeyData.privateKey, 'Private Key')}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                              <div className="space-y-1.5 sm:space-y-2">
                                <span className="text-xs sm:text-body-small text-secondary font-medium">Account Index</span>
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  <input
                                    readOnly
                                    value={apiKeyData.accountIndex}
                                    className="flex-1 bg-transparent border border-gray-300 dark:border-white/20 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-mono focus:outline-none focus:border-gray-400 dark:focus:border-white/40 transition-colors"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="shrink-0 text-secondary hover:text-foreground"
                                    onClick={() => copyToClipboard(apiKeyData.accountIndex.toString(), 'Account Index')}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="space-y-1.5 sm:space-y-2">
                                <span className="text-xs sm:text-body-small text-secondary font-medium">API Key Index</span>
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  <input
                                    readOnly
                                    value={apiKeyData.apiKeyIndex}
                                    className="flex-1 bg-transparent border border-gray-300 dark:border-white/20 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-mono focus:outline-none focus:border-gray-400 dark:focus:border-white/40 transition-colors"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="shrink-0 text-secondary hover:text-foreground"
                                    onClick={() => copyToClipboard(apiKeyData.apiKeyIndex.toString(), 'API Key Index')}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        
                        <div className="border-t border-border dark:border-white/10 pt-3 sm:pt-4 mt-4 sm:mt-6">
                          <p className="text-xs sm:text-body-small text-secondary leading-relaxed">
                            Save this configuration securely. The private key cannot be recovered if lost. Keys are generated using cryptographically secure methods and never leave your browser.
                          </p>
                          <Button
                            onClick={() => setShowVaultUI(true)}
                            variant="outline"
                            className="w-full mt-4 transition-all hover:border-primary/50"
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            Encrypt with Wallet
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Button
                          onClick={() => setShowVaultUI(false)}
                          variant="ghost"
                          size="sm"
                          className="mb-4"
                        >
                          ← Back to API Key
                        </Button>
                        <WalletKeyVault
                          keys={[{
                            privateKey: apiKeyData.privateKey,
                            publicKey: apiKeyData.publicKey,
                            keyIndex: apiKeyData.apiKeyIndex,
                            accountIndex: apiKeyData.accountIndex,
                            network: apiKeyData.network,
                            address: address
                          }]}
                          label="API Key"
                          onClear={() => {
                            setApiKeyData(null)
                            setShowVaultUI(false)
                          }}
                        />
                      </div>
                    )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>

        <footer className="mt-auto border-t border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Powered by{' '}
                  <a
                    href="https://lighter.xyz"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium underline underline-offset-4 transition-opacity hover:opacity-80"
                  >
                    Lighter
                  </a>
                </p>
                <p className="text-[10px] sm:text-[9px] text-muted-foreground/50 mt-2 sm:mt-1 leading-relaxed">
                  This is free, open-source software. You are solely responsible for your private keys and transactions.<br className="hidden sm:block" />
                  <span className="sm:hidden"> </span>I accept no liability for any losses. Always double-check before signing. Use at your own risk.
                </p>
              </div>
              
              {import.meta.env.VITE_COMMIT_SHA && import.meta.env.VITE_COMMIT_SHA !== '$COMMIT_REF' && (
                <>
                  {/* Desktop: centered */}
                  <p className="text-xs text-muted-foreground/60 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden sm:block">
                    <a 
                      href={`https://github.com/yeule0/lighter-web-keygen/commit/${import.meta.env.VITE_COMMIT_SHA}`}
                      className="font-mono hover:text-muted-foreground transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {import.meta.env.VITE_COMMIT_SHA.slice(0, 7)}
                    </a>
                  </p>
                  
                  {/* Mobile: as third row */}
                  <p className="text-xs text-muted-foreground/60 sm:hidden order-last w-full text-center">
                    <a 
                      href={`https://github.com/yeule0/lighter-web-keygen/commit/${import.meta.env.VITE_COMMIT_SHA}`}
                      className="font-mono hover:text-muted-foreground transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {import.meta.env.VITE_COMMIT_SHA.slice(0, 7)}
                    </a>
                  </p>
                </>
              )}
              
                <div className="flex items-center gap-3">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    Made by Yeule0
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href="https://x.com/yeule0"
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-all hover:scale-110"
                      aria-label="X (Twitter)"
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </a>
                    <a
                      href="https://github.com/yeule0/lighter-web-keygen"
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-all hover:scale-110"
                      aria-label="GitHub"
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                    </a>
                  </div>
                </div>
            </div>
          </div>
        </footer>
        <Toaster />
        </div>
      </ConnectKitWrapper>
    </ThemeProvider>
  )
}

export default App