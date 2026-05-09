// Last-resort search for `search_businesses` when the intent classifier
// degrades to category="other" or the primary candidate query fails.
//
// Strategy (per docs/mcp-server-spec.md and the spec amendments in this PR):
//   1. extract content keywords from intent + location (drop stopwords).
//   2. ilike them against businesses.category and businesses.city.
//   3. if step 2 returns nothing, ilike them against businesses.name and
//      businesses.description.
//   4. if step 3 also returns nothing, return an empty result set with a
//      helpful note. Never return an error-shaped response — agentic clients
//      treat tool errors as "this tool is broken, try a different approach".

const STOPWORDS = new Set([
  'a', 'an', 'and', 'any', 'are', 'around', 'at', 'be', 'best', 'book',
  'booking', 'by', 'can', 'find', 'for', 'get', 'good', 'help', 'i', 'in',
  'is', 'it', 'looking', 'me', 'my', 'near', 'nearby', 'need', 'of', 'on',
  'or', 'place', 'places', 'please', 'show', 'some', 'something', 'spot',
  'spots', 'the', 'there', 'thing', 'things', 'to', 'today', 'tomorrow',
  'want', 'wanted', 'we', 'with', 'would', 'you',
]);

export function extractKeywords(intent: string, location?: string): string[] {
  const text = `${intent} ${location ?? ''}`.toLowerCase();
  const tokens = text.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    if (t.length < 3) continue;
    if (STOPWORDS.has(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

export function escapeIlikePattern(keyword: string): string {
  // Supabase .or() uses comma + dot syntax; keywords flow into PostgREST
  // ilike values where %,% and parentheses can break the parser. We
  // tokenise to alphanumerics in extractKeywords above, but be defensive.
  return keyword.replace(/[%_,()]/g, '');
}

export function buildOrFilter(columns: string[], keywords: string[]): string {
  const parts: string[] = [];
  for (const k of keywords) {
    const safe = escapeIlikePattern(k);
    if (!safe) continue;
    for (const col of columns) {
      parts.push(`${col}.ilike.%${safe}%`);
    }
  }
  return parts.join(',');
}
