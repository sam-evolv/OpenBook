import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveOrCreateCustomer } from '../../lib/customers/resolve';

type LookupResult = { data: unknown; error: unknown };

let lookupResult: LookupResult = { data: [], error: null };
let insertResult: LookupResult = { data: { id: 'cust-new' }, error: null };
let lastInsertValues: Record<string, unknown> | null = null;

function makeClient(): SupabaseClient {
  const selectChain: Record<string, unknown> = {};
  selectChain.select = vi.fn(() => selectChain);
  selectChain.eq = vi.fn(() => selectChain);
  selectChain.order = vi.fn(() => selectChain);
  selectChain.limit = vi.fn(() => selectChain);
  (selectChain as { then: (r: (v: unknown) => void) => void }).then = (
    resolve: (v: unknown) => void,
  ) => resolve(lookupResult);

  const insertChain: Record<string, unknown> = {};
  insertChain.select = vi.fn(() => insertChain);
  insertChain.single = vi.fn(async () => insertResult);

  const fakeClient = {
    from: vi.fn(() => ({
      select: vi.fn(() => selectChain),
      insert: vi.fn((values: Record<string, unknown>) => {
        lastInsertValues = values;
        return insertChain;
      }),
    })),
  };

  return fakeClient as unknown as SupabaseClient;
}

beforeEach(() => {
  lookupResult = { data: [], error: null };
  insertResult = { data: { id: 'cust-new' }, error: null };
  lastInsertValues = null;
});

describe('resolveOrCreateCustomer', () => {
  it('inserts when email present and no rows match', async () => {
    lookupResult = { data: [], error: null };
    const sb = makeClient();

    const result = await resolveOrCreateCustomer(sb, {
      email: 'a@b.com',
      fullName: 'Niamh',
      phone: '0851234567',
    });

    expect(result).toEqual({ id: 'cust-new', was_created: true });
    expect(lastInsertValues).toEqual({
      email: 'a@b.com',
      full_name: 'Niamh',
      name: 'Niamh',
      phone: '0851234567',
    });
  });

  it('returns the existing row when email present and one row matches', async () => {
    lookupResult = {
      data: [{ id: 'cust-1', created_at: '2024-01-01T00:00:00Z' }],
      error: null,
    };
    const sb = makeClient();

    const result = await resolveOrCreateCustomer(sb, {
      email: 'a@b.com',
      fullName: 'Niamh',
    });

    expect(result).toEqual({ id: 'cust-1', was_created: false });
    expect(lastInsertValues).toBeNull();
  });

  it('returns the newest row when email present and multiple rows match', async () => {
    // The lookup orders by created_at DESC and limits to 1, so the helper
    // sees only the newest row. This test pins that contract: even if the
    // mock returned more than one row, the helper picks data[0].
    lookupResult = {
      data: [
        { id: 'cust-newest', created_at: '2025-05-01T00:00:00Z' },
        { id: 'cust-older', created_at: '2024-01-01T00:00:00Z' },
      ],
      error: null,
    };
    const sb = makeClient();

    const result = await resolveOrCreateCustomer(sb, {
      email: 'sam@evolvai.ie',
      fullName: 'Sam',
    });

    expect(result).toEqual({ id: 'cust-newest', was_created: false });
    expect(lastInsertValues).toBeNull();
  });

  it('inserts an anonymous row when email is null', async () => {
    insertResult = { data: { id: 'cust-anon' }, error: null };
    const sb = makeClient();

    const result = await resolveOrCreateCustomer(sb, {
      email: null,
      fullName: null,
      phone: null,
    });

    expect(result).toEqual({ id: 'cust-anon', was_created: true });
    expect(lastInsertValues).toEqual({
      email: null,
      full_name: null,
      name: null,
      phone: null,
    });
  });

  it('rethrows when lookup returns a DB error', async () => {
    lookupResult = {
      data: null,
      error: { code: '42P01', message: 'relation does not exist' },
    };
    const sb = makeClient();

    await expect(
      resolveOrCreateCustomer(sb, { email: 'a@b.com', fullName: 'X' }),
    ).rejects.toMatchObject({ code: '42P01' });
    expect(lastInsertValues).toBeNull();
  });

  it('rethrows when insert returns a DB error', async () => {
    lookupResult = { data: [], error: null };
    insertResult = {
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    };
    const sb = makeClient();

    await expect(
      resolveOrCreateCustomer(sb, { email: 'a@b.com', fullName: 'X' }),
    ).rejects.toMatchObject({ code: '23505' });
  });
});
