/**
 * Example: Release escrow funds to recipient
 */
import { TrustFlowClient } from '@trustflow/sdk';
import { releaseEscrow } from '@trustflow/sdk/escrow';
import { connectWallet } from '@trustflow/sdk/wallet';
import { Keypair } from '@stellar/stellar-sdk';

async function main() {
  const callerAddress =
    process.env.STELLAR_PUBLIC_KEY ||
    (typeof window !== 'undefined'
      ? (await connectWallet('freighter')).publicKey
      : Keypair.random().publicKey());

  const client = new TrustFlowClient({
    contractId: process.env.TRUSTFLOW_CONTRACT_ID!,
    network: 'TESTNET',
  });

  const escrowId = process.argv[2];
  if (!escrowId) {
    console.error('Usage: npm run examples -- examples/release-funds.ts <escrow_id>');
    process.exit(1);
  }

  const txHash = await releaseEscrow(client, { escrowId, caller: callerAddress });
  console.log('Released! Transaction:', txHash);
}

main().catch(console.error);
