import { describe, it, expect, vi } from 'vitest';
import { eventBus } from '../services/eventBus';

describe('event-bus', () => {
  it('fires handler with correct detail', () => {
    const handler = vi.fn();
    const unsub = eventBus.on('tenant:changed', handler);
    eventBus.emit('tenant:changed', { tenantId: 'abc' });
    expect(handler).toHaveBeenCalledWith({ tenantId: 'abc' });
    unsub();
  });

  it('unsubscribe stops handler', () => {
    const handler = vi.fn();
    const unsub = eventBus.on('sync:completed', handler);
    unsub();
    eventBus.emit('sync:completed', { module: 'hr' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('once fires exactly once', () => {
    const handler = vi.fn();
    eventBus.once('payment:processed', handler);
    eventBus.emit('payment:processed', { paymentId: 'p1', amount: 100 });
    eventBus.emit('payment:processed', { paymentId: 'p2', amount: 200 });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('multiple listeners on same event', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    const u1 = eventBus.on('crm:deal-updated', h1);
    const u2 = eventBus.on('crm:deal-updated', h2);
    eventBus.emit('crm:deal-updated', { dealId: 'd1', stage: 'quote' });
    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
    u1(); u2();
  });
});
