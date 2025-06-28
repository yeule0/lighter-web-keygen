# Lighter Web API Key Generator

A browser-based tool for generating API keys for the Lighter DEX without exposing private keys.

**Live Application**: [https://lighterkey.netlify.app/](https://lighterkey.netlify.app/)

## Overview

This application allows users to generate and register Layer 2 API keys for Lighter DEX directly in their browser. Instead of pasting private keys into Python scripts, users can securely connect their wallets and manage API keys through a web interface.

## Features

- Fully client-side execution - all cryptographic operations happen in your browser
- Wallet integration supporting MetaMask, Rabby, and other Web3 wallets  
- WebAssembly implementation of Lighter's cryptographic library
- Dark mode support with responsive design

## How It Works

1. Connect your Ethereum wallet to the application
2. The app checks if you have an existing Lighter account
3. Choose whether you're setting up a new account or have existing API keys
4. Generate a new Layer 2 API key pair
5. Sign and submit the transaction to register your new key

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