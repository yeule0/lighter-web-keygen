import { createConfig, http } from 'wagmi'
import { mainnet, zksync, zksyncSepoliaTestnet } from 'wagmi/chains'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'

// WalletConnect Project ID
const projectId = '030fa561fc5ffb379c4f038ebe7ef245'

// Use public RPC endpoints that work well with CORS
const rpcUrls = {
  [mainnet.id]: 'https://ethereum-rpc.publicnode.com',
  [zksync.id]: 'https://mainnet.era.zksync.io',
  [zksyncSepoliaTestnet.id]: 'https://sepolia.era.zksync.dev',
}

export const config = createConfig({
  chains: [mainnet, zksync, zksyncSepoliaTestnet],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
    walletConnect({
      projectId,
      showQrModal: true,
      metadata: {
        name: 'Lighter Keys',
        description: 'Generate API keys for Lighter DEX',
        url: 'https://lighterkey.netlify.app',
        icons: ['https://lighter.xyz/logo.png'],
      },
    }),
    coinbaseWallet({
      appName: 'Lighter API Key Generator',
    }),
  ],
  transports: {
    [mainnet.id]: http(rpcUrls[mainnet.id]),
    [zksync.id]: http(rpcUrls[zksync.id]),
    [zksyncSepoliaTestnet.id]: http(rpcUrls[zksyncSepoliaTestnet.id]),
  },
})