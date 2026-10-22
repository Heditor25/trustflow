/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react';
import type { JurorClient } from '../src/juror/client';
import { useJuror } from '../src/hooks/useJuror';
import type {
  CastVoteParams,
  CastVoteResult,
  VoteCommitment,
  RevealVoteResult,
} from '../src/types/juror';

function makeJurorClient(overrides: Partial<JurorClient> = {}): JurorClient {
  return {
    vote: jest.fn(),
    createVoteCommitment: jest.fn(),
    revealVote: jest.fn(),
    ...overrides,
  } as unknown as JurorClient;
}

describe('useJuror', () => {
  it('initializes with loading false and error null', () => {
    const client = makeJurorClient();
    const { result } = renderHook(() => useJuror(client));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.vote).toBe('function');
    expect(typeof result.current.createVoteCommitment).toBe('function');
    expect(typeof result.current.revealVote).toBe('function');
  });

  describe('vote', () => {
    it('casts vote successfully and manages loading state', async () => {
      const voteResult: CastVoteResult = {
        txHash: 'tx-123',
        disputeId: 'dsp-1',
        jurorAddress: 'GJUROR',
        encrypted: false,
      };
      const voteMock = jest.fn().mockResolvedValue({ ok: true, data: voteResult });
      const client = makeJurorClient({ vote: voteMock });
      const { result } = renderHook(() => useJuror(client));

      const params: CastVoteParams = {
        disputeId: 'dsp-1',
        jurorAddress: 'GJUROR',
        vote: { encrypted: false, choice: 'approve' },
      };

      let res: any;
      await act(async () => {
        res = await result.current.vote(params);
      });

      expect(res).toEqual({ ok: true, data: voteResult });
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(voteMock).toHaveBeenCalledWith(params);
    });

    it('sets error state when vote returns ok: false', async () => {
      const voteMock = jest
        .fn()
        .mockResolvedValue({ ok: false, error: 'Dispute already resolved' });
      const client = makeJurorClient({ vote: voteMock });
      const { result } = renderHook(() => useJuror(client));

      const params: CastVoteParams = {
        disputeId: 'dsp-1',
        jurorAddress: 'GJUROR',
        vote: { encrypted: false, choice: 'approve' },
      };

      let res: any;
      await act(async () => {
        res = await result.current.vote(params);
      });

      expect(res).toEqual({ ok: false, error: 'Dispute already resolved' });
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Dispute already resolved');
    });

    it('handles unexpected rejections from client.vote', async () => {
      const voteMock = jest.fn().mockRejectedValue(new Error('RPC connection failed'));
      const client = makeJurorClient({ vote: voteMock });
      const { result } = renderHook(() => useJuror(client));

      const params: CastVoteParams = {
        disputeId: 'dsp-1',
        jurorAddress: 'GJUROR',
        vote: { encrypted: false, choice: 'approve' },
      };

      let res: any;
      await act(async () => {
        res = await result.current.vote(params);
      });

      expect(res).toEqual({ ok: false, error: 'RPC connection failed' });
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('RPC connection failed');
    });

    it('ignores stale result from earlier vote when overlapping calls occur', async () => {
      let resolveFirst: (val: any) => void = () => undefined;
      const voteMock = jest
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveFirst = resolve;
            }),
        )
        .mockResolvedValueOnce({
          ok: false,
          error: 'Second vote failed',
        });

      const client = makeJurorClient({ vote: voteMock });
      const { result } = renderHook(() => useJuror(client));

      let promise1: Promise<any>;
      let promise2: Promise<any>;
      act(() => {
        promise1 = result.current.vote({
          disputeId: 'dsp-1',
          jurorAddress: 'GJUROR',
          vote: { encrypted: false, choice: 'approve' },
        });
        promise2 = result.current.vote({
          disputeId: 'dsp-2',
          jurorAddress: 'GJUROR',
          vote: { encrypted: false, choice: 'reject' },
        });
      });

      await act(async () => {
        await promise2;
      });
      expect(result.current.error).toBe('Second vote failed');

      await act(async () => {
        resolveFirst({ ok: true, data: { txHash: 'tx-1' } });
        await promise1;
      });

      expect(result.current.error).toBe('Second vote failed');
    });
  });

  describe('createVoteCommitment', () => {
    it('creates commitment and resets error', async () => {
      const mockCommitment: VoteCommitment = {
        commitment: new Uint8Array(32),
        salt: new Uint8Array(32),
        commitmentHex: 'aabbcc',
        saltHex: '112233',
        ciphertext: 'base64ciphertext',
        voteForDepositor: true,
      };
      const createVoteCommitmentMock = jest.fn().mockReturnValue(mockCommitment);
      const client = makeJurorClient({ createVoteCommitment: createVoteCommitmentMock });
      const { result } = renderHook(() => useJuror(client));

      let commitment: any;
      await act(async () => {
        commitment = await result.current.createVoteCommitment(true);
      });

      expect(commitment).toEqual(mockCommitment);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(createVoteCommitmentMock).toHaveBeenCalledWith(true, undefined);
    });

    it('sets error and throws when createVoteCommitment fails', async () => {
      const client = makeJurorClient({
        createVoteCommitment: jest.fn().mockImplementation(() => {
          throw new Error('Salt must be exactly 32 bytes');
        }),
      });
      const { result } = renderHook(() => useJuror(client));

      await act(async () => {
        await expect(
          result.current.createVoteCommitment(true, new Uint8Array(10)),
        ).rejects.toThrow('Salt must be exactly 32 bytes');
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Salt must be exactly 32 bytes');
    });
  });

  describe('revealVote', () => {
    it('reveals vote successfully and resets error', async () => {
      const mockReveal: RevealVoteResult = {
        voteForDepositor: true,
        voteByte: 1,
        salt: new Uint8Array(32),
        saltHex: '112233',
        commitment: new Uint8Array(32),
        commitmentHex: 'aabbcc',
      };
      const revealVoteMock = jest.fn().mockReturnValue(mockReveal);
      const client = makeJurorClient({ revealVote: revealVoteMock });
      const { result } = renderHook(() => useJuror(client));

      let reveal: any;
      const salt = new Uint8Array(32);
      await act(async () => {
        reveal = await result.current.revealVote(true, salt);
      });

      expect(reveal).toEqual(mockReveal);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(revealVoteMock).toHaveBeenCalledWith(true, salt);
    });

    it('sets error and throws when revealVote fails', async () => {
      const client = makeJurorClient({
        revealVote: jest.fn().mockImplementation(() => {
          throw new Error('Salt must be exactly 32 bytes');
        }),
      });
      const { result } = renderHook(() => useJuror(client));

      await act(async () => {
        await expect(
          result.current.revealVote(true, new Uint8Array(16)),
        ).rejects.toThrow('Salt must be exactly 32 bytes');
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Salt must be exactly 32 bytes');
    });
  });
});
