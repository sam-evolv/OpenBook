import { ConsumerHeader } from '@/components/consumer/ConsumerHeader';
import { BottomTabBar } from '@/components/consumer/BottomTabBar';
import { AssistantChat } from './AssistantChat';

export const dynamic = 'force-dynamic';

export default function AssistantPage() {
  return (
    <main className="relative min-h-[100dvh] text-white antialiased overflow-hidden">
      {/* Soft atmospheric background */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(900px 500px at 50% 30%, rgba(212,175,55,0.10), transparent 60%),' +
            'linear-gradient(180deg, #050505 0%, #020202 100%)',
        }}
      />

      <ConsumerHeader domain="openbook.ie" showLayout={false} />
      <AssistantChat />
      <BottomTabBar />
    </main>
  );
}
