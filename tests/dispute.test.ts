import { DisputeClient } from '../src/escrow/dispute';
import type { Dispute } from '../src/types/index';
import type { ContractConfig } from '../src/types/contract';

const mockHttpPost = jest.fn();
const mockHttpGet = jest.fn();

jest.mock('../src/utils/http', () => ({
  createApiHttpClient: jest.fn(() => ({
    post: mockHttpPost,
    get: mockHttpGet,
  })),
  toApiErrorMessage: (error: unknown) =>
    error instanceof Error ? `Network error: ${error.message}` : `Network error: ${String(error)}`,
}));

describe('DisputeClient', () => {
  beforeEach(() => {
    mockHttpPost.mockReset();
    mockHttpGet.mockReset();
  });

  it('initialises with api url and token', () => {
    const client = new DisputeClient({ apiBaseUrl: 'http://api', apiKey: 'tok' } as any);
    expect(client).toBeDefined();
  });

  it('initialises from ContractConfig with backend credentials', () => {
    const config: ContractConfig = {
      contractId: 'contract-id',
      network: 'TESTNET',
      rpcUrl: 'https://soroban-testnet.stellar.org',
      networkPassphrase: 'Test SDF Network ; September 2015',
      apiBaseUrl: 'http://api',
      apiKey: 'tok',
    };

    expect(new DisputeClient(config)).toBeDefined();
  });

  it('requires backend URL and API key in ContractConfig', () => {
    const config: ContractConfig = {
      contractId: 'contract-id',
      network: 'TESTNET',
      rpcUrl: 'https://soroban-testnet.stellar.org',
      networkPassphrase: 'Test SDF Network ; September 2015',
    };

    expect(() => new DisputeClient(config)).toThrow('apiBaseUrl is required');
    expect(() => new DisputeClient({ ...config, apiBaseUrl: 'http://api' })).toThrow(
      'apiKey is required',
    );
  });

  describe('raiseDispute', () => {
    it('returns success when API responds with ID', async () => {
      mockHttpPost.mockResolvedValueOnce({ data: { id: 'dsp-1' } });

      const client = new DisputeClient({ apiBaseUrl: 'http://api', apiKey: 'tok' } as any);
      const result = await client.raiseDispute({
        escrowId: 'esc-1',
        reason: 'Goods not delivered on time',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.disputeId).toBe('dsp-1');
      }
      expect(mockHttpPost).toHaveBeenCalledWith('/disputes', {
        escrowId: 'esc-1',
        reason: 'Goods not delivered on time',
      });
    });

    it('returns error result on network failure', async () => {
      mockHttpPost.mockRejectedValueOnce(new Error('connection reset'));

      const client = new DisputeClient({ apiBaseUrl: 'http://api', apiKey: 'tok' } as any);
      const result = await client.raiseDispute({
        escrowId: 'esc-1',
        reason: 'Goods not delivered on time',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/Network error/);
      }
    });

    it('rejects an empty escrowId without making an HTTP call', async () => {
      const client = new DisputeClient({ apiBaseUrl: 'http://api', apiKey: 'tok' } as any);
      const result = await client.raiseDispute({
        escrowId: '',
        reason: 'Goods not delivered on time',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/escrowId/);
      }
      expect(mockHttpPost).not.toHaveBeenCalled();
    });

    it('rejects a malformed escrowId containing "/" without making an HTTP call', async () => {
      const client = new DisputeClient({ apiBaseUrl: 'http://api', apiKey: 'tok' } as any);
      const result = await client.raiseDispute({
        escrowId: 'esc/123',
        reason: 'Goods not delivered on time',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/escrowId/);
      }
      expect(mockHttpPost).not.toHaveBeenCalled();
    });

    it('rejects a malformed escrowId containing "?" without making an HTTP call', async () => {
      const client = new DisputeClient({ apiBaseUrl: 'http://api', apiKey: 'tok' } as any);
      const result = await client.raiseDispute({
        escrowId: 'esc?123',
        reason: 'Goods not delivered on time',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/escrowId/);
      }
      expect(mockHttpPost).not.toHaveBeenCalled();
    });

    it('rejects a reason shorter than 10 characters without making an HTTP call', async () => {
      const client = new DisputeClient({ apiBaseUrl: 'http://api', apiKey: 'tok' } as any);
      const result = await client.raiseDispute({
        escrowId: 'esc-1',
        reason: 'Too short',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/at least 10 characters/);
      }
      expect(mockHttpPost).not.toHaveBeenCalled();
    });

    it('rejects a whitespace-only reason without making an HTTP call', async () => {
      const client = new DisputeClient({ apiBaseUrl: 'http://api', apiKey: 'tok' } as any);
      const result = await client.raiseDispute({
        escrowId: 'esc-1',
        reason: '          ',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/at least 10 characters/);
      }
      expect(mockHttpPost).not.toHaveBeenCalled();
    });
  });

  describe('getDispute', () => {
    it('returns typed dispute payload for valid escrowId (#471)', async () => {
      const mockDispute: Dispute = {
        id: 'dsp-1',
        escrowId: 'esc-1',
        reason: 'Milestone work not submitted',
        status: 'open',
        evidence: 'ipfs://QmEvidenceHash123',
      };
      mockHttpGet.mockResolvedValueOnce({ data: mockDispute });

      const client = new DisputeClient({ apiBaseUrl: 'http://api', apiKey: 'tok' } as any);
      const result = await client.getDispute('esc-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        const dispute: Dispute = result.data;
        expect(dispute.id).toBe('dsp-1');
        expect(dispute.status).toBe('open');
        expect(dispute.reason).toBe('Milestone work not submitted');
        expect(dispute.evidence).toBe('ipfs://QmEvidenceHash123');
      }
      expect(mockHttpGet).toHaveBeenCalledWith('/disputes/esc-1');
    });

    it('URL-encodes escrowId in getDispute endpoint', async () => {
      mockHttpGet.mockResolvedValueOnce({ data: { id: 'dsp-2', status: 'resolved' } });

      const client = new DisputeClient({ apiBaseUrl: 'http://api', apiKey: 'tok' } as any);
      const result = await client.getDispute('esc 100');

      expect(result.ok).toBe(true);
      expect(mockHttpGet).toHaveBeenCalledWith('/disputes/esc%20100');
    });

    it('rejects empty escrowId without making an HTTP call', async () => {
      const client = new DisputeClient({ apiBaseUrl: 'http://api', apiKey: 'tok' } as any);
      const result = await client.getDispute('');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/escrowId/);
      }
      expect(mockHttpGet).not.toHaveBeenCalled();
    });

    it('rejects malformed escrowId containing "/" without making an HTTP call', async () => {
      const client = new DisputeClient({ apiBaseUrl: 'http://api', apiKey: 'tok' } as any);
      const result = await client.getDispute('esc/123');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/escrowId/);
      }
      expect(mockHttpGet).not.toHaveBeenCalled();
    });

    it('rejects malformed escrowId containing "?" without making an HTTP call', async () => {
      const client = new DisputeClient({ apiBaseUrl: 'http://api', apiKey: 'tok' } as any);
      const result = await client.getDispute('esc?123');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/escrowId/);
      }
      expect(mockHttpGet).not.toHaveBeenCalled();
    });
  });
});
