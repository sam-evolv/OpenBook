'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Calendar, ImageIcon, Info, X } from 'lucide-react';
import { BusinessHome } from './BusinessHome';
import { BusinessBook } from './BusinessBook';
import { BusinessGallery } from './BusinessGallery';
import { BusinessAbout } from './BusinessAbout';
import { getTileColour } from '@/lib/tile-palette';

export type BusinessTab = 'home' | 'book' | 'gallery' | 'about';

interface Props {
  business: any;
  services: any[];
  hours: any[];
  initialTab?: BusinessTab;
}

export function BusinessAppShell({ business, services, hours, initialTab = 'home' }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<BusinessTab>(initialTab);
  const [selectedService, setSelectedService] = useState<any>(null);

  const primary = getTileColour(business.primary_colour).mid;
  const gallery = business.gallery_urls ?? [];
  const hasGallery = gallery.length > 0;

  /* When a user clicks Book on the Home tab, switch to Book tab with that service preselected */
  function openBookingForService(service: any) {
    setSelectedService(service);
    setTab('book');
  }

  const tabs: { id: BusinessTab; label: string; icon: any; show: boolean }[] = [
    { id: 'home', label: 'Home', icon: Home, show: true },
    { id: 'book', label: 'Book', icon: Calendar, show: true },
    { id: 'gallery', label: 'Gallery', icon: ImageIcon, show: hasGallery },
    { id: 'about', label: 'About', icon: Info, show: true },
  ];
  const visibleTabs = tabs.filter((t) => t.show);

  return (
    <>
      <main
        className="relative min-h-[100dvh] text-white overflow-x-hidden"
        style={{ paddingBottom: 'calc(116px + env(safe-area-inset-bottom))' }}
      >
        {/* Content */}
        <div className="relative">
          {tab === 'home' && (
            <BusinessHome
              business={business}
              services={services}
              onBookService={openBookingForService}
              onOpenGallery={() => setTab('gallery')}
              hasGallery={hasGallery}
            />
          )}
          {tab === 'book' && (
            <BusinessBook
              business={business}
              services={services}
              selectedService={selectedService}
              onSelectService={setSelectedService}
            />
          )}
          {tab === 'gallery' && <BusinessGallery business={business} />}
          {tab === 'about' && <BusinessAbout business={business} hours={hours} />}
        </div>
      </main>

      {/* Close button (top left) — rendered as a top-level sibling so it
          anchors to the viewport, not the <main> containing block. */}
      <button
        onClick={() => router.push('/home')}
        className="fixed top-[calc(16px+env(safe-area-inset-top))] left-4 z-50 h-10 w-10 rounded-full backdrop-blur-xl flex items-center justify-center active:scale-90 transition-transform"
        style={{
          background: 'rgba(0,0,0,0.5)',
          border: '0.5px solid rgba(255,255,255,0.1)',
        }}
        aria-label="Close"
      >
        <X className="h-5 w-5 text-white" strokeWidth={2} />
      </button>

      {/* Bottom tab bar — specific to this business, replaces the home-screen
          dock. Rendered outside <main> so position: fixed always anchors to
          the viewport regardless of any transform/overflow on page content. */}
      <nav
        className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 px-4"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        <div
          className="pointer-events-auto mx-auto max-w-md rounded-[30px] backdrop-blur-2xl"
          style={{
            background:
              'linear-gradient(180deg, rgba(31,31,36,0.88) 0%, rgba(12,12,15,0.88) 100%)',
            border: '0.5px solid rgba(255,255,255,0.12)',
            boxShadow:
              '0 1px 0 rgba(255,255,255,0.10) inset, 0 18px 46px rgba(0,0,0,0.58), 0 4px 12px rgba(0,0,0,0.36)',
          }}
        >
          <div className="flex items-center justify-around px-3 py-2.5">
            {visibleTabs.map((t) => {
              const active = tab === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all active:scale-95"
                  style={{ minWidth: 64 }}
                >
                  <Icon
                    className="h-[22px] w-[22px]"
                    strokeWidth={active ? 2.4 : 1.8}
                    style={{ color: active ? primary : 'rgba(255,255,255,0.55)' }}
                  />
                  <span
                    className="text-[10px] font-medium"
                    style={{
                      color: active ? primary : 'rgba(255,255,255,0.55)',
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
