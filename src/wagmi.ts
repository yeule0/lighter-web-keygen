import { createConfig, http } from 'wagmi'
import { mainnet, zkSync, zkSyncSepoliaTestnet } from 'wagmi/chains'
import { injected, coinbaseWallet } from 'wagmi/connectors'

export const config = createConfig({
  chains: [mainnet, zkSync, zkSyncSepoliaTestnet],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
    coinbaseWallet({
      appName: 'Lighter API Key Generator',
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [zkSync.id]: http(),
    [zkSyncSepoliaTestnet.id]: http(),
  },
})