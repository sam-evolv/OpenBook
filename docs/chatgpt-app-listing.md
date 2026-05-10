# OpenBook — ChatGPT App Directory listing copy

Drop-in copy for the OpenAI Platform Dashboard submission form. Each
section maps to one field on the form. Sam: read it once, edit anything
that does not feel right, paste it in.

## Public name

OpenBook

## Tagline (one line, ~60 chars)

Book local Irish service businesses directly in chat

## Short description (~150 chars, shown in directory cards)

Find and book gyms, salons, spas, physios, classes and more across
Ireland. Get suggestions, see times, hold a slot, complete in one tap.

## Long description (~500 words, shown on the app's directory page)

OpenBook is a booking platform for local Irish service businesses,
connected to ChatGPT through an MCP server. Ask ChatGPT for a service
you want and OpenBook returns real, bookable inventory: live slots,
real prices, real businesses.

Three things people actually use it for:

- Discovery, when you have a window and an idea but not a plan.
  "Anything fun on tonight in Cork?", "Suggest something relaxing
  near me", "What is open late?". OpenBook surfaces businesses with
  promoted or last-minute availability and tells you what is still
  open.
- Specific search, when you know what you want.
  "A Pilates class in Dublin tomorrow at 6pm", "A barber near me on
  Saturday morning", "A physio who can see me this week". OpenBook
  matches the request against live availability and returns slots
  you can book straight away.
- Booking, when you have chosen.
  ChatGPT generates a one-tap checkout link. You open it in your
  browser, confirm, and you are booked. The slot is held for 10
  minutes while you finish, so you do not lose it to someone else.

What is bookable today: gyms and personal training, salons and
barbers, beauty and nails, spas and saunas, physios and recovery,
yoga and Pilates studios. The catalogue is Ireland-only for now.

How payment works: businesses set up with Stripe accept card payment
on the OpenBook checkout page. Businesses without Stripe take payment
in person on the day. Whichever applies is shown clearly before you
confirm. OpenBook never takes payment inside ChatGPT itself.

After you book, you get an email confirmation with the address,
service, time and the business's contact details. If you join a
waitlist for a slot that is full, OpenBook notifies you when a
matching slot opens. The business owns the customer relationship; we
are the booking infrastructure underneath.

How to invoke OpenBook: just ask ChatGPT to find or book a service in
Ireland, or call OpenBook by name ("ask OpenBook to find me…").
ChatGPT routes the request to the OpenBook MCP server and surfaces
the answer in the conversation.

## Categories (select these in the form)

- Lifestyle (primary)
- Local services (secondary, if available)

## Country availability

Ireland

## Demo flow notes (for OpenAI reviewers)

OpenBook does not require a login to book through ChatGPT. The
reviewer can test by asking ChatGPT, with OpenBook connected,
something like:

- "Find me a sauna in Cork tonight"
- "Book a manicure at The Nail Studio in Dublin"
- "Anything fun on tonight in Galway?"

Notes for the reviewer:

- Holds expire 10 minutes after they are issued. The checkout URL is
  single-use; once paid (or expired) it can no longer be reused.
- The full paid flow: Dublin Iron Gym + PT Session uses Stripe Connect.
  In Stripe test mode the reviewer can pay with card 4242 4242 4242 4242,
  any future expiry, any 3-digit CVC, any postcode. This will
  confirm a real booking row in the OpenBook database.
- The in-person flow: any other live business. The reviewer enters
  name, email, phone on the checkout page, taps Confirm, and no
  payment is taken (the customer pays the business on the day).
- The check_booking_status tool can be invoked 30 to 90 seconds after
  hold_and_checkout to confirm the booking went through.
- All eight tools are documented at https://mcp.openbook.ie/mcp via
  the standard MCP tools/list method.

If you want a separate dedicated review environment instead of
production for the paid-flow test, ask Sam at support@openbook.ie
and he will spin one up.

## Support contact

support@openbook.ie

## Privacy policy URL

https://openbook.ie/privacy

## Terms of use URL

https://openbook.ie/terms

## MCP server URL

https://mcp.openbook.ie/mcp

## Screenshots required (Sam captures these)

The four canonical screens, captured against the live production app:

1. ChatGPT conversation, showing a search query ("a sauna in Cork
   tonight" works well) and the results rendered as a list / card.
2. ChatGPT conversation, showing the hold_and_checkout response with
   the one-tap checkout link surfaced.
3. The OpenBook checkout page in a mobile browser, showing the
   business name, the slot, the payment mode badge, and the contact
   form.
4. The booking confirmation success screen after the booking
   completes.

Read the current screenshot dimension requirements directly from
https://developers.openai.com/apps-sdk/app-submission-guidelines
before exporting, and capture at the exact pixel sizes listed there
on the day. OpenAI updates the spec; do not rely on a snapshot taken
in this document.

Capture suggestions:

- Use a real iPhone or the iPhone simulator at a current device
  resolution (iPhone 15 / 16 Pro is a good default).
- Use real businesses (Dublin Iron Gym, The Nail Studio, etc), not
  test data, so reviewers see what end users will see.
- For the ChatGPT screenshots, use a fresh chat with no extra apps
  enabled, so the OpenBook integration is unambiguously what
  produced the answer.

## Logo / app icon

Use the existing OpenBook icon set in `public/icons/`. If OpenAI
requires a specific square size not in that set, export from the
master logo at the requested resolution.
