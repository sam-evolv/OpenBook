import dynamic from 'next/dynamic';
import { Nav } from '@/components/marketing/Nav';
import { Hero } from '@/components/marketing/Hero';
import { Marquee } from '@/components/marketing/Marquee';
import { ProblemStrikethrough } from '@/components/marketing/ProblemStrikethrough';
import { ThreeSteps } from '@/components/marketing/ThreeSteps';
import { Features } from '@/components/marketing/Features';
import { ConsumerPreview } from '@/components/marketing/ConsumerPreview';
import { BuiltInIreland } from '@/components/marketing/BuiltInIreland';
import { Pricing } from '@/components/marketing/Pricing';
import { FAQ } from '@/components/marketing/FAQ';
import { FinalCTA } from '@/components/marketing/FinalCTA';
import { Footer } from '@/components/marketing/Footer';

const AIDistribution = dynamic(() =>
  import('@/components/marketing/AIDistribution').then((m) => m.AIDistribution),
);
const DashboardPreview = dynamic(() =>
  import('@/components/marketing/DashboardPreview').then((m) => m.DashboardPreview),
);

export default function Page() {
  return (
    <main className="relative bg-ink text-paper">
      <Nav />
      <Hero />
      <Marquee />
      <ProblemStrikethrough />
      <AIDistribution />
      <ThreeSteps />
      <Features />
      <DashboardPreview />
      <ConsumerPreview />
      <BuiltInIreland />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
