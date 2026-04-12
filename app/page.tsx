import { redirect } from 'next/navigation'

// Root redirects to the dashboard overview.
// app/(dashboard)/overview/page.tsx is the actual overview page.
export default function RootPage() {
  redirect('/overview')
}
