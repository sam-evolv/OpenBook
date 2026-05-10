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
  // Read-only against external state (DB + intent classifier).
  search_businesses: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },

  // Read-only profile/availability/promoted/status reads against the
  // OpenBook DB (external from ChatGPT's perspective).
  get_business_info: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
  get_availability: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
  check_booking_status: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
  get_promoted_inventory: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },

  // Writes that create new rows. None are destructive: holds expire after
  // 10 minutes, waitlist entries can be re-submitted or expire, feedback
  // can be edited via re-submission. All touch external state.
  hold_and_checkout: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  join_waitlist: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  record_post_booking_feedback: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
};

describe('TOOL_MANIFEST annotations', () => {
  it('contains exactly the eight Section-5 tools', () => {
    const names = TOOL_MANIFEST.map((t) => t.name).sort();
    expect(names).toEqual(Object.keys(EXPECTED).sort());
  });

  it('exposes exactly 8 tools (regression guard against debug tools sneaking back in)', () => {
    expect(TOOL_MANIFEST).toHaveLength(8);
  });

  it('no tool name starts with debug_', () => {
    for (const tool of TOOL_MANIFEST) {
      expect(tool.name.startsWith('debug_'), `tool ${tool.name} starts with debug_`).toBe(false);
    }
  });

  it('every tool has all three annotations defined as literal booleans', () => {
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

  it("no tool description contains the substring 'any intent' (OpenAI flags this as overly broad)", () => {
    for (const tool of TOOL_MANIFEST) {
      expect(
        tool.description.toLowerCase().includes('any intent'),
        `tool ${tool.name} description contains 'any intent'`,
      ).toBe(false);
    }
  });
});
