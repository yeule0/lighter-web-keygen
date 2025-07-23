# Lighter Web API Key Generator

[![Netlify Status](https://api.netlify.com/api/v1/badges/c1bdc65e-8f2d-4ba6-82f0-d2f4039fd2d7/deploy-status)](https://app.netlify.com/sites/lighterkey/deploys)

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/yeule0/lighter-web-keygen)

A browser-based tool for generating API keys for the Lighter DEX without exposing private keys.

**Live Application**: [https://lighterkey.netlify.app/](https://lighterkey.netlify.app/)

**Note**: Lighter is adding official support for web-based API key generation soon. This community tool has been serving users in the meantime.

## Overview

This application allows users to generate and register Layer 2 API keys for Lighter DEX directly in their browser. Instead of pasting private keys into Python scripts, users can securely connect their wallets or use hardware wallet and manage API keys through a web interface.

## Features

- Fully client-side execution - all cryptographic operations happen in your browser
- Wallet integration supporting MetaMask, Rabby, and other Web3 wallets  
- WebAssembly implementation of Lighter's cryptographic library
- Dark mode support with responsive design
- Bulk key generation - create up to 20 API keys in a single session
- Multi-account support - generate keys for multiple wallets with automatic switching
- Privacy-focused - no data persistence or external storage

## How It Works

1. Connect your Ethereum wallet to the application
2. The app checks if you have an existing Lighter account
3. Choose your generation method:
   - **Single**: Generate one API key for your connected wallet
   - **Bulk**: Generate multiple keys (1-20) for a single account
   - **Multi-Account**: Generate keys across multiple wallets
4. Select your target API key index (1-255)
5. Generate secure Layer 2 API key pairs
6. Sign and submit transactions to register your new keys

## Development

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yeule0/lighter-web-keygen.git
cd lighter-web-keygen

# Install dependencies
npm install

# Start development server
npm run dev
```

### Building for Production

```bash
npm run build
```

The build output will be in the `dist` directory.

## Technical Details

### Architecture

The application uses:
- React 18 with TypeScript for the frontend
- Vite as the build tool
- wagmi and ConnectKit for wallet integration
- Tailwind CSS for styling
- WebAssembly for cryptographic operations

### Security

All cryptographic operations are performed locally in the browser using WebAssembly. Private keys are never transmitted to any server. The application uses Lighter's official cryptographic library compiled to WASM to ensure compatibility and security.

No user data, keys, or generation history is stored locally or remotely. Each session starts fresh to maximize privacy.

### API Key Management

Lighter uses a dual-key system:
- L1 keys: Standard Ethereum private keys for mainnet transactions
- L2 keys: Separate keys for Layer 2 operations using specialized cryptography

This application handles the generation and registration of L2 keys while using your connected wallet for L1 authorization.

## Deployment

The application can be deployed to any static hosting service:

```bash
npm run build
# Deploy the contents of the dist directory
```

## Contributing

Contributions are welcome. Please open an issue first to discuss what you would like to change.

## License

MIT License - see LICENSE file for details
