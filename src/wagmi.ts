import { createConfig, http } from 'wagmi'
import { mainnet, zksync, zksyncSepoliaTestnet } from 'wagmi/chains'
import { injected, coinbaseWallet } from 'wagmi/connectors'

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