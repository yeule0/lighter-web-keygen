import { ConnectKitProvider } from 'connectkit'
import { useTheme } from './theme-provider'
import { ReactNode } from 'react'

interface ConnectKitWrapperProps {
  children: ReactNode
}

export function ConnectKitWrapper({ children }: ConnectKitWrapperProps) {
  const { theme } = useTheme()
  
  const mode = theme === 'system' 
    ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    : theme as 'light' | 'dark'

  return (
    <ConnectKitProvider
      theme="minimal"
      mode={mode}
      options={{
        hideQuestionMarkCTA: true,
        hideRecentBadge: false,
        embedGoogleFonts: false,
        avoidLayoutShift: true,
        enforceSupportedChains: false,
        walletConnectName: "WalletConnect",
        walletConnectCTA: "both",
      }}
      customTheme={{
        "--ck-font-family": "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        "--ck-border-radius": "0.5rem",
        "--ck-connectbutton-font-size": "14px",
        "--ck-connectbutton-font-weight": "500",
        "--ck-connectbutton-border-radius": "var(--radius)",
        "--ck-connectbutton-background": "hsl(var(--primary))",
        "--ck-connectbutton-color": "hsl(var(--primary-foreground))",
        "--ck-connectbutton-hover-background": "hsl(var(--primary)/90)",
        "--ck-connectbutton-hover-color": "hsl(var(--primary-foreground))",
        "--ck-connectbutton-active-background": "hsl(var(--primary)/80)",
        "--ck-connectbutton-box-shadow": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "--ck-connectbutton-hover-box-shadow": "0 1px 3px 0 rgb(0 0 0 / 0.1)",
        
        "--ck-primary-button-background": "hsl(var(--primary))",
        "--ck-primary-button-color": "hsl(var(--primary-foreground))",
        "--ck-primary-button-hover-background": "hsl(var(--primary)/90)",
        "--ck-primary-button-hover-color": "hsl(var(--primary-foreground))",
        "--ck-primary-button-active-background": "hsl(var(--primary)/80)",
        "--ck-primary-button-border-radius": "var(--radius)",
        
        "--ck-secondary-button-background": "transparent",
        "--ck-secondary-button-color": "hsl(var(--foreground))",
        "--ck-secondary-button-hover-background": "hsl(var(--accent))",
        "--ck-secondary-button-hover-color": "hsl(var(--accent-foreground))",
        "--ck-secondary-button-border-radius": "var(--radius)",
        
        "--ck-modal-heading-font-weight": "600",
        "--ck-modal-heading-font-size": "18px",
        "--ck-modal-box-shadow": "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        "--ck-modal-border-radius": "0.75rem",
        "--ck-modal-backdrop-filter": "none",
        
        "--ck-body-background": "hsl(var(--background))",
        "--ck-body-background-transparent": "hsl(var(--background) / 0)",
        "--ck-body-background-secondary": "hsl(var(--muted))",
        "--ck-body-background-secondary-hover-background": "hsl(var(--muted)/80)",
        "--ck-body-background-secondary-hover-outline": "hsl(var(--border))",
        "--ck-body-background-tertiary": "hsl(var(--muted)/50)",
        "--ck-body-color": "hsl(var(--foreground))",
        "--ck-body-color-muted": "hsl(var(--muted-foreground))",
        "--ck-body-color-muted-hover": "hsl(var(--foreground))",
        "--ck-body-divider": "hsl(var(--border))",
        "--ck-body-action-color": "hsl(var(--primary))",
        
        "--ck-overlay-background": mode === 'dark' ? "#000000" : "#ffffff",
        "--ck-overlay-backdrop-filter": "none",
        
        "--ck-focus-color": "hsl(var(--ring))",
        "--ck-spinner-color": "hsl(var(--primary))",
        
        "--ck-tooltip-background": "hsl(var(--popover))",
        "--ck-tooltip-background-secondary": "hsl(var(--popover))",
        "--ck-tooltip-color": "hsl(var(--popover-foreground))",
        "--ck-tooltip-shadow": "0 4px 6px -1px rgb(0 0 0 / 0.1)",
        
        "--ck-dropdown-button-background": "hsl(var(--secondary))",
        "--ck-dropdown-button-color": "hsl(var(--secondary-foreground))",
        "--ck-dropdown-button-hover-background": "hsl(var(--secondary)/80)",
        "--ck-dropdown-button-hover-color": "hsl(var(--secondary-foreground))",
        
        "--ck-qr-border-radius": "var(--radius)",
        "--ck-qr-background": "white",
        
        "--ck-recent-badge-background": "hsl(var(--primary)/10)",
        "--ck-recent-badge-color": "hsl(var(--primary))",
        "--ck-recent-badge-border-radius": "var(--radius)",
        
        "--ck-wallet-option-background": "hsl(var(--card))",
        "--ck-wallet-option-background-hover": "hsl(var(--accent))",
        "--ck-wallet-option-border-radius": "var(--radius)",
        "--ck-wallet-option-shadow": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "--ck-wallet-option-shadow-hover": "0 4px 6px -1px rgb(0 0 0 / 0.1)",
        
        "--ck-graphic-primary-background": "hsl(var(--primary)/10)",
        "--ck-graphic-primary-color": "hsl(var(--primary))",
        "--ck-graphic-secondary-background": "hsl(var(--secondary))",
        "--ck-graphic-secondary-color": "hsl(var(--secondary-foreground))",
        
        "--ck-close-button-background": "transparent",
        "--ck-close-button-background-hover": "hsl(var(--accent))",
        "--ck-close-button-color": "hsl(var(--muted-foreground))",
        "--ck-close-button-color-hover": "hsl(var(--foreground))",
      }}
    >
      {children}
    </ConnectKitProvider>
  )
}