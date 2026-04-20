'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Calendar, ImageIcon, Info, X, ChevronLeft } from 'lucide-react';
import { BusinessHome } from './BusinessHome';
import { BusinessBook } from './BusinessBook';
import { BusinessGallery } from './BusinessGallery';
import { BusinessAbout } from './BusinessAbout';

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

  const primary = business.primary_colour ?? '#D4AF37';
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
    <main
      className="relative min-h-[100dvh] text-white overflow-hidden"
      style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}
    >
      {/* Close button (top left) */}
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

      {/* Bottom tab bar — specific to this business, replaces the home-screen dock */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div
          className="mx-auto max-w-md backdrop-blur-2xl"
          style={{
            background: 'rgba(0,0,0,0.65)',
            borderTop: '0.5px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-center justify-around px-2 py-2">
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
    </main>
  );
}
