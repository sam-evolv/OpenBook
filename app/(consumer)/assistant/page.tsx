import { BottomTabBar } from '@/components/consumer/BottomTabBar';
import { AssistantChat } from './AssistantChat';

export const dynamic = 'force-dynamic';

export default function AssistantPage() {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden text-white antialiased">
      {/* Soft atmospheric background */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(760px 460px at 50% 20%, rgba(212,175,55,0.15), transparent 58%),' +
            'radial-gradient(620px 360px at 12% 78%, rgba(212,175,55,0.07), transparent 64%),' +
            'linear-gradient(180deg, #060605 0%, #020202 100%)',
        }}
      />

      <AssistantChat />
      <BottomTabBar />
    </main>
  );
}
