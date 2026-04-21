# Slug rename

The string "Slug" is developer jargon. Business owners who see it think
less of the product. We're keeping `slug` as the database column name and
internal identifier, but every user-facing label, helper text, error
message, and form field gets renamed to "Booking page address".

## Find/replace cheat sheet

Run these searches in the editor across the whole repo. Only update
**user-facing strings** — never rename TypeScript identifiers, database
columns, route segments, or API parameters.

| Find (case-sensitive) | Replace with |
|---|---|
| `"Slug"` | `"Booking page address"` |
| `'Slug'` | `'Booking page address'` |
| `>Slug<` | `>Booking page address<` |
| `Slug:` (in JSX/labels) | `Booking page address:` |
| `slug is required` | `Booking page address is required` |
| `Invalid slug` | `Invalid booking page address` |
| `Slug already taken` | `That booking page address is already taken` |
| `Choose a slug` | `Choose your booking page address` |
| `Your slug` | `Your booking page address` |

## Helper text under the field

Show this under the input when editing the booking page address:

> Your booking page lives at openbook.ie/[address]. Use lowercase letters,
> numbers, and hyphens. Pick something short and memorable — your
> customers will type it.

## Validation messages

```ts
const bookingPageAddressSchema = z
  .string()
  .min(3, 'Your booking page address needs at least 3 characters.')
  .max(40, 'Keep your booking page address under 40 characters.')
  .regex(
    /^[a-z0-9-]+$/,
    'Use only lowercase letters, numbers, and hyphens.',
  )
  .refine(
    (s) => !s.startsWith('-') && !s.endsWith('-'),
    'Cannot start or end with a hyphen.',
  );
```

## What to leave alone

- Database column: `businesses.slug`
- API parameters: `?slug=evolv-businessname`
- Route segments: `app/[slug]/page.tsx`
- TypeScript types: `Business['slug']`
- Internal log messages
- Code comments
