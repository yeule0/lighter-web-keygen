import { useState } from 'react'
import { ConnectKitButton } from 'connectkit'
import { useAccount } from 'wagmi'
import { ApiKeyGeneratorFull } from './components/ApiKeyGeneratorFull'
import { AccountCheck } from './components/AccountCheck'
import { ThemeProvider } from './components/theme-provider'
import { ThemeToggle } from './components/theme-toggle'
import { Card, CardContent } from '@/components/ui/card'
import { Toaster } from '@/components/ui/toaster'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Sparkles, Copy, CheckCircle2, AlertTriangle, Link, Key, Hash, Layers, Eye, EyeOff } from 'lucide-react'
import { ConnectKitWrapper } from './components/ConnectKitWrapper'
import { DomainWarning } from './components/DomainWarning'

function App() {
  const { address, isConnected } = useAccount()
  const { toast } = useToast()
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
  
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    })
  }

  return (
    <ThemeProvider defaultTheme="dark" storageKey="lighter-theme">
      <DomainWarning />
      <ConnectKitWrapper>
        <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-14 sm:h-16 items-center justify-between">
              <a className="flex items-center space-x-2 transition-opacity hover:opacity-80" href="/">
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="font-semibold text-sm sm:text-base">Lighter Keys</span>
              </a>
              <nav className="flex items-center">
                <ThemeToggle />
              </nav>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
            <div className="mx-auto max-w-7xl">
              <div className="text-center mb-12 sm:mb-16 lg:mb-20">
                <div className="space-y-6 sm:space-y-8">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.1]">
                    <span className="block text-foreground/80">Generate API Keys for</span>
                    <span className="gradient-text block mt-1 sm:mt-2">Lighter DEX</span>
                  </h1>
                  <p className="mx-auto max-w-[42rem] text-base sm:text-lg md:text-xl text-muted-foreground leading-[1.6] sm:leading-[1.7] md:leading-[1.8] px-4">
                    Securely generate L2 API keys directly in your browser.
                    <span className="block mt-1 text-sm sm:text-base opacity-80">No private keys leave your device.</span>
                  </p>
                </div>
              </div>

              <div className="flex justify-center mb-12 sm:mb-16">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/0 blur-xl" />
                  <ConnectKitButton />
                </div>
              </div>
              {isConnected && address && (
                <div className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-in">
                <AccountCheck 
                  address={address} 
                  onAccountFound={setAccountIndex}
                  onNetworkChange={setSelectedNetwork}
                />
                
                {accountIndex !== null && (
                  <ApiKeyGeneratorFull 
                    address={address} 
                    accountIndex={accountIndex}
                    network={selectedNetwork}
                    onApiKeyGenerated={(data) => {
                      setApiKeyData(data)
                      setShowPrivateKey(false)
                    }}
                  />
                )}
                
                  {apiKeyData && (
                    <Card className="border border-green-500/20 shadow-lg">
                      <CardContent className="p-4 sm:p-6">
                        <div className="space-y-4 sm:space-y-6">
                          <div className="flex items-start gap-2 sm:gap-3">
                            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <h3 className="text-base sm:text-lg font-semibold">
                                API Key Generated Successfully
                              </h3>
                              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                                Your API key has been created for {apiKeyData.network}
                              </p>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Link className="h-3.5 w-3.5" />
                                <span>Base URL</span>
                              </div>
                              <div className="group relative flex items-center gap-2">
                                <input
                                  readOnly
                                  value={apiKeyData.network === 'mainnet' 
                                    ? 'https://mainnet.zklighter.elliot.ai' 
                                    : 'https://testnet.zklighter.elliot.ai'}
                                  className="flex-1 bg-muted/50 rounded-md px-2 sm:px-3 py-2 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring overflow-hidden text-ellipsis"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="shrink-0"
                                  onClick={() => copyToClipboard(
                                    apiKeyData.network === 'mainnet' 
                                      ? 'https://mainnet.zklighter.elliot.ai' 
                                      : 'https://testnet.zklighter.elliot.ai',
                                    'Base URL'
                                  )}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Key className="h-3.5 w-3.5" />
                                <span>Private Key</span>
                              </div>
                              <div className="group relative flex items-center gap-2">
                                <input
                                  readOnly
                                  type={showPrivateKey ? "text" : "password"}
                                  value={apiKeyData.privateKey}
                                  className="flex-1 bg-muted/50 rounded-md px-2 sm:px-3 py-2 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring overflow-hidden text-ellipsis"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="shrink-0"
                                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                                >
                                  {showPrivateKey ? (
                                    <EyeOff className="h-3.5 w-3.5" />
                                  ) : (
                                    <Eye className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="shrink-0"
                                  onClick={() => copyToClipboard(apiKeyData.privateKey, 'Private Key')}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Hash className="h-3.5 w-3.5" />
                                  <span>Account Index</span>
                                </div>
                                <div className="group relative flex items-center gap-2">
                                  <input
                                    readOnly
                                    value={apiKeyData.accountIndex}
                                    className="flex-1 bg-muted/50 rounded-md px-2 sm:px-3 py-2 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring overflow-hidden text-ellipsis"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(apiKeyData.accountIndex.toString(), 'Account Index')}
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Layers className="h-3.5 w-3.5" />
                                  <span>API Key Index</span>
                                </div>
                                <div className="group relative flex items-center gap-2">
                                  <input
                                    readOnly
                                    value={apiKeyData.apiKeyIndex}
                                    className="flex-1 bg-muted/50 rounded-md px-2 sm:px-3 py-2 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring overflow-hidden text-ellipsis"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(apiKeyData.apiKeyIndex.toString(), 'API Key Index')}
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-4 sm:mt-6 p-3 sm:p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                            <div className="flex gap-3">
                              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                              <div className="space-y-1 text-xs sm:text-sm">
                                <p className="font-medium">Security Notice</p>
                                <p className="text-muted-foreground leading-relaxed">
                                  Save this configuration securely. The private key cannot be recovered if lost.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>

        <footer className="mt-auto border-t">
          <div className="container mx-auto px-4 py-4 sm:py-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-xs text-muted-foreground">
                Powered by{' '}
                <a
                  href="https://lighter.xyz"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline underline-offset-4 hover:text-foreground transition-colors"
                >
                  Lighter
                </a>
                {import.meta.env.VITE_COMMIT_SHA && (
                  <>
                    {' · '}
                    <a 
                      href={`https://github.com/yeule0/lighter-web-keygen/commit/${import.meta.env.VITE_COMMIT_SHA}`}
                      className="font-mono hover:text-foreground transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {import.meta.env.VITE_COMMIT_SHA.slice(0, 7)}
                    </a>
                  </>
                )}
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Made by yeule0</span>
                <div className="flex items-center gap-3">
                  <a
                    href="https://x.com/yeule0"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-foreground transition-colors"
                    aria-label="X (Twitter)"
                  >
                    <svg
                      className="h-3.5 w-3.5"
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
                    className="hover:text-foreground transition-colors"
                    aria-label="GitHub"
                  >
                    <svg
                      className="h-3.5 w-3.5"
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
        </div>
        <Toaster />
      </ConnectKitWrapper>
    </ThemeProvider>
  )
}

export default App