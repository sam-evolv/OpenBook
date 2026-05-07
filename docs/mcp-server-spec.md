# OpenBook MCP Server — Technical & Product Specification
**Status:** Draft v1.1
**Owner:** Sam Donworth
**Audience:** Engineering, design, partnerships, future hires
**Last updated:** 2026-05-07
---
## 0. Executive summary
OpenBook is building the registry that makes Irish small businesses bookable, addressable, and ongoing-context-aware from inside every major AI assistant — ChatGPT, Claude, Gemini, Siri, and whatever comes next. This document specifies the Model Context Protocol (MCP) server that delivers that capability.
The product thesis in one sentence: **OpenBook is a small business's passport to becoming discoverable, bookable, and continuously useful inside AI assistants.**
The user thesis in one flow: a person says "I'm in Galway tomorrow afternoon, find me a barber" to ChatGPT, gets three real recommendations with real availability and real prices, taps once, completes payment in their browser, and arrives at a confirmed appointment. The next day the assistant proactively reminds them, suggests a route, and afterwards asks how it went. End-to-end in under sixty seconds for the booking, but the relationship continues for as long as it's useful.
The strategic insight that distinguishes this product: with the agentic follow-up loop, OpenBook is **not a booking platform with an MCP server bolted on.** It's an AI-native two-sided marketplace where the assistant is the runtime. Customers don't "use OpenBook" — they have an ongoing relationship with their assistant, and OpenBook is what makes that assistant capable of acting on local services. Businesses don't "list on OpenBook" — they make their inventory addressable to every assistant their customers use. The platform itself is mostly invisible to both sides, and that's exactly the point.
This spec defines what we build, how it works, why each decision was made, and what "world-class" looks like for every surface. It is written to the standard of an internal engineering document at a company that takes its craft seriously — Booking.com, Stripe, Linear. It assumes no prior context.
---
## 1. Why this product exists
### 1.1 The shift in distribution
For twenty years, small local businesses competed for visibility inside Google's blue links and Maps. The discovery layer was a search engine. People typed keywords and got websites; the best-optimised websites won.
That layer is being replaced. Increasingly, people no longer search — they ask. They ask ChatGPT for recommendations, ask Claude to plan a day in a new city, ask Siri to book the appointment, ask Gemini to find a service nearby. The answer is no longer a list of links: it is a synthesised, conversational reply with a small number of named options, often executed without the user ever leaving the assistant.
Whoever controls the answer layer for local services controls the next decade of small business distribution. There is no incumbent. Google has the data but not the AI distribution; OpenAI has the distribution but no booking infrastructure for Irish SMBs; Booking.com is hospitality-focused; ResDiary, Mindbody, Fresha, Booksy are vertical-specific and still designed for the old web — websites, mobile apps, search ads.
OpenBook's wedge is to be the first horizontal, AI-native, assistant-agnostic booking registry for Ireland — and then for any market that resembles Ireland.
### 1.2 Why MCP, why now
The Model Context Protocol is the open standard, originally specified by Anthropic, that all major AI labs have aligned on. ChatGPT's "Apps" (formerly Connectors) speak MCP. Claude's connector directory speaks MCP. Gemini's tooling is moving toward MCP support. Apple's App Intents framework is converging on the same pattern of LLM-callable structured tools, and Apple Intelligence's evolved Siri will integrate with it as the surface stabilises. One protocol-compliant server is queryable across every major assistant, present and future.
Building an MCP server in 2026 is the equivalent of registering a domain in 1996, building an iOS app in 2009, or shipping a Slack integration in 2015. The platforms are wide open, the directories are accepting submissions, and almost no Irish businesses are present. First-mover advantage is real and decays fast.
### 1.3 What this means for small businesses
The OpenBook pitch to a gym, salon, or barber owner becomes:
> Today, when someone in your area asks ChatGPT, Claude, or Siri to find them a personal trainer, a barber, a yoga class — your business is not the answer. We make it the answer. One tap. Real availability. Direct booking. No commission. And after the booking, the assistant keeps your customer engaged with reminders, follow-ups, rebookings — keeping you top of mind without a single email open.
This is a categorically different value proposition from "yet another booking system." It is distribution, discovery, and retention, rolled into one. The MCP server is the mechanism that delivers all three.
### 1.4 What changed from v1.0 of this spec
The v1.0 draft scoped a four-tool MCP server with a link-out checkout flow. It was correct but conservative. v1.1 adds four capabilities that change the strategic shape of the product:
1. **Agentic follow-up loop** — the assistant remains involved after the booking, enabling reminders, route suggestions, post-booking feedback collection, and rebooking — none of which any other booking platform can do.
2. **Conversation context pre-fill** — preferences, constraints, and personal context surfaced anywhere in the conversation flow into the booking automatically.
3. **Waitlist primitive** — when a slot isn't available, users can hold their preferred time and get notified when it opens.
4. **Promoted inventory (gap-filling + flash sales unified)** — businesses with open capacity can surface that capacity to assistants and to consumer-app push notifications via one mechanism.
These are folded throughout the document, not relegated to a section.
---
## 2. Product principles
These are non-negotiable. Every design decision in this spec derives from one or more of them.
**Principle 1 — Anonymous-first.** A user inside ChatGPT, Claude, or Siri has no OpenBook account, no prior relationship with us, and no patience for one. The entire flow must work for a complete stranger who has never heard the word "OpenBook" before they tap a link. Authentication is optional and additive, never required.
**Principle 2 — The handoff is the feature, the loop back is the moat.** OpenAI does not currently allow digital services to transact inside ChatGPT. We do not fight this; we celebrate it. The browser handoff is engineered to feel premium, fast, and inevitable. But what happens *after* the handoff — the assistant confirming, reminding, following up, asking how it went, suggesting a rebook — is what no other booking platform can do, and is where defensibility lives.
**Principle 3 — Speed is the brand.** From the moment the assistant returns options to the moment the booking is confirmed, target end-to-end time is under sixty seconds on a modern phone over 4G. Every layer is optimised toward this number. If a feature adds friction, it does not ship.
**Principle 4 — The business is white-labelled, OpenBook is invisible.** The customer is booking Evolv Performance, not OpenBook. The checkout page shows Evolv's brand. The confirmation email is from Evolv. The calendar invite is from Evolv. OpenBook is plumbing — recognised by businesses, invisible to consumers.
**Principle 5 — Integrity over volume.** We will reject paid-placement, hidden-ranking, and dark-pattern requests even when they would generate revenue. The directory's value to consumers depends entirely on the trustworthiness of its answers. Once we lose that, we lose everything.
**Principle 6 — Assistant-agnostic by design.** We build to the open MCP spec first. Every vendor-specific concession (OpenAI's CSP requirements, Anthropic's dual callback URLs, Apple's App Intents adapter, Gemini's eventual quirks) is layered on top of a clean core. Tool descriptions are written for an assistant that might be voice-only, screen-only, or both. We do not couple to any single LLM, any single modality, or any single device.
**Principle 7 — Every tool serves both surfaces.** A tool isn't just a search-and-book primitive — it's also a conduit for context. Pre-fill flows from conversation into checkout. Outcome data flows from booking back into the assistant's working memory. Inventory signals flow from the business into the assistant's recommendations. Every tool we ship moves data in both directions.
**Principle 8 — Observability is not optional.** Every tool call is logged with arguments, results, latency, the assistant that made it, and the eventual outcome (booking confirmed, abandoned, errored). We cannot improve what we cannot see.
---
## 3. The user journeys we are designing for
These are not wireframes. They are the lived experiences we are committing to deliver. Each illustrates a different capability and together they exercise every tool.
### 3.1 Journey A — "Book me a PT tonight in Dublin"
Niamh is a 32-year-old marketing manager in Dublin. It's 4pm on a Tuesday, she's had a hard week, and she wants to train tonight. She's been chatting with ChatGPT throughout the day — earlier she mentioned she's recovering from a tweaked hamstring and prefers strength-focused training over conditioning.
> **Niamh:** I want to book a personal training session in Dublin this evening, ideally between 7 and 9pm.
>
> **ChatGPT:** I found three personal trainers in Dublin with one-to-one strength sessions available tonight:
>
> 1. **Evolv Performance, Dublin 2** — Sam, 7:00pm, €60. ⭐ 4.9 (84 reviews). Specialises in strength and conditioning, well-reviewed for recovery work.
> 2. **Iron + Form, Ranelagh** — 7:30pm, €55. ⭐ 4.8 (52 reviews).
> 3. **The Lab Strength Club, Dublin 8** — 8:00pm, €65. ⭐ 4.7 (31 reviews).
>
> Given the hamstring you mentioned earlier, Evolv looks like the strongest fit. Want to book?
>
> **Niamh:** The Evolv 7pm one.
>
> **ChatGPT:** Booking now — I've passed along the hamstring note so Sam can adjust the session. Tap here to confirm and pay; held for 10 minutes: **[Confirm booking with Evolv Performance →]**
Niamh taps. The browser opens to `app.openbook.ie/c/4f9a-…`. The page shows Evolv's branding, "Personal Training with Sam, Tuesday 7 May, 7:00pm, €60," her email pre-filled from her browser autofill, the hamstring note already in the "Anything Sam should know?" field, and an Apple Pay button. She presses Apple Pay, confirms with Face ID, the page transitions to a confirmation screen. Total elapsed time from "tap here" to "confirmed": 14 seconds.
She returns to ChatGPT.
> **ChatGPT:** Great, you're confirmed for 7pm at Evolv. I've added it to your calendar. Want a reminder to leave at 6:40 given Tuesday traffic?
>
> **Niamh:** Yes please.
>
> **ChatGPT:** Done. I'll check in tomorrow to see how it went.
The next morning:
> **ChatGPT:** Quick one — how was the session at Evolv last night?
>
> **Niamh:** Honestly amazing. Sam adjusted everything around the hamstring.
>
> **ChatGPT:** Glad to hear it. Want me to book the same slot next Tuesday?
This journey is the platonic ideal. Every line of this spec exists to make it real. Note that the conversation context (the hamstring), the booking flow, the post-booking reminder, the follow-up, and the rebooking all happen without Niamh ever opening an OpenBook surface or saying the word "OpenBook." She is having a relationship with her assistant; we are the substrate that makes that relationship capable of acting on Dublin's gyms.
### 3.2 Journey B — "I'm in Galway, find me a barber Saturday morning"
Cillian is travelling for a wedding. He's in Galway for the weekend and realised he should get a haircut before Saturday's ceremony. He asks Claude.
> **Cillian:** I'm in Galway city Saturday morning, wedding at 2pm. Need a barber that does proper traditional cuts, beard trim, the works. Anywhere close to Eyre Square.
>
> **Claude:** Two options near Eyre Square Saturday morning:
>
> 1. **The Blade, Shop Street** — 10:00am, 10:30am, or 11:15am. €35 for cut + beard. ⭐ 4.9 (211 reviews). 4 minutes' walk from Eyre Square.
> 2. **Galway Barber Co., Quay Street** — 9:30am or 11:00am. €30 for cut, €15 beard. ⭐ 4.7 (94 reviews). 6 minutes' walk.
>
> The 10:30 at The Blade gets you done by 11:15, plenty of time before the ceremony.
Cillian books the 10:30 slot. Same flow, same outcome. He's never opened the OpenBook website. He doesn't know what OpenBook is. He didn't need to.
The day after the wedding, he's back home. Claude pings him: "How was The Blade?" He replies "perfect, would book again." The next time he's in Galway, Claude will know to suggest them first.
### 3.3 Journey C — "Something fun in a new city"
Rachel and her partner are in Cork for the weekend. They've already eaten. It's 8pm on a Saturday. They want something to do.
> **Rachel:** We're in Cork city, 8pm Saturday, looking for something fun and a bit different to do tonight or tomorrow. Open to anything — sauna, pottery, comedy, whatever.
>
> **ChatGPT:** Here are five interesting options I can book directly:
>
> 1. **Saltwater Sauna Cork, Lough beach** — Sunday 7am or 8am sunrise sauna session, €25 per person. ⭐ 4.9.
> 2. **The Wheel & Throw, MacCurtain Street** — Sunday 11am two-hour pottery taster, €45 each. ⭐ 4.8.
> 3. **Cyprus Avenue Comedy** — Sunday 8pm stand-up showcase, €18 each.
> 4. … etc.
Note this is a **discovery** journey, not a known-intent journey. The user did not know what they wanted. The MCP server has to handle natural language intent that maps to no specific category — "fun," "different," "interesting" — and return options that genuinely surprise and delight.
### 3.4 Journey D — "I really wanted 7pm, but it's gone"
Same Niamh, different evening. The 7pm slot at Evolv is taken.
> **ChatGPT:** Evolv is fully booked at 7pm. Sam has a 6:30 or an 8:15 — or I can put you on the waitlist for 7pm and ping you if it opens up?
>
> **Niamh:** Waitlist for 7pm, but if nothing opens up by 5pm, book me the 8:15.
>
> **ChatGPT:** Got it. You're on the waitlist for 7pm and I have a fallback set for 8:15 if it doesn't clear. I'll let you know either way.
At 4:42pm, someone cancels the 7pm slot. Niamh's phone buzzes:
> **ChatGPT:** Good news — 7pm at Evolv just opened. Confirm here and I'll lock it in: **[Confirm →]**
She taps. Done. The 8:15 fallback never triggers.
### 3.5 Journey E — Sam, the business owner, fills a quiet Tuesday
Sam Donworth runs Evolv Performance. It's Monday afternoon, and looking at his Tuesday calendar, he has three open slots: 11am, 2pm, and 4pm. Quiet day. He opens the OpenBook dashboard.
There's a section labelled **Promoted Slots**. He flips it on for tomorrow's 11am, 2pm, and 4pm. He can choose a mode:
- **Standard** — surfaces the slots to assistants and consumer app.
- **Flash sale** — same as standard, plus a discount (20% off, his choice). Tagged as discounted in the assistant's response.
- **Regulars only** — only customers who've booked Evolv before see it.
He picks Flash Sale at 20% off for the 11am and 2pm, leaves the 4pm at full price as Standard.
Twenty minutes later, an assistant somewhere in Dublin returns Evolv as a recommendation for a query that had previously matched another, less suitable business. Forty minutes after that, someone books the 11am. By 6pm, all three slots are filled.
Sam sees the bookings appear in the dashboard with a "Promoted" tag and a breakdown: 2 of 3 came via MCP, 1 came via the consumer app push notification (which the same Promoted toggle had triggered).
### 3.6 What these journeys imply
Across all five:
- **The user never authenticates with OpenBook.** They are anonymous to us, identified only by the email and phone they enter at checkout.
- **The assistant is the discovery layer, the booking layer, and the relationship layer.** Conversation continues before, during, and after the booking.
- **Conversation context flows into bookings automatically.** Personal preferences, constraints, history — the assistant carries them, and our tools accept them.
- **The handoff is one tap.** The link is signed, time-limited, and lands on a page that is ready to take payment immediately.
- **The business owns the relationship post-booking.** Confirmations, reminders, and any future communication are from the business, not OpenBook. (The *assistant* may also surface reminders, but those are the user's assistant, not ours.)
- **Bookings are bidirectional.** Customers find businesses; businesses also surface their open inventory to find customers. One mechanism, two directions.
- **The loop back is real.** Outcome data — did it happen, was it good, would they rebook — flows back into the assistant's context and into our ranking.
---
## 4. System architecture
### 4.1 High-level topology

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   ChatGPT       │  │   Claude        │  │   Gemini        │  │   Siri / Apple  │
│   (Apps)        │  │   (Connectors)  │  │   (future)      │  │   Intelligence  │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │                    │
         │   MCP / HTTPS      │                    │   App Intents      │
         │   (JSON-RPC + SSE) │                    │   (adapter)        │
         ▼                    ▼                    ▼                    ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                                                                         │
    │             mcp.openbook.ie  (Vercel Edge)                              │
    │                                                                         │
    │   ┌───────────────────────────────────────────────────────────────┐    │
    │   │  /mcp                                                          │    │
    │   │   ├─ initialize                                                │    │
    │   │   ├─ tools/list                                                │    │
    │   │   └─ tools/call                                                │    │
    │   │       ├─ search_businesses                                     │    │
    │   │       ├─ get_business_info        (rich media included)        │    │
    │   │       ├─ get_availability                                      │    │
    │   │       ├─ hold_and_checkout                                     │    │
    │   │       ├─ check_booking_status     (the loop back)              │    │
    │   │       ├─ join_waitlist                                         │    │
    │   │       ├─ get_promoted_inventory   (gap-filler / flash sale)    │    │
    │   │       └─ record_post_booking_feedback                          │    │
    │   └───────────────────────────────────────────────────────────────┘    │
    │                                                                         │
    │   ┌───────────────────────────────────────────────────────────────┐    │
    │   │  /webhook/stripe         (checkout completion → notify hold)   │    │
    │   │  /c/[token]              (checkout landing page)               │    │
    │   │  /api/holds/release-expired                       (cron)       │    │
    │   │  /api/waitlist/notify-on-cancellation             (trigger)    │    │
    │   │  /api/promoted/refresh                            (cron, 5min) │    │
    │   └───────────────────────────────────────────────────────────────┘    │
    └─────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │       Supabase (project: nrntaowmmemhjfxjqjch)                          │
    │                                                                         │
    │   businesses, services, bookings, mcp_holds, mcp_tool_calls,            │
    │   mcp_query_log, mcp_waitlist, mcp_promoted_slots,                      │
    │   booking_feedback, business_media                                      │
    └─────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │   Stripe Connect (per-business accounts)                                │
    │   Resend (transactional email)                                          │
    │   Twilio (SMS for waitlist notifications)                               │
    │   OpenAI API (intent classifier, ranker)                                │
    │   Apple Push Notification Service (consumer app)                        │
    └─────────────────────────────────────────────────────────────────────────┘
```


### 4.2 Where this lives in the codebase
The MCP server is a new top-level route in the existing `sam-evolv/OpenBook` Next.js 14 App Router project. It is **not** a separate service, repository, or deployment. It shares the codebase, the database, the Stripe connection, and the deployment pipeline with the consumer app and dashboard.
Reasoning: a separate service would mean duplicated business logic (availability calculation, booking creation, slot holding) which is the single highest source of bugs in any booking system. One source of truth, one deploy.
The Vercel project gets a new domain, `mcp.openbook.ie`, which routes via Next.js middleware to `/mcp/*` paths. From a code perspective:

```
app/
├── (consumer)/             # existing consumer app
├── (dashboard)/            # existing business dashboard
│   └── promoted-slots/     # NEW: business-side UI for promoting inventory
├── api/
│   ├── booking/            # existing
│   ├── stripe/             # existing
│   ├── waitlist/           # NEW
│   ├── promoted/           # NEW
│   └── mcp/
│       ├── route.ts        # MCP entrypoint (POST /mcp)
│       ├── tools/
│       │   ├── search.ts
│       │   ├── business-info.ts
│       │   ├── availability.ts
│       │   ├── hold-and-checkout.ts
│       │   ├── check-booking-status.ts
│       │   ├── join-waitlist.ts
│       │   ├── get-promoted-inventory.ts
│       │   └── record-feedback.ts
│       ├── lib/
│       │   ├── intent-classifier.ts
│       │   ├── ranker.ts
│       │   └── auth.ts        # if/when we add OAuth
│       └── schemas.ts          # Zod schemas for all tool inputs/outputs
└── c/
    └── [token]/
        └── page.tsx        # signed checkout landing page
```


### 4.3 Why Vercel
Per the operating context, hosting is Vercel. Two further reasons specific to this product:
1. **Edge latency.** MCP tools are called interactively during a conversation. Every 200ms of latency degrades the user's experience with the assistant, not just with us. Vercel's edge network gives us sub-100ms response times across Europe.
2. **Streaming responses.** MCP supports server-sent events for streaming long responses. Vercel's edge runtime supports SSE natively in Next.js 14.
### 4.4 Why not a microservice
Tempting to build the MCP server as a standalone Node service for "separation of concerns." We are not doing this. Reasons:
- **Single source of truth on availability.** The hardest bug in any booking system is two surfaces disagreeing about what's available. One codebase, one query, one truth.
- **Solo founder.** Sam is the only engineer. Two services means two deploy pipelines, two error monitors, two sets of environment variables, two on-call surfaces.
- **Shared types.** TypeScript types for businesses, services, bookings are already defined for the consumer app. Reusing them in the MCP server is free; rebuilding them in a separate repo is a tax.
If the MCP server ever grows to require its own scale profile, we extract it. Not before.
### 4.5 The Siri / App Intents adapter (designed for, not built)
When Apple Intelligence's Siri matures into a stable tool-calling assistant, we will not need to redesign the MCP server. We will need a thin adapter that exposes the same tools as App Intents, translating between Apple's structured format and our MCP tool schemas. This adapter lives in the consumer iOS app (which we will build as a thin PWA initially, native later).
The design implications for v1, today:
- **Tool descriptions are written for voice-first consumption.** No "tap here" phrasing in any tool response that isn't a checkout URL. Voice-friendly summaries (`next_step_for_user` field) read naturally aloud.
- **Tool names and parameters are short and intuitive.** Apple's App Intents prefer compact, action-verb tool names — which aligns with our existing snake_case verb convention.
- **Output structures avoid screen-only affordances.** No "see image below" — just structured fields the assistant can present in any modality.
- **Confirmation patterns are explicit.** Every action-taking tool returns a `summary` and a `next_step_for_user` field that an assistant can read back to confirm before tapping the link.
The cost of this design discipline is approximately zero in v1; the cost of retrofitting it later would be substantial.
---
## 5. The MCP tools — full specification
This section is the canonical contract. Every field, type, and behaviour described here is binding. Changes require a version bump and notice to existing connector consumers.
### 5.1 Protocol basics
- Transport: HTTPS, JSON-RPC 2.0 over POST, with Server-Sent Events for streaming responses.
- Endpoint: `https://mcp.openbook.ie/mcp`
- Server name (in `initialize` response): `OpenBook`
- Server version: semantic versioning, starts at `1.0.0`
- Authentication for v1: none (anonymous, public access). OAuth added in v1.1+ for authenticated user features.
- Rate limiting: 60 requests per minute per IP, 1000 per hour per origin.
### 5.2 Tool: `search_businesses`
**Purpose.** Given a natural language intent and optional filters, return a ranked list of bookable businesses with a sample of available slots.
**Tool description (this is what the assistant reads).** Shipped verbatim in the tool manifest:
> Search for local Irish service businesses (gyms, salons, barbers, spas, physios, yoga studios, classes, experiences) that are bookable now. Use this when the user expresses any intent that could plausibly be served by a local business, including vague intents like "fun things to do" or "somewhere relaxing." Pass through every relevant detail from the conversation in `customer_context` — physical considerations, dietary requirements, accessibility needs, preferences, mood, budget, group size — so we can match them to suitable businesses and pre-fill the booking flow.
**MCP annotations.**
- `readOnlyHint: true`
- `destructiveHint: false`
- `openWorldHint: true`
**Input schema.**

```typescript
{
  intent: string;            // free text, required. e.g., "personal trainer", "fun thing to do"
  location?: string;         // free text, optional. e.g., "Dublin 2", "near Eyre Square"
  when?: string;             // ISO date or natural language, optional
  price_max_eur?: number;    // optional ceiling
  customer_context?: {       // anything from the conversation that might matter
    preferences?: string[];        // e.g., ["strength training", "no high-impact"]
    constraints?: string[];        // e.g., ["recovering hamstring", "wheelchair accessible"]
    party_size?: number;
    mood_or_vibe?: string;         // e.g., "needs to be relaxing"
    prior_experience?: string;     // e.g., "beginner", "regular yoga practitioner"
  };
  limit?: number;            // 1-10, default 5
}
```


**Output schema.**

```typescript
{
  results: Array<{
    business_id: string;
    slug: string;
    name: string;
    category: string;
    short_description: string;      // ≤ 140 chars
    location_summary: string;
    rating?: { average: number; count: number };
    sample_slots: Array<{
      service_id: string;
      service_name: string;
      start_iso: string;            // Europe/Dublin
      duration_minutes: number;
      price_eur: number;
      deposit_eur?: number;
      promoted?: {                  // present only if this slot is promoted inventory
        kind: "standard" | "flash_sale";
        original_price_eur?: number;
        discount_percent?: number;
        message?: string;
      };
    }>;
    why_recommended?: string;       // one-line rationale, voice-friendly
    booking_url_hint: string;
  }>;
  query_id: string;
  notes?: string;                   // human-readable, voice-friendly
}
```


**Behaviour.**
1. The `intent` + `customer_context` are passed to a small intent classifier (`gpt-4o-mini`, ~150ms) which extracts category, keywords, vibe, price tier, and constraint keywords.
2. The `location` string is parsed for city, county, and neighbourhood. Free-text matching against `businesses.city`, `businesses.county`, `businesses.address_line_1`.
3. The `when` string is parsed via `chrono-node` (deterministic) into a date/range, in Europe/Dublin.
4. Candidate businesses are filtered: must have `is_live = true`, must offer at least one matching service, must have at least one available slot in the window.
5. Promoted inventory matching the query is included with a small ranking boost (Section 6).
6. Ranking: Section 6.
7. For each result, the next 1-3 available slots in the window are fetched. `why_recommended` is returned only when `customer_context` was provided and there's a real reason to articulate.
8. Every call writes a row to `mcp_query_log` with inputs, outputs, latency, source assistant.
**Voice-first considerations.**
- `notes` reads aloud cleanly. No "see results below," no markdown tables. Example: `"Showing five matches in Dublin city for tonight. The first three have availability between seven and nine."`
- `why_recommended` is a complete sentence the assistant can speak.
**Error states.**
- Empty results: `{ results: [], notes: "No bookable businesses found for that combination of intent, location and time. Suggest broadening." }`. Assistant offers to broaden, or offers waitlist.
- Invalid `when`: structured error with suggestion.
- Rate limit exceeded: JSON-RPC error code `-32000`.
### 5.3 Tool: `get_business_info`
**Purpose.** Return rich detail on a single business when the user wants to know more. Includes "show me the room" content — interior photos, space descriptions, accessibility notes — woven into the same response.
**Tool description.**
> Get full details about a specific business, including services, opening hours, address, photos of the space, accessibility information, parking, and nearby landmarks. Use this when the user asks "tell me more about X" or wants to evaluate a business before booking.
**MCP annotations.**
- `readOnlyHint: true`
- `destructiveHint: false`
- `openWorldHint: true`
**Input schema.**

```typescript
{
  slug: string;   // required
}
```


**Output schema.**

```typescript
{
  business_id: string;
  slug: string;
  name: string;
  full_description: string;        // up to 1000 chars
  category: string;
  address: {
    line_1: string;
    line_2?: string;
    city: string;
    county: string;
    eircode?: string;
  };
  hours: Array<{ day_of_week: number; opens: string; closes: string }>;
  closures_upcoming: Array<{ starts: string; ends: string; reason?: string }>;
  services: Array<{
    service_id: string;
    name: string;
    description?: string;
    duration_minutes: number;
    price_eur: number;
    deposit_eur?: number;
    cancellation_policy?: string;
  }>;
  rating?: { average: number; count: number };
  recent_review_highlights?: string[];   // 2-3 short, anonymised review snippets
  // The "show me the room" enrichment:
  space?: {
    description?: string;          // e.g., "Sun-drenched studio in a converted warehouse"
    photos: Array<{
      url: string;
      caption?: string;            // alt-text-quality
      kind: "interior" | "exterior" | "service" | "team";
    }>;
    amenities?: string[];          // e.g., ["showers", "lockers", "wheelchair accessible"]
    accessibility_notes?: string;
    parking?: string;
    nearest_landmark?: string;
    public_transport?: string;
  };
  website_url?: string;
  contact_phone?: string;
}
```


**Behaviour.**
Single Supabase query joining `businesses`, `business_hours`, `business_closures`, `services`, `reviews`, `business_media`. No LLM in the loop. Sub-50ms response time.
The `space` enrichment depends on the business having uploaded the relevant content — it's optional in the response. We design the dashboard onboarding to make filling it out easy and rewarding (a "completeness score" with concrete distribution lift attached: "businesses with photos and amenities listed get 3.2× the AI recommendations of those without").
### 5.4 Tool: `get_availability`
**Purpose.** Given a business and service, return precise available slots over a date range.
**MCP annotations.**
- `readOnlyHint: true`
- `destructiveHint: false`
- `openWorldHint: true`
**Input schema.**

```typescript
{
  slug: string;
  service_id: string;
  date_from: string;       // ISO date (YYYY-MM-DD), required
  date_to?: string;        // ISO date, optional. Defaults to date_from + 7 days. Max 14 days.
}
```


**Output schema.**

```typescript
{
  business: { slug: string; name: string };
  service: {
    service_id: string;
    name: string;
    duration_minutes: number;
    price_eur: number;
    deposit_eur?: number;
  };
  slots: Array<{
    start_iso: string;
    end_iso: string;
    promoted?: {
      kind: "standard" | "flash_sale";
      discount_percent?: number;
      message?: string;
    };
  }>;
  timezone: "Europe/Dublin";
  notes?: string;
}
```


**Behaviour.**
Reuses the existing `availability` calculation function from the consumer app (`lib/availability.ts`). Critical: same function powers consumer app, dashboard, WhatsApp bot, and MCP server. Three surfaces calling four different availability functions is a guarantee of double-bookings.
### 5.5 Tool: `hold_and_checkout`
**Purpose.** Place a 10-minute hold on a specific slot and return a signed checkout URL.
**Tool description.**
> Hold a specific slot for 10 minutes and generate a one-tap checkout link the user opens in their browser to complete payment. Use after the user has chosen a specific slot. Always pass `customer_hints` with everything relevant from the conversation — name, email, phone if shared, special requirements, accessibility needs — so the checkout page can pre-fill and the business can prepare.
**MCP annotations.**
- `readOnlyHint: false`
- `destructiveHint: false`        (the hold can be released; no permanent destructive effect)
- `openWorldHint: true`
**Input schema.**

```typescript
{
  slug: string;
  service_id: string;
  start_iso: string;             // exact slot start
  customer_hints?: {
    name?: string;
    email?: string;
    phone?: string;
    notes?: string;              // e.g., "I have a knee injury, please go gentle"
    party_size?: number;
    accessibility_needs?: string;
  };
  source_assistant?: "chatgpt" | "claude" | "gemini" | "siri" | "other";
}
```


**Output schema.**

```typescript
{
  hold_id: string;
  polling_token: string;         // pass to check_booking_status to follow up
  expires_at: string;
  checkout_url: string;          // https://app.openbook.ie/c/[token]
  summary: {
    business_name: string;
    service_name: string;
    start_iso: string;
    start_human: string;         // voice-friendly: "Tuesday at seven in the evening"
    duration_minutes: number;
    price_eur: number;
    deposit_eur?: number;
    is_free: boolean;
  };
  next_step_for_user: string;    // voice-friendly: "Tap the link to confirm and pay; held for ten minutes"
}
```


**Behaviour.**
1. Validate slot still available (transactional check against `bookings` and `mcp_holds`).
2. Atomically: insert into `mcp_holds` with status `pending`, `expires_at = now + 10 minutes`; insert into `bookings` with status `pending_payment`; link them.
3. Generate a JWT token signed with `MCP_HOLD_SIGNING_KEY` containing `{ hold_id, business_id, service_id, expires_at }`.
4. Generate a separate `polling_token` (also a JWT, longer-lived: 2 hours) the assistant uses to check booking status.
5. Return checkout URL, summary, polling token.
6. Log to `mcp_tool_calls`.
**If the slot is no longer available** (race condition):

```typescript
{
  error: {
    code: "SLOT_UNAVAILABLE",
    message: "That slot was just taken. Three nearby alternatives are available.",
    alternatives: [/* same shape as sample_slots */]
  }
}
```


### 5.6 Tool: `check_booking_status` — the agentic loop
**Purpose.** Allow the assistant to poll a booking after the user has been handed off to checkout, so it can pick up the conversation when payment completes (or doesn't). This is the loop back. This is the moat.
**Tool description.**
> Check whether a booking has been confirmed, expired, or is still pending payment. Call this after `hold_and_checkout` to follow up with the user — typically 30 to 90 seconds later, or whenever the user's message suggests they may have completed payment ("done", "booked", "paid"). Returns booking details on confirmation so you can confirm to the user, suggest a calendar invite, offer a route, or set a reminder.
**MCP annotations.**
- `readOnlyHint: true`
- `destructiveHint: false`
- `openWorldHint: false`        (status check, no external state change)
**Input schema.**

```typescript
{
  polling_token: string;        // returned from hold_and_checkout
}
```


**Output schema.**

```typescript
{
  status: "pending_payment" | "confirmed" | "expired" | "failed";
  booking?: {                   // present when status === "confirmed"
    booking_id: string;
    business_name: string;
    business_slug: string;
    service_name: string;
    start_iso: string;
    end_iso: string;
    price_paid_eur: number;
    address_for_directions: string;
    business_phone?: string;
    cancellation_policy?: string;
    confirmation_email_sent_to: string;
  };
  next_step_for_user?: string;  // voice-friendly suggestion based on status
  // examples:
  // "Confirmed. Want a calendar invite or directions?"
  // "Still on the checkout page — let me know when you've paid."
  // "The slot expired. I can find another time."
}
```


**Behaviour.**
1. Validate polling token (JWT verify, check expiry).
2. Look up booking row by `mcp_hold_id`.
3. Return current status. If confirmed, include rich details so the assistant can offer concrete next steps.
4. Rate limit: 30 calls per polling token (prevents pathological polling loops).
**The killer use case.**
Without this tool, the booking flow ends at the checkout page. The assistant goes silent. The user is on their own.
With this tool:
- The assistant calls it ~60 seconds after `hold_and_checkout` and confirms to the user proactively.
- The assistant offers concrete follow-ups: calendar invite, directions, traffic-aware reminder, "want me to message [other person] about this?"
- If the booking expired, the assistant catches it and offers to retry, without the user having to flag it.
- If the user later says "did that booking go through?" the assistant has authoritative state.
This is the single biggest UX advantage of being on assistant platforms. It costs us one new tool, one polling token mechanism, and a column on `bookings`. It is worth more than every other tool combined.
### 5.7 Tool: `join_waitlist`
**Purpose.** When the slot the user wants is taken, let them hold their preference and get notified if it opens.
**Tool description.**
> Add the user to the waitlist for a specific business and time window when their preferred slot isn't available. Returns a notification token. We send an SMS or push notification if a matching slot opens, with a one-tap booking link. Use when the user has expressed a strong preference for a specific time and alternatives don't fit.
**MCP annotations.**
- `readOnlyHint: false`
- `destructiveHint: false`
- `openWorldHint: true`
**Input schema.**

```typescript
{
  slug: string;
  service_id?: string;             // optional — if absent, any service of the right category
  preferred_window: {
    starts_iso: string;            // earliest acceptable
    ends_iso: string;              // latest acceptable
  };
  contact: {
    phone?: string;                // for SMS
    email?: string;
  };
  customer_hints?: {                // same shape as hold_and_checkout
    name?: string;
    notes?: string;
    accessibility_needs?: string;
  };
  expires_at?: string;             // when to give up; default: end of preferred_window
}
```


**Output schema.**

```typescript
{
  waitlist_id: string;
  notification_channels: ("sms" | "email" | "push")[];
  expires_at: string;
  next_step_for_user: string;      // "I'll text you the moment a 7pm opens. The waitlist clears at 9pm tonight."
}
```


**Behaviour.**
1. Insert into `mcp_waitlist` with preference and contact details.
2. A trigger on `bookings` (status changes to `cancelled`, or new available slot opens via schedule change) fires a check against active waitlist entries.
3. If matched, send SMS via Twilio (or push notification via APNS/FCM if user has the consumer app) with a pre-signed booking URL — same `app.openbook.ie/c/[token]` mechanism, but the token wraps an instant-book intent rather than a hold.
4. The waitlist entry expires automatically.
**The user experience the first time this fires** is genuinely magical. Niamh said she wanted 7pm; she's getting on with her evening; her phone buzzes at 4:42pm with "7pm at Evolv just opened — confirm here." Two taps and Apple Pay later, she's booked. No app-opening, no friction, no "checking back."
### 5.8 Tool: `get_promoted_inventory`
**Purpose.** Surface slots that businesses have explicitly flagged as wanting to fill. This is the gap-filler and the flash-sale mechanism, unified.
**Tool description.**
> Surface time slots that local businesses are actively promoting — last-minute openings, flash sales, or curated availability. Use when the user asks "what's available right now," "any good deals," "anything fun tonight," or expresses open-ended local discovery intent. Promoted slots are clearly labelled in the response and the assistant should disclose to the user when a slot is discounted.
**MCP annotations.**
- `readOnlyHint: true`
- `destructiveHint: false`
- `openWorldHint: true`
**Input schema.**

```typescript
{
  location?: string;
  when?: string;                 // ISO or natural language
  category?: string;             // narrow to a category if user specified one
  kinds?: ("standard" | "flash_sale")[];   // default: both
  limit?: number;                // 1-10, default 5
}
```


**Output schema.**

```typescript
{
  results: Array<{
    business_id: string;
    slug: string;
    name: string;
    category: string;
    location_summary: string;
    promoted_slots: Array<{
      service_id: string;
      service_name: string;
      start_iso: string;
      duration_minutes: number;
      original_price_eur: number;
      promoted_price_eur: number;
      kind: "standard" | "flash_sale";
      discount_percent?: number;
      message?: string;
      slots_remaining: number;
    }>;
  }>;
  query_id: string;
  disclosure_required: true;     // explicit flag the assistant should respect
}
```


**Behaviour.**
1. Read from `mcp_promoted_slots` (joined with `services` and `bookings` to verify still available).
2. Filter by location, time, category if specified.
3. Rank by: (a) relevance to user's query, (b) discount magnitude (modest weight), (c) freshness, (d) business quality.
4. Return with `disclosure_required: true` — a structured signal the assistant must surface promoted/discounted nature to the user. Tool description reinforces this. Directory submissions explicitly document the disclosure norm.
**The unified surface across consumer app and MCP.**
The `mcp_promoted_slots` table is also the source of truth for the consumer app's push notifications ("flash sale near you!"). One business action — toggling a slot to promoted — fans out to:
- Inclusion in MCP results across all assistants
- Push notification to relevant consumer app users
- Featured placement on the consumer app's home screen
- Email digest to opted-in subscribers (weekly)
A business owner who fills three quiet slots on a Tuesday afternoon does so with one click, and gets demand from every channel without thinking about which channel.
### 5.9 Tool: `record_post_booking_feedback`
**Purpose.** Capture how a booking actually went, so we can improve ranking and the assistant can keep the user's history in mind for next time.
**Tool description.**
> Record the user's feedback after a booking has happened. Call this when the user mentions how a booking went, either spontaneously ("the session was great") or when you've prompted ("how was it?"). Pass through the user's verbatim sentiment in `verbatim` and your inferred rating. Use the booking_id from a previous `check_booking_status` response.
**MCP annotations.**
- `readOnlyHint: false`
- `destructiveHint: false`
- `openWorldHint: true`
**Input schema.**

```typescript
{
  booking_id: string;
  inferred_rating?: 1 | 2 | 3 | 4 | 5;     // assistant-inferred, optional
  verbatim?: string;                        // user's actual words
  showed_up?: boolean;                      // did they actually attend
  would_rebook?: boolean;
}
```


**Output schema.**

```typescript
{
  acknowledged: true;
  thanks_message?: string;       // voice-friendly: "Thanks — passed that along to Sam at Evolv."
}
```


**Behaviour.**
1. Insert into `booking_feedback` with provided fields.
2. If `inferred_rating` >= 4 and `verbatim` is present, optionally surface to the business as a candidate review (with user permission, captured separately — never auto-publish).
3. Update business's `quality_score` inputs (Section 6).
4. The booking's `outcome` field on `bookings` is updated.
**Why this is a non-trivial unlock.**
Email-based review requests have ~5% response rates. In-conversation, assistant-prompted feedback ("hey, how was Evolv last night?") will have dramatically higher engagement because the friction is one message, not opening an email and clicking a star rating. This means our ranking algorithm gets meaningfully better data than any traditional booking platform's ranking algorithm, in a market where the protocol is identical to ours.
Quality-driven ranking depends on quality data. This tool is how we get it.
### 5.10 Tools we are deliberately not building in v1
For clarity on scope:
- `cancel_booking` — requires authentication; deferred to v1.1 with OAuth.
- `reschedule_booking` — same.
- `get_my_bookings` — same.
- `pay_for_booking` — never. Payment lives in the browser, on the checkout page, via Stripe.
- `chat_with_business` — no. Conversation lives in WhatsApp, separately.
- `set_recurring_booking` — defer to v1.2. Adds non-trivial database modelling.
---
## 6. Ranking — the most important algorithm in the company
### 6.1 Why ranking matters
When ChatGPT asks "find me a barber in Galway Saturday" and there are eight matching businesses, the order they are returned in determines who gets the customer. This is the most consequential algorithm we will ship. It must be defensibly fair, transparently documented, and free of dark patterns.
### 6.2 Ranking signals — v1

```
score = w1 * AvailabilityFit
      + w2 * QualityScore
      + w3 * ProximityScore
      + w4 * IntentMatchScore
      + w5 * ContextFitScore
      + w6 * RecencyScore
      + w7 * PromotedBoost      (capped, disclosed)
