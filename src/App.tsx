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
import { Sparkles, Copy, CheckCircle2, AlertTriangle, Link, Key, Hash, Layers } from 'lucide-react'
import { ConnectKitWrapper } from './components/ConnectKitWrapper'
import { DomainWarning } from './components/DomainWarning'

function App() {
  const { address, isConnected } = useAccount()
  const { toast } = useToast()
  const [accountIndex, setAccountIndex] = useState<number | null>(null)
  const [selectedNetwork, setSelectedNetwork] = useState<'mainnet' | 'testnet'>('testnet')
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
                    onApiKeyGenerated={setApiKeyData}
                  />
                )}
                
                  {apiKeyData && (
                    <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-green-500/10">
                      <CardContent className="p-6 sm:p-8">
                        <div className="space-y-6">
                          <div className="flex items-center gap-3">
                            <div className="p-3 rounded-full bg-green-500/10">
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            </div>
                            <h3 className="text-xl sm:text-2xl font-semibold">
                              API Key Successfully Generated
                            </h3>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="group relative rounded-lg border bg-card p-4 transition-all hover:shadow-sm">
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Link className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-sm font-medium text-muted-foreground">Base URL</p>
                                  </div>
                                  <p className="font-mono text-sm break-all pl-6">
                                    {apiKeyData.network === 'mainnet' 
                                      ? 'https://mainnet.zklighter.elliot.ai' 
                                      : 'https://testnet.zklighter.elliot.ai'}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
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
                            
                            <div className="group relative rounded-lg border bg-card p-4 transition-all hover:shadow-sm">
                              <div className="flex items-center justify-between">
                                <div className="space-y-1 flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Key className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-sm font-medium text-muted-foreground">Private Key</p>
                                  </div>
                                  <p className="font-mono text-xs break-all pl-6 text-muted-foreground">
                                    {apiKeyData.privateKey}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0"
                                  onClick={() => copyToClipboard(apiKeyData.privateKey, 'Private Key')}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="group relative rounded-lg border bg-card p-4 transition-all hover:shadow-sm">
                                <div className="flex items-center justify-between">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Hash className="h-4 w-4 text-muted-foreground" />
                                      <p className="text-sm font-medium text-muted-foreground">Account Index</p>
                                    </div>
                                    <p className="font-mono text-sm pl-6">
                                      {apiKeyData.accountIndex}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => copyToClipboard(apiKeyData.accountIndex.toString(), 'Account Index')}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="group relative rounded-lg border bg-card p-4 transition-all hover:shadow-sm">
                                <div className="flex items-center justify-between">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Layers className="h-4 w-4 text-muted-foreground" />
                                      <p className="text-sm font-medium text-muted-foreground">API Key Index</p>
                                    </div>
                                    <p className="font-mono text-sm pl-6">
                                      {apiKeyData.apiKeyIndex}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => copyToClipboard(apiKeyData.apiKeyIndex.toString(), 'API Key Index')}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-3 rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
                            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                                Important Security Notice
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Save this configuration securely. The private key will not be shown again and cannot be recovered if lost.
                              </p>
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
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 sm:py-8">
              <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
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
                    aria-label="X (Twitter) Profile"
                  >
                    <svg
                      className="h-4 w-4 sm:h-5 sm:w-5"
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
                    aria-label="GitHub Profile"
                  >
                    <svg
                      className="h-4 w-4 sm:h-5 sm:w-5"
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