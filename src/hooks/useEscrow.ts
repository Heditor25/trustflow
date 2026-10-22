import { useState, useCallback, useRef } from 'react';
import type { TrustFlowClient } from '../client';
import type { Escrow, CreateEscrowParams } from '../types';
import { createEscrow, releaseEscrow, cancelEscrow, getEscrow, disputeEscrow } from '../escrow';

export function useEscrow(client: TrustFlowClient) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [escrow, setEscrow] = useState<Escrow | null>(null);
  const callIdRef = useRef(0);

  const create = useCallback(
    async (params: CreateEscrowParams) => {
      const callId = ++callIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const e = await createEscrow(client, params);
        if (callId === callIdRef.current) {
          setEscrow(e);
        }
        return e;
      } catch (e: unknown) {
        if (callId === callIdRef.current) {
          setError(e instanceof Error ? e.message : String(e));
        }
        throw e;
      } finally {
        if (callId === callIdRef.current) {
          setLoading(false);
        }
      }
    },
    [client],
  );

  const release = useCallback(
    async (escrowId: string, caller: string) => {
      const callId = ++callIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const result = await releaseEscrow(client, { escrowId, caller });
        return result;
      } catch (e: unknown) {
        if (callId === callIdRef.current) {
          setError(e instanceof Error ? e.message : String(e));
        }
        throw e;
      } finally {
        if (callId === callIdRef.current) {
          setLoading(false);
        }
      }
    },
    [client],
  );

  const cancel = useCallback(
    async (escrowId: string, caller: string) => {
      const callId = ++callIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const result = await cancelEscrow(client, escrowId, caller);
        return result;
      } catch (e: unknown) {
        if (callId === callIdRef.current) {
          setError(e instanceof Error ? e.message : String(e));
        }
        throw e;
      } finally {
        if (callId === callIdRef.current) {
          setLoading(false);
        }
      }
    },
    [client],
  );

  const dispute = useCallback(
    async (escrowId: string, caller: string, reason: string) => {
      const callId = ++callIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const result = await disputeEscrow(client, { escrowId, caller, reason });
        return result;
      } catch (e: unknown) {
        if (callId === callIdRef.current) {
          setError(e instanceof Error ? e.message : String(e));
        }
        throw e;
      } finally {
        if (callId === callIdRef.current) {
          setLoading(false);
        }
      }
    },
    [client],
  );

  const refresh = useCallback(
    async (escrowId: string) => {
      const callId = ++callIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const e = (await getEscrow(client, escrowId)) as Escrow | null;
        if (callId === callIdRef.current) {
          setEscrow(e);
        }
        return e;
      } catch (e: unknown) {
        if (callId === callIdRef.current) {
          setError(e instanceof Error ? e.message : String(e));
        }
        throw e;
      } finally {
        if (callId === callIdRef.current) {
          setLoading(false);
        }
      }
    },
    [client],
  );

  return { escrow, loading, error, create, release, cancel, dispute, refresh };
}
