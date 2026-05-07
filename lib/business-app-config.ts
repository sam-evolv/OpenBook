export type HeroStyle = 'cinematic' | 'clean' | 'logo-led' | 'gallery-first';
export type AppIconStyle = 'glossy' | 'flat' | 'dark-glass' | 'gold';
export type PreviewDevice = 'iphone' | 'android' | 'compact';

export interface BusinessAppConfig {
  heroStyle: HeroStyle;
  appIconStyle: AppIconStyle;
  ctaLabel: string;
  featuredServiceId: string | null;
  heroFocalPoint: { x: number; y: number };
  sections: {
    gallery: boolean;
    about: boolean;
    hours: boolean;
    contact: boolean;
  };
}

export const CTA_LABELS = [
  'Book now',
  'Book from Free',
  'Reserve a slot',
  'View services',
  'Start booking',
] as const;

export const DEFAULT_APP_CONFIG: BusinessAppConfig = {
  heroStyle: 'cinematic',
  appIconStyle: 'glossy',
  ctaLabel: 'Book from Free',
  featuredServiceId: null,
  heroFocalPoint: { x: 50, y: 42 },
  sections: {
    gallery: true,
    about: true,
    hours: true,
    contact: true,
  },
};

function numberInRange(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function boolOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function getBusinessAppConfig(raw: unknown): BusinessAppConfig {
  const source =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, any>).openbook_app_config
      : null;
  const cfg =
    source && typeof source === 'object' && !Array.isArray(source)
      ? (source as Record<string, any>)
      : {};

  const heroStyle: HeroStyle =
    cfg.heroStyle === 'clean' ||
    cfg.heroStyle === 'logo-led' ||
    cfg.heroStyle === 'gallery-first' ||
    cfg.heroStyle === 'cinematic'
      ? cfg.heroStyle
      : DEFAULT_APP_CONFIG.heroStyle;

  const appIconStyle: AppIconStyle =
    cfg.appIconStyle === 'flat' ||
    cfg.appIconStyle === 'dark-glass' ||
    cfg.appIconStyle === 'gold' ||
    cfg.appIconStyle === 'glossy'
      ? cfg.appIconStyle
      : DEFAULT_APP_CONFIG.appIconStyle;

  const ctaLabel =
    typeof cfg.ctaLabel === 'string' && CTA_LABELS.includes(cfg.ctaLabel as any)
      ? cfg.ctaLabel
      : DEFAULT_APP_CONFIG.ctaLabel;

  const focal = cfg.heroFocalPoint ?? {};
  const sections = cfg.sections ?? {};

  return {
    heroStyle,
    appIconStyle,
    ctaLabel,
    featuredServiceId:
      typeof cfg.featuredServiceId === 'string' && cfg.featuredServiceId
        ? cfg.featuredServiceId
        : null,
    heroFocalPoint: {
      x: numberInRange(focal.x, DEFAULT_APP_CONFIG.heroFocalPoint.x),
      y: numberInRange(focal.y, DEFAULT_APP_CONFIG.heroFocalPoint.y),
    },
    sections: {
      gallery: boolOr(sections.gallery, DEFAULT_APP_CONFIG.sections.gallery),
      about: boolOr(sections.about, DEFAULT_APP_CONFIG.sections.about),
      hours: boolOr(sections.hours, DEFAULT_APP_CONFIG.sections.hours),
      contact: boolOr(sections.contact, DEFAULT_APP_CONFIG.sections.contact),
    },
  };
}

export function mergeBusinessAppConfig(raw: unknown, config: BusinessAppConfig) {
  const base =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? { ...(raw as Record<string, unknown>) }
      : raw
        ? { legacy_offers: raw }
        : {};

  return {
    ...base,
    openbook_app_config: config,
  };
}
