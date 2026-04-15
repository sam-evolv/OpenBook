import { redirect } from 'next/navigation'

// Redirect to /overview — the actual overview page lives at app/(dashboard)/overview/page.tsx
export default function DashboardRootPage() {
  redirect('/overview')
}
