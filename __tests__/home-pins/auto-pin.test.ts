import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { autoPinAfterBooking } from '../../lib/home-pins';

/**
 * autoPinAfterBooking is the silent post-booking hook called from
 * /api/booking and /api/open-spots/[saleId]/claim. The booking is the
 * critical path; the auto-pin is best-effort. These tests pin down the
 * non-blocking contract: a Supabase error, or a thrown exception, must
 * not propagate to the caller.
 */

function makeClient(args: {
  onUpsert: (row: unknown, opts: unknown) => { error: unknown } | Error;
}): SupabaseClient {
  const fake = {
    from: vi.fn((_table: string) => ({
      upsert: vi.fn((row: unknown, opts: unknown) => {
        const result = args.onUpsert(row, opts);
        if (result instanceof Error) throw result;
        return Promise.resolve({ data: null, error: result.error });
      }),
    })),
  };
  return fake as unknown as SupabaseClient;
}

describe('autoPinAfterBooking', () => {
  it('calls upsert with the right row + onConflict options', async () => {
    let captured: { row: unknown; opts: unknown } | null = null;
    const sb = makeClient({
      onUpsert: (row, opts) => {
        captured = { row, opts };
        return { error: null };
      },
    });

    await autoPinAfterBooking(sb, {
      customerId: 'cust-1',
      businessId: 'biz-1',
    });

    expect(captured).not.toBeNull();
    expect(captured!.row).toEqual({
      customer_id: 'cust-1',
      business_id: 'biz-1',
    });
    expect(captured!.opts).toEqual({
      onConflict: 'customer_id,business_id',
      ignoreDuplicates: true,
    });
  });

  it('does NOT throw when the upsert returns a Supabase error', async () => {
    const sb = makeClient({
      onUpsert: () => ({ error: { message: 'rls violation' } }),
    });
    await expect(
      autoPinAfterBooking(sb, {
        customerId: 'cust-1',
        businessId: 'biz-1',
      }),
    ).resolves.toBeUndefined();
  });

  it('does NOT throw when the supabase client itself throws synchronously', async () => {
    const sb = makeClient({
      onUpsert: () => new Error('connection refused'),
    });
    await expect(
      autoPinAfterBooking(sb, {
        customerId: 'cust-1',
        businessId: 'biz-1',
      }),
    ).resolves.toBeUndefined();
  });
});
