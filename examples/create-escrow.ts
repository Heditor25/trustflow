/**
 * Example: Create a new escrow using TrustFlow SDK
 */
import { TrustFlowClient } from '@trustflow/sdk';
import { createEscrow } from '@trustflow/sdk/escrow';
import { connectWallet } from '@trustflow/sdk/wallet';
import { xlmToStroops } from '@trustflow/sdk/utils';
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

  await client.connect();

  const recipient =
    process.env.RECIPIENT_ADDRESS || 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFDAGORAC526G22TYOXA2';

  const escrow = await createEscrow(client, {
    sender: callerAddress,
    recipient,
    amountStroops: xlmToStroops('50'),
    durationBlocks: 17280, // ~1 day
    metadata: { orderId: 'ORD-001', description: 'Freelance payment' },
  });

  console.log('Escrow created:', escrow.id);
  console.log('Amount:', escrow.amount, 'stroops');
}

main().catch(console.error);
