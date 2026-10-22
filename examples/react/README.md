# TrustFlow React Hooks Sandbox

Interactive React example demonstrating integration with the TrustFlow Protocol SDK hooks (`@trustflow/sdk/react`) and the Freighter Stellar wallet.

## Features

- **Wallet Connection (`useWallet`)**: Connect and disconnect the Freighter browser extension, retrieve the active Stellar public key, and listen for account changes.
- **Account Balance (`useBalance`)**: Fetch and display real-time XLM balances for the connected account.
- **Escrow Operations (`useEscrow`)**: Create and release escrow contracts with configurable amounts, recipients, and asset codes.

## Prerequisites

1. **Freighter Wallet**: Install the [Freighter browser extension](https://www.freighter.app/).
2. **Stellar Testnet**: Switch Freighter to the **Testnet** network and fund your account using the [Stellar Laboratory Friendbot](https://laboratory.stellar.org/#account-creator?network=test).
3. **Node.js**: Node.js 18+ and npm.

## Getting Started

### 1. Install Dependencies

From this directory:

```bash
npm install
```

This installs dependencies including `@trustflow/sdk` from the root workspace (`file:../..`).

### 2. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Build for Production

```bash
npm run build
```

## Configuration & Environment Variables

The sandbox connects to Stellar Testnet by default. You can override network settings by creating a `.env` file in this directory:

```env
VITE_HORIZON_URL=https://horizon-testnet.stellar.org
VITE_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
VITE_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
VITE_CONTRACT_ID=CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4
```

## Code Example

```tsx
import React, { useState } from 'react';
import { useWallet, useEscrow, useBalance } from '@trustflow/sdk/react';

function App() {
  const { isConnected, address, connect, disconnect } = useWallet();
  const { balance, loading: balanceLoading } = useBalance(address);
  const { createEscrow, releaseEscrow, loading: escrowLoading } = useEscrow();

  // Connect wallet
  const handleConnect = async () => {
    await connect();
  };

  // Create an escrow
  const handleCreate = async () => {
    await createEscrow({
      amount: '100',
      recipient: 'GBXYZ...',
      assetCode: 'USDC',
    });
  };

  return (
    <div>
      {!isConnected ? (
        <button onClick={handleConnect}>Connect Wallet</button>
      ) : (
        <div>
          <p>Connected: {address}</p>
          <p>Balance: {balance} XLM</p>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      )}
    </div>
  );
}

export default App;
```
