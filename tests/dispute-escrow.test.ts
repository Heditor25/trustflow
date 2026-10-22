import { disputeEscrow } from '../src/escrow/dispute';
import { buildDisputeArgs } from '../src/contract/build';
import { Address, nativeToScVal } from '@stellar/stellar-sdk';
import { TrustFlowClient } from '../src/client';
import { Keypair } from '@stellar/stellar-sdk';

const CALLER = Keypair.random().publicKey();

describe('disputeEscrow', () => {
  const client = new TrustFlowClient({ contractId: 'CONTRACT123', network: 'TESTNET' });

  it('raises a dispute for valid params', async () => {
    const txHash = await disputeEscrow(client, {
      escrowId: 'esc-1',
      caller: CALLER,
      reason: 'Goods not delivered as described.',
    });

    expect(txHash).toMatch(/^tx_dispute_esc-1_/);
  });

  it('throws when escrowId is missing', async () => {
    await expect(
      disputeEscrow(client, { escrowId: '', caller: CALLER, reason: 'reason' }),
    ).rejects.toThrow(/escrowId/);
  });

  it('throws when caller is missing', async () => {
    await expect(
      disputeEscrow(client, { escrowId: 'esc-1', caller: '', reason: 'reason' }),
    ).rejects.toThrow(/dispute/);
  });

  it('throws when reason is missing', async () => {
    await expect(
      disputeEscrow(client, { escrowId: 'esc-1', caller: CALLER, reason: '  ' }),
    ).rejects.toThrow(/reason/);
  });

  it('encodes escrowId, caller, and reason into contract call arguments', () => {
    const args = buildDisputeArgs('esc-1', CALLER, 'Goods not delivered');
    expect(args).toHaveLength(3);
    expect(args[0]).toEqual(nativeToScVal('esc-1', { type: 'string' }));
    expect(args[1]).toEqual(new Address(CALLER).toScVal());
    expect(args[2]).toEqual(nativeToScVal('Goods not delivered', { type: 'string' }));
  });
});
