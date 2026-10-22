/**
 * Example: Raise a dispute on an active escrow
 */
import { TrustFlowClient } from '@trustflow/sdk';
import { disputeEscrow } from '@trustflow/sdk/escrow';
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

  const [, , escrowId, ...reasonWords] = process.argv;
  const reason = reasonWords.join(' ') || 'Goods not delivered as described.';

  const txHash = await disputeEscrow(client, {
    escrowId: escrowId || 'esc-001',
    caller: callerAddress,
    reason,
  });
  console.log('Dispute raised! Transaction:', txHash);
}

main().catch(console.error);