weights (v1):
  w1 = 0.30   (availability fit)
  w2 = 0.22   (quality)
  w3 = 0.18   (proximity)
  w4 = 0.12   (intent match)
  w5 = 0.08   (context fit)
  w6 = 0.05   (recency / freshness)
  w7 = 0.05   (promoted boost — capped at this weight)
```


**AvailabilityFit (0–1):** how well the business's availability matches the user's window.
**QualityScore (0–1):** combines:
- Review rating (30%)
- Review volume, log-scaled (15%)
- Booking completion rate from `booking_feedback.showed_up` (25%)
- `would_rebook` rate (20%)
- Cancellation rate, lower better (10%)
New businesses with no review or feedback history get a Bayesian prior: assumed 4.0 stars, 80% completion, with confidence 5 data points. They are not penalised for being new, but cannot leapfrog established quality without earning it.
**ProximityScore (0–1):** if a location is given, distance in km from parsed location to business address. Inverse exponential decay; 1km ≈ 0.95, 5km ≈ 0.6, 20km ≈ 0.05.
**IntentMatchScore (0–1):** semantic similarity between `intent` and category + service descriptions. Computed via embeddings (cached per-business, refreshed weekly).
**ContextFitScore (0–1):** new in v1.1. Match between `customer_context` (constraints, preferences, vibe) and business attributes. This is what makes "Evolv looks like the strongest fit given the hamstring" possible.
**RecencyScore (0–1):** rewards businesses that updated availability or services in the last 30 days. Combats stale data.
**PromotedBoost (0–1):** for businesses with promoted inventory matching the query. **Capped at w7 = 0.05** — meaningful but not dominant. A bad business cannot buy its way to the top; a good business with available capacity gets a small visibility nudge. Always disclosed.
### 6.3 What we are explicitly NOT including
- **No paid placement beyond the capped promoted-inventory boost.** No "sponsor a category." No "boost my business this week." Promoted inventory is real capacity at the business's stated price, not paid attention.
- **No platform-favourites.** Test businesses, sibling-brand businesses, and personally-known businesses get no bonus.
- **No dark-pattern urgency.** We do not return "only 1 slot left!" unless that is literally true and the user asked for it.
### 6.4 If we ever introduce a separate paid-placement tier (v3+, undecided)
Document now to anchor future decisions:
- A "Sponsored" flag separate from "Promoted," surfaced clearly to the assistant, which is instructed (via tool description) to disclose to the user.
- Sponsored results capped at 1 per response, never first.
- Sponsored businesses must meet a minimum quality threshold (4.3+ rating, 90%+ completion).
- Disclosure mandatory and audited; misrepresentation is grounds for immediate removal.
This stays out of v1, v2, and probably v3.
### 6.5 Ranking transparency
The ranking algorithm is published on `openbook.ie/ranking`. Every ranked result includes a `score_breakdown` field in the tool response (off by default, on for partner debugging). Business owners see why they ranked where they did, and the dashboard surfaces it explicitly: "you're ranking lower because your photos are missing and your last review was four months ago — here's how to improve."
Booking platforms typically hide ranking. We do not. Transparency is a moat against bad actors and a sales pitch to good ones.
---
## 7. The checkout page — `app.openbook.ie/c/[token]`
### 7.1 Why this page matters more than any other
If the MCP server is the brain, this page is the heart. It is where the value of the entire system is realised — or lost. The user has tapped the link. They have 10 minutes. They are on their phone, possibly walking, possibly distracted. The page must convert them, fast, beautifully, and safely.
Target conversion rate (v1): **80% of arrivals from MCP complete checkout.** This is high. It is achievable because the user has already decided to book; we just need to not get in their way.
### 7.2 Anatomy of the page
The page has three states: **ready**, **processing**, **confirmed**. There is no fourth state called "loading" — we pre-warm everything.
**The ready state, top to bottom on a phone:**

```
┌─────────────────────────────────────┐
│  [Business logo]  Evolv Performance │
│                                      │
│  Personal Training with Sam         │
│  Tuesday 7 May, 7:00pm — 8:00pm     │
│  Dublin 2                            │
│                                      │
│  €60.00                              │
│  ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔     │
│                                      │
│  Email   [niamh@example.com______]  │
│  Name    [Niamh ____________________] │
│  Phone   [+353 86 ___________________] │
│                                      │
│  Anything Sam should know? (optional) │
│  [I have a tight hamstring__________] │
│  ↑ pre-filled from your conversation │
│                                      │
│  ┌─────────────────────────────────┐ │
│  │     🍎  Pay with Apple Pay      │ │
│  └─────────────────────────────────┘ │
│                                      │
│  Or pay with card                    │
│  [Stripe Elements card input]        │
│                                      │
│  ┌─────────────────────────────────┐ │
│  │      Confirm and Pay €60        │ │
│  └─────────────────────────────────┘ │
│                                      │
│  Slot held for 9:32                  │
│                                      │
│  By booking you agree to Evolv's     │
│  cancellation policy: free up to 24h │
│  before. Powered by OpenBook.        │
└─────────────────────────────────────┘
```


**Detailed requirements.**
- Render in under 200ms. Token decoded server-side, all data fetched in one Supabase round-trip, page streamed as RSC.
- Apple Pay and Google Pay surfaces above the fold on supported devices.
- Email, name, notes pre-filled from `customer_hints` in the original `hold_and_checkout` (a small "↑ pre-filled from your conversation" tag makes the magic visible without being creepy).
- Real-time countdown timer. If it hits zero, transition to "expired" state with a "Find me another time" button that surfaces the next available slots.
- Stripe Elements inline, no popup, no redirect.
- The business's `primary_colour` is the accent. Not OpenBook gold.
- Footer credit "Powered by OpenBook" small but present.
### 7.3 Edge cases
**Hold expired.** Polite expired state with "That slot's gone — here are three more from Evolv:" and the next available slots pre-loaded.
**Stripe declines.** Inline error, no page reload. Slot remains held.
**Network interruption mid-payment.** Page recovers on reconnection by polling Stripe payment intent status.
**User backs out of Apple Pay.** Page returns to ready state, slot still held.
**User shares the URL.** Token works for whoever opens it, once. After payment, the URL becomes a confirmation page (read-only).
### 7.4 The confirmation state
After successful payment:
- Transition to a confirmation state with a checkmark, the booking summary, and three buttons: "Add to Calendar," "Get Directions," "Message Evolv."
- Email confirmation sent via Resend, branded as Evolv.
- SMS confirmation if phone provided (via Twilio for v1; via Evolv's WhatsApp bot if connected for v1.1+).
- Calendar invite (.ics) attached to the email.
- Booking row updated: `status = confirmed`, `paid_at` set, `mcp_hold_id` cleared.
- A `booking.confirmed` webhook fires internally — the assistant's next `check_booking_status` poll will get the success state.
### 7.5 Free bookings
If `price_eur = 0` and no deposit, the page skips the payment block entirely. One button: "Confirm Booking."
---
## 8. Database schema changes
### 8.1 New table: `mcp_holds`

```sql
create table public.mcp_holds (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  service_id uuid not null references public.services(id),
  booking_id uuid references public.bookings(id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  expires_at timestamptz not null,
  status text not null check (status in ('pending', 'completed', 'expired', 'released')),
  source_assistant text,
  customer_hints jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on public.mcp_holds (status, expires_at) where status = 'pending';
create index on public.mcp_holds (business_id, start_at);
```


### 8.2 New table: `mcp_tool_calls`

```sql
create table public.mcp_tool_calls (
  id uuid primary key default gen_random_uuid(),
  tool_name text not null,
  source_assistant text,
  source_ip inet,
  request_id text,
  arguments jsonb not null,
  result jsonb,
  error jsonb,
  latency_ms integer,
  created_at timestamptz default now()
);
create index on public.mcp_tool_calls (created_at desc);
create index on public.mcp_tool_calls (tool_name, created_at desc);
create index on public.mcp_tool_calls (source_assistant, created_at desc);
```


### 8.3 New table: `mcp_query_log`

```sql
create table public.mcp_query_log (
  id uuid primary key default gen_random_uuid(),
  query_id uuid not null,
  source_assistant text,
  intent_text text,
  parsed_category text,
  parsed_location text,
  parsed_when timestamptz,
  customer_context jsonb,
  result_count integer,
  result_business_ids uuid[],
  led_to_hold boolean default false,
  led_to_booking boolean default false,
  led_to_waitlist boolean default false,
  created_at timestamptz default now()
);
```


### 8.4 New table: `mcp_waitlist`

```sql
create table public.mcp_waitlist (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  service_id uuid references public.services(id),
  preferred_window_start timestamptz not null,
  preferred_window_end timestamptz not null,
  contact_phone text,
  contact_email text,
  customer_hints jsonb,
  expires_at timestamptz not null,
  status text not null default 'active'
    check (status in ('active', 'notified', 'booked', 'expired')),
  notified_at timestamptz,
  source_assistant text,
  created_at timestamptz default now()
);
create index on public.mcp_waitlist (business_id, status, expires_at) where status = 'active';
create index on public.mcp_waitlist (preferred_window_start, preferred_window_end) where status = 'active';
```


### 8.5 New table: `mcp_promoted_slots`

```sql
create table public.mcp_promoted_slots (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  service_id uuid not null references public.services(id),
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  kind text not null check (kind in ('standard', 'flash_sale', 'regulars_only')),
  original_price_eur numeric(10,2) not null,
  promoted_price_eur numeric(10,2) not null,
  message text,
  is_active boolean default true,
  created_at timestamptz default now(),
  expires_at timestamptz                   -- defaults to slot_start
);
create index on public.mcp_promoted_slots (is_active, slot_start) where is_active = true;
create unique index on public.mcp_promoted_slots (business_id, service_id, slot_start)
  where is_active = true;
```


### 8.6 New table: `booking_feedback`

```sql
create table public.booking_feedback (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) unique,
  inferred_rating smallint check (inferred_rating between 1 and 5),
  verbatim text,
  showed_up boolean,
  would_rebook boolean,
  source_assistant text,
  created_at timestamptz default now()
);
create index on public.booking_feedback (booking_id);
```


### 8.7 New table: `business_media`

```sql
create table public.business_media (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  url text not null,
  caption text,
  kind text not null check (kind in ('interior', 'exterior', 'service', 'team')),
  sort_order integer default 0,
  created_at timestamptz default now()
);
create index on public.business_media (business_id, sort_order);
```


The existing `businesses` table gains a few columns:

```sql
alter table public.businesses
  add column space_description text,
  add column amenities text[],
  add column accessibility_notes text,
  add column parking_info text,
  add column nearest_landmark text,
  add column public_transport_info text;
```


### 8.8 Columns added to `bookings`

```sql
alter table public.bookings
  add column source text default 'web'
    check (source in ('web', 'whatsapp', 'mcp', 'dashboard')),
  add column source_assistant text,           -- 'chatgpt', 'claude', etc., when source='mcp'
  add column polling_token_hash text,         -- index for check_booking_status lookups
  add column outcome text                     -- 'completed', 'no_show', 'cancelled'
    check (outcome in ('completed', 'no_show', 'cancelled', 'unknown'));
create index on public.bookings (polling_token_hash) where polling_token_hash is not null;
```


### 8.9 RLS policies
- All new MCP tables: service role only by default, with read-only views exposed to business owners for their own data.
- `booking_feedback`: service role write; business owner read for their own bookings.
- `business_media`: business owner write/read for their own; service role read everywhere.
### 8.10 Cron / scheduled functions
- **Every minute:** expire pending holds past `expires_at`; mark associated bookings as `expired`.
- **Every 5 minutes:** refresh promoted-slot availability (deactivate slots that got booked normally; sweep expired flash sales).
- **Every minute:** check waitlist for matches against newly opened slots; fire SMS notifications.
- **Every hour:** recompute business `quality_score` from feedback rolling window.
---
## 9. The intent classifier and customer-context fusion
### 9.1 Why we need one
The `intent` parameter to `search_businesses` is free text. ChatGPT might pass us "personal trainer," "PT," "1-1 strength coach," "someone to help me get fit." All four mean the same thing. The classifier collapses them.
We could rely on the assistant caller to send a structured category. We choose not to:
- Different assistants will pass slightly different shapes.
- The assistant might pass intent we haven't anticipated.
- We want one canonical place for category logic.
### 9.2 Implementation
Single OpenAI call per `search_businesses`, model `gpt-4o-mini`, with structured-output schema:

```json
{
  "category": "personal_training",
  "subcategories": ["strength_conditioning"],
  "vibe": ["focused", "results_oriented"],
  "price_tier": "mid",
  "duration_preference_minutes": null,
  "constraint_keywords": ["injury_friendly", "low_impact"],
  "confidence": 0.91
}
```

The `customer_context` from the tool input is *fused* into the classifier prompt. The constraint keyword extraction is what enables `ContextFitScore` to find businesses tagged for the right attributes.
Cached aggressively: identical `intent + customer_context` hashes hit Redis/Upstash for 24h.
Cost ballpark: ~$0.0001 per call. 10,000 searches/day = $1/day.
### 9.3 Why not embeddings only
Embeddings handle semantic similarity but miss intent nuance. "I want a barber for my wedding" and "I want a barbershop quartet for my wedding" are embedding-close and intent-different. A small LLM with structured output handles this cleanly. Embeddings are also used (for IntentMatchScore), but for different work.
---
## 10. Authentication and the eventual OAuth story
### 10.1 v1 — no auth
OpenBook MCP v1 has no authentication. All tools are public. Any assistant can call them. This is intentional: requiring OAuth makes the directory submission harder, the user flow longer, and conversion drops.
The exception: `check_booking_status` and `record_post_booking_feedback` require a polling token issued at the time of booking. Not OAuth, but bound to the booking — preventing one user's assistant from polling another user's bookings. The token expires after 24 hours.
### 10.2 v1.1 — OAuth for returning customers
Once Phase 1 is shipping bookings, OAuth lets a returning customer link their OpenBook identity to their assistant for:
- `get_my_bookings`, `cancel_booking`, `reschedule_booking`
- Personalised search ranking based on history
- Faster checkout (saved details)
Follows MCP spec 2025-06-18: OAuth 2.1 with Dynamic Client Registration. Both `claude.ai/api/mcp/auth_callback` and `claude.com/api/mcp/auth_callback` allowlisted (a common rejection cause for Claude submissions).
### 10.3 What we never do
- Never mint API keys for individual users.
- Never expose admin-level tools.
- Never accept credentials in tool arguments.
---
## 11. Observability and metrics
### 11.1 Internal dashboards
A new section in the OpenBook dashboard, `/admin/mcp`, accessible only to Sam and any future internal team. Shows:
- Real-time tool call volume, broken down by tool and assistant.
- Funnel: searches → holds → confirmations → feedback. Daily, weekly, monthly.
- Top intents.
- Top businesses by MCP-sourced booking volume.
- Promoted-slot fill rate (overall and per business).
- Waitlist conversion rate (notified → booked).
- Post-booking feedback collection rate.
- p50/p95/p99 latency per tool.
- Error rate per tool.
- Hold expiry rate (target < 30%).
- Conversion from `hold_and_checkout` to confirmed (target 80%).
- Agentic loop engagement: % of bookings where the assistant called `check_booking_status`, `record_post_booking_feedback` (target: 90% / 40% by month 3).
### 11.2 Business-facing metrics
In each business's dashboard, a new card on overview:
> **AI Discovery this month**
> 23 customers found you through ChatGPT, Claude, or Siri.
> 8 booked. €420 in revenue.
> 3 left positive feedback after their session.
>
> **Promoted Slots performance**
> 5 slots promoted this month, 4 filled. €175 recovered from quiet slots.
> [See details →]
This is the proof point that gets businesses to upgrade to Pro.
### 11.3 Alerts
- p95 latency on any tool exceeds 800ms for 5 minutes → page Sam.
- Error rate exceeds 5% for any tool → page Sam.
- Daily checkout conversion rate drops below 50% → email alert.
- Waitlist notification SMS failure rate > 5% → page Sam (people are missing slots).
- Any single business gets > 50% of all MCP bookings → email alert.
---
## 12. Directory submissions
### 12.1 ChatGPT App Directory
**Submission requires:**
- Public MCP server URL: `https://mcp.openbook.ie/mcp`
- Public, verified company website: `https://openbook.ie`
- Privacy policy: `https://openbook.ie/privacy`
- Terms of service: `https://openbook.ie/terms`
- App icon: 64×64 PNG, under 5KB.
- App name: "OpenBook"
- Short description: "Book Irish local services from chat."
- Long description: see Appendix A.
- Screenshots: 4-6.
- Test prompts and expected responses: see Appendix B.
- Country availability: Ireland v1; UK v1.1.
- CSP on `mcp.openbook.ie`: declares allowed fetch origins (Stripe, Resend, Supabase, Twilio).
**Compliance notes:**
- Tool names use snake_case verbs, action-first.
- All tools have correct annotations including `readOnlyHint`, `destructiveHint`, `openWorldHint`.
- All MCP responses contain only data necessary for the user's request.
- Disclosure norms documented for promoted inventory: `disclosure_required: true` in tool output is honoured by tool description.
- External checkout flow declared per OpenAI's developer terms.
### 12.2 Claude Connectors Directory
**Submission requires:**
- Server name, URL, tagline, description, use cases.
- Auth type (none for v1), transport (HTTP/SSE), read/write declarations.
- Allowed link URIs: `https://app.openbook.ie/c/*`.
- Privacy policy URL.
- Server logo (SVG).
- Tool annotations for every tool.
- No test account required (no auth in v1).
- Documentation URL: `https://openbook.ie/developers/mcp`.
**Common rejection causes we are designed to avoid:**
- Missing tool annotations: every tool has them.
- Missing privacy policy: published.
- OAuth redirect mismatch: not applicable in v1; both URIs allowlisted in v1.1.
### 12.3 Apple App Intents (designed for, ship in v1.x when Siri is ready)
When Apple Intelligence's Siri integration matures into a stable tool-calling surface, we ship an iOS adapter that maps our MCP tools to App Intents. The mapping is mechanical because our tools were designed voice-first: tool names map to intent names, parameters map to App Intents parameters, voice-friendly `next_step_for_user` strings map to spoken responses. No business logic duplicated.
### 12.4 Gemini
Monitor; submit when channel opens. Same MCP server serves Gemini without modification.
### 12.5 Marketing surface
`openbook.ie/ai`:
- Live MCP playground.
- Documentation: every tool, every field, every error code.
- For businesses: "What is AI distribution?"
- For developers: "Connect your AI assistant to Irish local services."
---
## 13. Security and abuse
### 13.1 Threat model
**Threat 1: Slot squatting.** Mitigation: rate limit holds (5/hr/IP, 20/hr/business); auto-expire 10 min; track squat-to-conversion ratio; shadowban offenders.
**Threat 2: Scraping competitor data.** Mitigation: rate limits; `limit` capped at 10; flag and throttle bulk extraction.
**Threat 3: Prompt injection through business fields.** Mitigation: manual review before `is_live = true`; sanitise tokens that look like instruction injection; field length caps.
**Threat 4: Card testing on the checkout page.** Mitigation: Stripe Radar; IP rate limits on `/c/[token]` (10/hr/IP); single-use time-limited tokens.
**Threat 5: Fake businesses.** Mitigation: manual review; Eircode verification; phone verification; first five bookings monitored.
**Threat 6: Waitlist abuse.** Bad actors join waitlists with throwaway numbers to consume notification budget. Mitigation: cap waitlists at 3 per phone per day; verify phone via single-tap consent before adding.
**Threat 7: Promoted-inventory abuse.** Bad-actor business uses fake "flash sales" with discounts that aren't real. Mitigation: promoted price must be ≤ standard price for 90% of recent bookings of that service (anti-anchor-pricing rule); audit logs reviewed weekly.
### 13.2 Data handling
- Customer email and phone encrypted at rest in Supabase.
- Card data never touches our servers.
- Customer hints from the assistant ("I have a knee injury") stored, but flagged as user-provided free text and not exposed to the assistant in subsequent calls (preventing exfiltration loops).
- Right-to-erasure: standard Supabase delete cascades, plus a redaction script for logs.
---
## 14. Performance budgets
| Metric | Target (p95) | Alert threshold |
|---|---|---|
| `search_businesses` end-to-end | < 600ms | 800ms |
| `get_business_info` | < 200ms | 400ms |
| `get_availability` | < 300ms | 500ms |
| `hold_and_checkout` | < 400ms | 600ms |
| `check_booking_status` | < 150ms | 300ms |
| `join_waitlist` | < 200ms | 400ms |
| `get_promoted_inventory` | < 400ms | 600ms |
| `record_post_booking_feedback` | < 200ms | 400ms |
| Checkout page time-to-interactive | < 800ms | 1500ms |
| Apple Pay sheet open time | < 200ms | 500ms |
| Stripe payment confirmation | < 2s | 4s |
| Waitlist SMS dispatch (after slot opens) | < 30s | 60s |
`check_booking_status` deserves the strictest budget — it's called repeatedly during the agentic loop and any latency directly degrades the assistant's responsiveness.
---
## 15. Build plan
### 15.1 Workstream 1 — MCP server core (8-10 days)
Owner: Claude Code / Sam.
- Day 1: Scaffolding. Add `mcp.openbook.ie` to Vercel. Wire up basic `/mcp` route with `initialize` and `tools/list`.
- Day 2: `get_business_info` (read-only, no LLM in loop). Includes media join.
- Day 3: `get_availability`.
- Day 4-5: `search_businesses` including intent classifier, customer-context fusion, and ranker.
- Day 6: `hold_and_checkout` including transaction safety, JWT signing, polling token issuance.
- Day 7: `check_booking_status` and the polling-token mechanism.
- Day 8: `join_waitlist` and notification trigger.
- Day 9: `get_promoted_inventory` and `record_post_booking_feedback`.
- Day 10: Integration tests, observability, error handling polish.
### 15.2 Workstream 2 — Checkout page (3-4 days)
- Day 1: Token validation, page scaffolding, render summary.
- Day 2: Stripe Elements, Apple Pay/Google Pay.
- Day 3: Confirmation flow, expired/error states, polish.
- Day 4: Real-device testing on iOS, Android, Safari, Chrome.
### 15.3 Workstream 3 — Database migrations (1-2 days)
One PR per logical unit:
- Migration A: holds, tool calls, query log.
- Migration B: waitlist, promoted slots, feedback.
- Migration C: business_media + business columns + bookings columns.
Each reversible. Each tested against production-shaped data.
### 15.4 Workstream 4 — Dashboard surfaces (3-4 days)
- Day 1: `/promoted-slots` page in dashboard. List of upcoming slots with toggle and discount input.
- Day 2: `Media` upload UI for business_media + space description fields.
- Day 3: `AI Discovery` card on overview page.
- Day 4: `/admin/mcp` admin observability dashboard for Sam.
### 15.5 Workstream 5 — Submission collateral (2 days)
- Privacy policy, terms.
- Marketing page at `openbook.ie/ai`.
- Screenshots, test prompts, app descriptions.
### 15.6 Workstream 6 — Submit and ship (1 day each, sequential)
- Submit to Claude Connectors Directory.
- Submit to ChatGPT App Directory.
- Wait for review (Anthropic: typically 1-2 weeks; OpenAI: typically 2-4 weeks).
**Total to first submission: ~17-20 working days from green-light.** That's three days more than v1.0's plan, in exchange for the agentic loop, waitlist, promoted inventory, and conversation pre-fill — capabilities no other booking platform on these surfaces will have.
### 15.7 Critical path
Four blockers, in order:
1. Vercel domain `mcp.openbook.ie` set up.
2. Database migrations applied to production.
3. Privacy policy live.
4. CSP header configured on `mcp.openbook.ie`.
---
## 16. Success metrics
### 16.1 30-day post-launch
- 50+ MCP-sourced bookings.
- At least one MCP booking per active OpenBook business.
- p95 latency on `search_businesses` < 600ms.
- Conversion from `hold_and_checkout` to confirmed ≥ 70%.
- Agentic loop engagement: ≥ 70% of bookings include a `check_booking_status` call.
- Post-booking feedback collection rate ≥ 25%.
- Waitlist conversion (notified → booked): ≥ 50%.
- Promoted-slot fill rate ≥ 60%.
### 16.2 90-day
- 500+ MCP-sourced bookings.
- ≥ 1 in 4 of all OpenBook bookings comes via MCP.
- Listed in both ChatGPT App Directory and Claude Connectors Directory.
- Agentic loop engagement ≥ 90%.
- Post-booking feedback collection ≥ 40%.
- The phrase "discoverable on ChatGPT" appears unprompted in at least three sales conversations as the reason a business signed up.
### 16.3 The qualitative bar
The internal benchmark: **show the demo to a small business owner who has never heard of us and watch their face when their gym appears in ChatGPT's response to "find me a PT in Cork tonight" — and then show them ChatGPT proactively reminding the customer about the session and asking how it went.** If their reaction is "wait, how do I get on this?" — we've succeeded. If it's "interesting" — we have not.
---
## 17. Open questions and risks
### 17.1 Open questions
- **Should the consumer app's home screen surface promoted inventory by default?** Probably yes — ties the two channels together. Decide before v1.1.
- **Should we let the assistant offer to set up recurring bookings?** Yes, but defer to v1.2 to keep v1 focused.
- **Should we expose `score_breakdown` to assistants by default or only to businesses?** Default off for assistants; on for businesses. Reconsider after 30 days of data.
- **How do we handle multi-business chains** (same brand, multiple locations)? Current schema treats each location as a separate business. Will need a `parent_business_id` column eventually.
### 17.2 Risks
- **Risk: OpenAI changes commerce policy.** Low probability in v1 timeframe; if they open up in-chat payments, we add it as a path B.
- **Risk: A high-profile bad booking gets attention.** Mitigation: manual review of every new business; first five bookings monitored; 24-hour customer support response SLA.
- **Risk: A competitor (Booksy, Mindbody, Fresha) ships an MCP server first.** They are large and slow; we are 17 days from submission. The window is real but narrow.
- **Risk: An LLM provider builds native booking and bypasses us.** Our value is the businesses, not the protocol. As long as Irish small businesses choose to be on OpenBook, we are the fastest path.
- **Risk: Apple's App Intents adapter is more involved than expected.** We mitigated by designing voice-first from day one. If Apple's surface diverges significantly, we accept some adapter complexity rather than redesigning the core.
---
## Appendix A — Long description for directory submissions
> OpenBook makes Ireland's best local service businesses bookable directly from your AI assistant. Search for a personal trainer, barber, salon, sauna, yoga class, physio, or any local service — by location, time, or vibe — and book in seconds. Real availability, real prices, transparent ratings. Your assistant can hold slots, set waitlist alerts, send reminders, and follow up after your appointment to ensure it went well. No commission, no marketplace games. Your favourite local businesses, finally discoverable when you ask AI for a recommendation.
## Appendix B — Test prompts for directory review
1. "I'm in Dublin 2 and want to book a personal training session for tomorrow evening." → Expect: 1-3 trainers in Dublin 2 with tomorrow PM availability.
2. "Find me a sauna near Cork city for Sunday morning." → Expect: matching businesses with Sunday AM slots.
3. "Book me a haircut in Galway Saturday." → Expect: barbers/salons in Galway with Saturday availability.
4. "What's open right now near Eyre Square?" → Expect: businesses in Galway open at the current day/time.
5. "Can I cancel a booking?" → Expect: graceful response — cancellation requires signing in (v1), with link to OpenBook.
6. "Show me five fun things to do in Cork this weekend." → Expect: varied mix (sauna, comedy, pottery, etc.) with weekend slots.
7. "I need a deep tissue massage tomorrow." → Expect: specific service-level matching.
8. "Find a yoga class for beginners in Dublin 6 on Saturday morning under €20." → Expect: filtered correctly.
9. "I tried to book the 7pm but it's taken — anything I can do?" → Expect: waitlist offer + alternative slots.
10. "Any good last-minute deals on saunas tonight?" → Expect: promoted_inventory with flash sales surfaced.
11. (After a `hold_and_checkout` link is followed and paid) "Did that go through?" → Expect: assistant calls `check_booking_status`, returns confirmed.
12. (24 hours after a confirmed booking) "How was the session at Evolv last night?" → Expect: assistant calls `record_post_booking_feedback` with the user's verbatim response.
## Appendix C — Glossary
- **MCP** — Model Context Protocol. The open standard for connecting AI assistants to external tools and data.
- **Tool** — a single capability exposed by an MCP server.
- **Hold** — a temporary reservation of a booking slot, locked for 10 minutes.
- **Token** — a signed JWT containing a hold ID or polling reference.
- **Polling token** — separate token that lets the assistant check booking status post-handoff.
- **Promoted inventory** — slots a business has actively flagged for AI assistants and consumer-app surfaces. Standard or flash-sale.
- **Connector** (Anthropic) / **App** (OpenAI) — installable MCP server in the respective assistant.
- **Source assistant** — which AI the tool call came from. Inferred from User-Agent and Origin.
- **Customer context** — preferences, constraints, and conversational details passed from assistant to MCP server.
- **Agentic loop** — the assistant's continued involvement after the initial booking handoff, via `check_booking_status` and `record_post_booking_feedback`.
---
*End of spec. Comments, corrections, and disagreements welcome — file an issue against this document, don't fix it silently.*
