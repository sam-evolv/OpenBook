import { describe, expect, it } from 'vitest';
import {
  StandingSlotCreateSchema,
  StandingSlotPatchSchema,
  ALL_DAYS_MASK,
} from '../../lib/standing-slots';

describe('StandingSlotCreateSchema', () => {
  const base = {
    business_id: '11111111-1111-1111-1111-111111111111',
    max_price_cents: 1500,
    day_mask: ALL_DAYS_MASK,
    time_start: '00:00',
    time_end: '23:59',
  };

  it('accepts a well-formed payload', () => {
    const r = StandingSlotCreateSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it('accepts service_id: null forward-compat field', () => {
    const r = StandingSlotCreateSchema.safeParse({ ...base, service_id: null });
    expect(r.success).toBe(true);
  });

  it('rejects time_start in the wrong shape', () => {
    const r = StandingSlotCreateSchema.safeParse({ ...base, time_start: '24:00' });
    expect(r.success).toBe(false);
  });

  it('rejects day_mask > 127', () => {
    const r = StandingSlotCreateSchema.safeParse({ ...base, day_mask: 200 });
    expect(r.success).toBe(false);
  });

  it('rejects max_price_cents above the ceiling', () => {
    const r = StandingSlotCreateSchema.safeParse({ ...base, max_price_cents: 2_000_000 });
    expect(r.success).toBe(false);
  });
});

describe('StandingSlotPatchSchema', () => {
  it('accepts partial updates', () => {
    expect(StandingSlotPatchSchema.safeParse({ active: false }).success).toBe(true);
    expect(StandingSlotPatchSchema.safeParse({ paused_until: null }).success).toBe(true);
    expect(
      StandingSlotPatchSchema.safeParse({ paused_until: '2026-05-13T10:00:00.000Z' }).success,
    ).toBe(true);
  });

  it('rejects unknown fields silently (zod default behaviour) — but enforces shape on declared ones', () => {
    const r = StandingSlotPatchSchema.safeParse({ time_start: 'not-a-time' });
    expect(r.success).toBe(false);
  });
});
