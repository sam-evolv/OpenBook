import LandingPage from '@/components/landing/LandingPage'

// Pure static landing page — no server-side auth.
// Authenticated-user redirect to /overview is handled by middleware.
export default function Home() {
  return <LandingPage />
}
