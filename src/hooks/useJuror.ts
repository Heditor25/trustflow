import { useState, useCallback, useRef } from 'react';
import type { JurorClient } from '../juror/client';
import type {
  CastVoteParams,
  CastVoteResult,
  VoteCommitment,
  RevealVoteResult,
} from '../types/juror';
import type { SDKResult } from '../types/index';

export function useJuror(jurorClient: JurorClient) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const callIdRef = useRef(0);

  const vote = useCallback(
    async (params: CastVoteParams): Promise<SDKResult<CastVoteResult>> => {
      const callId = ++callIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const result = await jurorClient.vote(params);
        if (callId === callIdRef.current) {
          if (!result.ok) {
            setError(result.error);
          }
        }
        return result;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (callId === callIdRef.current) {
          setError(msg);
        }
        return { ok: false, error: msg };
      } finally {
        if (callId === callIdRef.current) {
          setLoading(false);
        }
      }
    },
    [jurorClient],
  );

  const createVoteCommitment = useCallback(
    async (voteForDepositor: boolean, salt?: Uint8Array): Promise<VoteCommitment> => {
      const callId = ++callIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const commitment = jurorClient.createVoteCommitment(voteForDepositor, salt);
        return commitment;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (callId === callIdRef.current) {
          setError(msg);
        }
        throw e;
      } finally {
        if (callId === callIdRef.current) {
          setLoading(false);
        }
      }
    },
    [jurorClient],
  );

  const revealVote = useCallback(
    async (voteForDepositor: boolean, salt: Uint8Array): Promise<RevealVoteResult> => {
      const callId = ++callIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const result = jurorClient.revealVote(voteForDepositor, salt);
        return result;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (callId === callIdRef.current) {
          setError(msg);
        }
        throw e;
      } finally {
        if (callId === callIdRef.current) {
          setLoading(false);
        }
      }
    },
    [jurorClient],
  );

  return { loading, error, vote, createVoteCommitment, revealVote };
}
