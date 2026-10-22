import { trackAndDestroyOnAbort, destroyAllPoolAgents, registerPoolAgent } from '../src/utils/connection-pool';

describe('Connection pool abort socket cleanup (Issue #359)', () => {
  it('destroys underlying socket when request is aborted', () => {
    const destroyMock = jest.fn();
    const fakeSocket = { destroy: destroyMock };
    const controller = new AbortController();

    trackAndDestroyOnAbort(fakeSocket, controller.signal);
    expect(destroyMock).not.toHaveBeenCalled();

    controller.abort();
    expect(destroyMock).toHaveBeenCalledTimes(1);
  });

  it('destroys socket immediately if signal is already aborted', () => {
    const destroyMock = jest.fn();
    const fakeSocket = { destroy: destroyMock };
    const controller = new AbortController();
    controller.abort();

    trackAndDestroyOnAbort(fakeSocket, controller.signal);
    expect(destroyMock).toHaveBeenCalledTimes(1);
  });

  it('destroys sockets cleanly after 50 aborted requests without leakage', () => {
    const sockets = Array.from({ length: 50 }, () => ({
      destroy: jest.fn(),
    }));

    sockets.forEach((s) => {
      const controller = new AbortController();
      trackAndDestroyOnAbort(s, controller.signal);
      controller.abort();
    });

    sockets.forEach((s) => {
      expect(s.destroy).toHaveBeenCalledTimes(1);
    });
  });

  it('destroys all active pool agents on disconnect', () => {
    const agent = { destroy: jest.fn() };
    registerPoolAgent(agent as any);
    destroyAllPoolAgents();
    expect(agent.destroy).toHaveBeenCalledTimes(1);
  });
});
