import { useState, useEffect } from 'react'
import { ConnectKitButton } from 'connectkit'
import { useAccount, useDisconnect } from 'wagmi'
import { ApiKeyGeneratorFull } from './components/ApiKeyGeneratorFull'
import { AccountCheck } from './components/AccountCheck'
import { BulkKeyGenerator } from './components/BulkKeyGenerator'
import { MultiWalletKeyGenerator } from './components/MultiWalletKeyGenerator'
import { ThemeProvider } from './components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { copyToClipboard } from '@/lib/clipboard'
import { Sparkles, Copy, Eye, EyeOff, LogOut, Key, Layers, Wallet } from 'lucide-react'
import { ThemeToggle } from './components/theme-toggle'
import { ConnectKitWrapper } from './components/ConnectKitWrapper'
import { DomainWarning } from './components/DomainWarning'

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
  
  // Clear state when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setAccountIndex(null)
      setApiKeyData(null)
      setShowPrivateKey(false)
    }
  }, [isConnected])
  
  // Clear API key data when network or account changes
  useEffect(() => {
    setApiKeyData(null)
    setShowPrivateKey(false)
  }, [selectedNetwork, accountIndex])

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
              <div className="mb-12 sm:mb-16">
                <span className="badge-minimal mb-3 sm:mb-4 inline-block text-[10px] sm:text-[11px]">LIGHTER DEX</span>
                <h1 className="serif-heading text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-normal mb-6 sm:mb-8 leading-tight sm:leading-normal">
                  API Key<br />Generator
                </h1>
              </div>

              {!isConnected && (
                <div className="mb-12">
                  <ConnectKitButton />
                  <div className="mt-8 max-w-2xl">
                    <p className="text-sm sm:text-body-small text-secondary leading-relaxed hidden sm:block">
                      API key generation for Lighter DEX involves cryptographic operations and requires careful handling. Private keys generated are non-recoverable if lost. This tool operates entirely in your browser - no data is transmitted to external servers.
                    </p>
                    <div className="sm:hidden space-y-3">
                      <p className="text-xs text-secondary leading-relaxed">
                        API key generation for Lighter DEX involves cryptographic operations and requires careful handling.
                      </p>
                      <p className="text-xs text-secondary leading-relaxed">
                        Private keys generated are non-recoverable if lost. This tool operates entirely in your browser - no data is transmitted to external servers.
                      </p>
                    </div>
                  </div>
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
                  <Tabs defaultValue="generate" className="w-full">
                    <TabsList className="flex w-full gap-8 p-0 bg-transparent border-0 h-auto mb-12 border-b border-border">
                      <TabsTrigger value="generate" className="tab-text text-base data-[state=active]:border-b-2 data-[state=active]:border-foreground pb-4 rounded-none bg-transparent border-b-2 border-transparent transition-all duration-200 data-[state=active]:text-foreground text-secondary">
                        <Key className="h-4 w-4 mr-2" />
                        Generate
                      </TabsTrigger>
                      <TabsTrigger value="bulk" className="tab-text text-base data-[state=active]:border-b-2 data-[state=active]:border-foreground pb-4 rounded-none bg-transparent border-b-2 border-transparent transition-all duration-200 data-[state=active]:text-foreground text-secondary">
                        <Layers className="h-4 w-4 mr-2" />
                        Bulk
                      </TabsTrigger>
                      <TabsTrigger value="multi" className="tab-text text-base data-[state=active]:border-b-2 data-[state=active]:border-foreground pb-4 rounded-none bg-transparent border-b-2 border-transparent transition-all duration-200 data-[state=active]:text-foreground text-secondary">
                        <Wallet className="h-4 w-4 mr-2" />
                        Multi-Account
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
                  </Tabs>
                )}
                
                  {apiKeyData && (
                    <div className="card-hover shadow-glow animate-slide-up rounded-lg p-8 mt-8">
                      <div className="space-y-6">
                        <div>
                          <span className="mb-4 inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-green-100 dark:bg-green-500/10 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-500/20">SUCCESS</span>
                          <h3 className="serif-heading text-3xl">
                            API Key Generated
                          </h3>
                          <p className="text-body-small text-secondary mt-2">
                            Your key has been created for {apiKeyData.network}
                          </p>
                        </div>
                          
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <span className="text-body-small text-secondary font-medium">Base URL</span>
                              <div className="flex items-center gap-2">
                                <input
                                  readOnly
                                  value={apiKeyData.network === 'mainnet' 
                                    ? 'https://mainnet.zklighter.elliot.ai' 
                                    : 'https://testnet.zklighter.elliot.ai'}
                                  className="flex-1 bg-transparent border border-white/20 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-white/40 transition-colors"
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
                            
                            <div className="space-y-2">
                              <span className="text-body-small text-secondary font-medium">Private Key</span>
                              <div className="flex items-center gap-2">
                                <input
                                  readOnly
                                  type={showPrivateKey ? "text" : "password"}
                                  value={apiKeyData.privateKey}
                                  className="flex-1 bg-transparent border border-white/20 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-white/40 transition-colors"
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
                            
                            <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <span className="text-body-small text-secondary font-medium">Account Index</span>
                                <div className="flex items-center gap-2">
                                  <input
                                    readOnly
                                    value={apiKeyData.accountIndex}
                                    className="flex-1 bg-transparent border border-white/20 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-white/40 transition-colors"
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
                              
                              <div className="space-y-2">
                                <span className="text-body-small text-secondary font-medium">API Key Index</span>
                                <div className="flex items-center gap-2">
                                  <input
                                    readOnly
                                    value={apiKeyData.apiKeyIndex}
                                    className="flex-1 bg-transparent border border-white/20 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-white/40 transition-colors"
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
                        
                        <div className="border-t border-border dark:border-white/10 pt-4 mt-6">
                          <p className="text-body-small text-secondary leading-relaxed">
                            Save this configuration securely. The private key cannot be recovered if lost. Keys are generated using cryptographically secure methods and never leave your browser.
                          </p>
                        </div>
                      </div>
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
                <p className="text-[9px] text-muted-foreground/50 mt-1">
                  This is free, open-source software. You are solely responsible for your private keys and transactions.<br />
                  I accept no liability for any losses. Always double-check before signing. Use at your own risk.
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
                    Made by yeule0
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