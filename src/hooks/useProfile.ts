import { useState, useEffect, useCallback, useRef } from 'react';
import type { ProfileClient } from '../profile/client';
import type { Profile, UpdateProfileParams } from '../types/profile';
import type { SDKResult } from '../types/index';

export function useProfile(profileClient: ProfileClient, address?: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const callIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setProfile(null);
    setError(null);

    if (!address) {
      setLoading(false);
      return;
    }

    setLoading(true);
    profileClient
      .getProfile(address)
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setProfile(res.data);
          setError(null);
        } else {
          setError(res.error);
          setProfile(null);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setProfile(null);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [profileClient, address]);

  const update = useCallback(
    async (params: UpdateProfileParams): Promise<SDKResult<Profile>> => {
      if (!address) {
        const err = 'Address is required to update profile';
        setError(err);
        return { ok: false, error: err };
      }
      const callId = ++callIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const result = await profileClient.updateProfile(address, params);
        if (callId === callIdRef.current) {
          if (result.ok) {
            setProfile(result.data);
            setError(null);
          } else {
            setError(result.error);
          }
        }
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
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
    [profileClient, address],
  );

  return { profile, loading, error, update };
}
