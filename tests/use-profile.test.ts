/** @jest-environment jsdom */
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ProfileClient } from '../src/profile/client';
import { useProfile } from '../src/hooks/useProfile';
import type { Profile } from '../src/types/profile';

function makeClient(
  getProfile: jest.Mock,
  updateProfile: jest.Mock = jest.fn(),
): ProfileClient {
  return { getProfile, updateProfile } as unknown as ProfileClient;
}

const MOCK_PROFILE: Profile = {
  address: 'GA',
  displayName: 'Alice',
  bio: 'Software engineer',
};

describe('useProfile', () => {
  it('does not fetch and returns a null profile when address is null or undefined', () => {
    const getProfile = jest.fn();
    const { result } = renderHook(() => useProfile(makeClient(getProfile), null));

    expect(getProfile).not.toHaveBeenCalled();
    expect(result.current.profile).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('is loading until the profile resolves, then exposes it', async () => {
    const getProfile = jest.fn().mockResolvedValue({ ok: true, data: MOCK_PROFILE });
    const client = makeClient(getProfile);
    const { result } = renderHook(() => useProfile(client, 'GA'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getProfile).toHaveBeenCalledWith('GA');
    expect(result.current.profile).toEqual(MOCK_PROFILE);
    expect(result.current.error).toBeNull();
  });

  it('exposes the error message when getProfile returns ok: false', async () => {
    const getProfile = jest
      .fn()
      .mockResolvedValue({ ok: false, error: 'Profile not found' });
    const client = makeClient(getProfile);
    const { result } = renderHook(() => useProfile(client, 'GA'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Profile not found');
    expect(result.current.profile).toBeNull();
  });

  it('exposes the error message when getProfile rejects', async () => {
    const getProfile = jest.fn().mockRejectedValue(new Error('Network error'));
    const client = makeClient(getProfile);
    const { result } = renderHook(() => useProfile(client, 'GA'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Network error');
    expect(result.current.profile).toBeNull();
  });

  it('refetches and resets state when the address changes', async () => {
    const profileB: Profile = { address: 'GB', displayName: 'Bob' };
    const getProfile = jest.fn().mockImplementation(async (addr: string) => {
      if (addr === 'GA') return { ok: true, data: MOCK_PROFILE };
      return { ok: true, data: profileB };
    });
    const client = makeClient(getProfile);
    const { result, rerender } = renderHook(
      ({ address }) => useProfile(client, address),
      {
        initialProps: { address: 'GA' as string | null },
      },
    );

    await waitFor(() => expect(result.current.profile).toEqual(MOCK_PROFILE));

    rerender({ address: 'GB' });

    await waitFor(() => expect(result.current.profile).toEqual(profileB));
    expect(getProfile).toHaveBeenCalledTimes(2);
    expect(getProfile).toHaveBeenLastCalledWith('GB');
  });

  it('clears profile and error when the address becomes null', async () => {
    const getProfile = jest.fn().mockResolvedValue({ ok: true, data: MOCK_PROFILE });
    const client = makeClient(getProfile);
    const { result, rerender } = renderHook(
      ({ address }) => useProfile(client, address),
      {
        initialProps: { address: 'GA' as string | null },
      },
    );

    await waitFor(() => expect(result.current.profile).toEqual(MOCK_PROFILE));

    rerender({ address: null });

    await waitFor(() => expect(result.current.profile).toBeNull());
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(getProfile).toHaveBeenCalledTimes(1);
  });

  it('ignores a stale response after the address changed', async () => {
    let resolveFirst: (value: { ok: boolean; data: Profile }) => void = () => undefined;
    const profileB: Profile = { address: 'GB', displayName: 'Bob' };
    const getProfile = jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<{ ok: boolean; data: Profile }>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce({ ok: true, data: profileB });

    const client = makeClient(getProfile);
    const { result, rerender } = renderHook(
      ({ address }) => useProfile(client, address),
      {
        initialProps: { address: 'GA' as string | null },
      },
    );

    rerender({ address: 'GB' });
    await waitFor(() => expect(result.current.profile).toEqual(profileB));

    resolveFirst({ ok: true, data: MOCK_PROFILE });
    await Promise.resolve();

    expect(result.current.profile).toEqual(profileB);
  });

  it('does not update state when unmounted before resolution', async () => {
    let resolveProfile: (value: { ok: boolean; data: Profile }) => void = () => undefined;
    const getProfile = jest.fn().mockReturnValue(
      new Promise<{ ok: boolean; data: Profile }>((resolve) => {
        resolveProfile = resolve;
      }),
    );
    const client = makeClient(getProfile);
    const { result, unmount } = renderHook(() => useProfile(client, 'GA'));

    unmount();
    resolveProfile({ ok: true, data: MOCK_PROFILE });
    await Promise.resolve();

    expect(result.current.profile).toBeNull();
  });

  describe('update', () => {
    it('updates profile and sets state on success', async () => {
      const getProfile = jest.fn().mockResolvedValue({ ok: true, data: MOCK_PROFILE });
      const updatedProfile: Profile = { ...MOCK_PROFILE, displayName: 'Alice Updated' };
      const updateProfile = jest
        .fn()
        .mockResolvedValue({ ok: true, data: updatedProfile });
      const client = makeClient(getProfile, updateProfile);

      const { result } = renderHook(() => useProfile(client, 'GA'));
      await waitFor(() => expect(result.current.profile).toEqual(MOCK_PROFILE));

      let updateRes: any;
      await act(async () => {
        updateRes = await result.current.update({ displayName: 'Alice Updated' });
      });

      expect(updateRes).toEqual({ ok: true, data: updatedProfile });
      expect(result.current.profile).toEqual(updatedProfile);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(updateProfile).toHaveBeenCalledWith('GA', { displayName: 'Alice Updated' });
    });

    it('sets error when update fails', async () => {
      const getProfile = jest.fn().mockResolvedValue({ ok: true, data: MOCK_PROFILE });
      const updateProfile = jest
        .fn()
        .mockResolvedValue({ ok: false, error: 'Update failed' });
      const client = makeClient(getProfile, updateProfile);

      const { result } = renderHook(() => useProfile(client, 'GA'));
      await waitFor(() => expect(result.current.profile).toEqual(MOCK_PROFILE));

      let updateRes: any;
      await act(async () => {
        updateRes = await result.current.update({ displayName: 'Alice New' });
      });

      expect(updateRes).toEqual({ ok: false, error: 'Update failed' });
      expect(result.current.error).toBe('Update failed');
      expect(result.current.profile).toEqual(MOCK_PROFILE);
    });

    it('returns error when update is called without an address', async () => {
      const client = makeClient(jest.fn(), jest.fn());
      const { result } = renderHook(() => useProfile(client, null));

      let updateRes: any;
      await act(async () => {
        updateRes = await result.current.update({ displayName: 'Test' });
      });

      expect(updateRes.ok).toBe(false);
      expect(updateRes.error).toContain('Address is required');
      expect(result.current.error).toContain('Address is required');
    });

    it('ignores stale update response when overlapping calls occur', async () => {
      const getProfile = jest.fn().mockResolvedValue({ ok: true, data: MOCK_PROFILE });
      let resolveFirst: (val: any) => void = () => undefined;
      const updateProfile = jest
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveFirst = resolve;
            }),
        )
        .mockResolvedValueOnce({
          ok: true,
          data: { ...MOCK_PROFILE, displayName: 'Second' },
        });

      const client = makeClient(getProfile, updateProfile);
      const { result } = renderHook(() => useProfile(client, 'GA'));
      await waitFor(() => expect(result.current.profile).toEqual(MOCK_PROFILE));

      let promise1: Promise<any>;
      let promise2: Promise<any>;
      act(() => {
        promise1 = result.current.update({ displayName: 'First' });
        promise2 = result.current.update({ displayName: 'Second' });
      });

      await act(async () => {
        await promise2;
      });
      expect(result.current.profile?.displayName).toBe('Second');

      await act(async () => {
        resolveFirst({ ok: true, data: { ...MOCK_PROFILE, displayName: 'First' } });
        await promise1;
      });

      expect(result.current.profile?.displayName).toBe('Second');
    });
  });
});
