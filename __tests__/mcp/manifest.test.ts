// Manifest annotations are the #1 reviewer-rejection cause for the
// ChatGPT App Directory and Claude Connectors Directory. This test
// pins the canonical classification per tool so future additions
// can't ship without an explicit, correct entry.
//
// If a future PR changes a handler's behaviour (e.g. adds an OpenAI
// call to a previously DB-only handler, or makes a write irreversible),
// it must update both the handler AND this table — and that change
// will be visible in code review.

import { describe, expect, it } from 'vitest';
import { TOOL_MANIFEST } from '../../lib/mcp/manifest';

const EXPECTED: Record<
  string,
  { readOnlyHint: boolean; destructiveHint: boolean; openWorldHint: boolean }
> = {
  // Calls OpenAI for intent classification → openWorldHint true.
  search_businesses: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },

  // Pure Supabase reads.
  get_business_info: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  get_availability: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },

  // Creates booking + hold rows (destructive: hard to undo cleanly,
  // returns a Stripe checkout URL the user is meant to act on); the URL
  // itself reaches an external payment provider → openWorldHint true.
  hold_and_checkout: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },

  // Pure Supabase read.
  check_booking_status: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },

  // Inserts a row but is reversible by re-submission and naturally expires;
  // PR #118 deferred SMS to v1.1, so the handler currently makes no
  // external calls.
  join_waitlist: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },

  // Pure Supabase reads + the existing get_availability_for_ai RPC; no
  // external services from THIS tool's call site (the simplified ranker
  // intentionally skips the OpenAI intent-classifier — see PR #122).
  get_promoted_inventory: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },

  // Upserts a feedback row + optional guarded outcome update; reversible
  // via re-submission to the same tool. No external calls.
  record_post_booking_feedback: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
};

describe('TOOL_MANIFEST annotations', () => {
  it('contains exactly the eight Section-5 tools', () => {
    const names = TOOL_MANIFEST.map((t) => t.name).sort();
    expect(names).toEqual(Object.keys(EXPECTED).sort());
  });

  it('every tool has all three annotations defined as booleans', () => {
    for (const tool of TOOL_MANIFEST) {
      expect(tool.annotations, `tool ${tool.name} has annotations`).toBeDefined();
      expect(typeof tool.annotations.readOnlyHint).toBe('boolean');
      expect(typeof tool.annotations.destructiveHint).toBe('boolean');
      expect(typeof tool.annotations.openWorldHint).toBe('boolean');
    }
  });

  it('per-tool annotations match the canonical table exactly', () => {
    for (const tool of TOOL_MANIFEST) {
      const expected = EXPECTED[tool.name];
      expect(tool.annotations, `unexpected tool: ${tool.name}`).toEqual(expected);
    }
  });

  it('readOnlyHint and destructiveHint cannot both be true', () => {
    // A read-only tool can't also be destructive — they're contradictory.
    // Caught here rather than relying on a reviewer to spot the error.
    for (const tool of TOOL_MANIFEST) {
      const a = tool.annotations;
      const both = a.readOnlyHint && a.destructiveHint;
      expect(both, `tool ${tool.name} cannot be both readOnlyHint and destructiveHint`).toBe(false);
    }
  });

  it('every tool exposes name, description, inputSchema, annotations (the four required directory fields)', () => {
    for (const tool of TOOL_MANIFEST) {
      expect(typeof tool.name).toBe('string');
      expect(tool.name.length).toBeGreaterThan(0);
      expect(typeof tool.description).toBe('string');
      expect(tool.description.length).toBeGreaterThan(20);
      expect(typeof tool.inputSchema).toBe('object');
      expect(tool.inputSchema).not.toBeNull();
      expect(typeof tool.annotations).toBe('object');
    }
  });
});
