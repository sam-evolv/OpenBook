import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const argv = process.argv.slice(2);
const strict = argv.includes('--strict');
const slug =
  readArg('--slug') ??
  process.env.DEMO_BUSINESS_SLUG ??
  loadEnv(['.env.local', '.env.production.local']).DEMO_BUSINESS_SLUG ??
  'evolv-performance';

const env = loadEnv(['.env', '.env.local', '.env.production', '.env.production.local']);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;

const checks = [];

function record(level, label, detail) {
  checks.push({ level, label, detail });
}

if (!supabaseUrl || !serviceRole) {
  record(
    strict ? 'error' : 'warn',
    'Supabase credentials',
    'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to check demo data.',
  );
  printReport();
  process.exit(strict ? 1 : 0);
}

const sb = createClient(supabaseUrl, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: business, error: businessError } = await sb
  .from('businesses')
  .select(
    'id, slug, name, category, city, tagline, description, about_long, logo_url, processed_icon_url, cover_image_url, hero_image_url, gallery_urls, primary_colour, is_live',
  )
  .eq('slug', slug)
  .maybeSingle();

if (businessError) {
  record('error', 'Demo business query', businessError.message);
  printReport();
  process.exit(1);
}

if (!business) {
  record('error', 'Demo business', `No business found for slug "${slug}".`);
  printReport();
  process.exit(1);
}

record('info', 'Demo business', `${business.name} (${business.slug})`);

if (!business.is_live) record('error', 'Business visibility', 'Demo business is not live.');
if (!business.city) record('error', 'City', 'Missing city.');
if (!business.category) record('warn', 'Category', 'Missing category.');
if (!business.primary_colour) record('warn', 'App colour', 'Missing primary colour.');
if (!business.logo_url && !business.processed_icon_url) {
  record('warn', 'Logo', 'No uploaded or processed logo. The tile will fall back to initials.');
}
if (!business.hero_image_url && !business.cover_image_url) {
  record('warn', 'Hero image', 'No hero/cover image. The storefront will use a generated fallback.');
}
if ((business.gallery_urls ?? []).length < 3) {
  record('warn', 'Gallery', `Only ${(business.gallery_urls ?? []).length} gallery image(s). Aim for at least 3.`);
}
if ((business.tagline ?? business.description ?? '').trim().length < 24) {
  record('warn', 'One-line promise', 'Tagline/description is short. Add a concrete customer-facing promise.');
}
if ((business.about_long ?? business.description ?? '').trim().length < 120) {
  record('warn', 'Story', 'Story is light. A fuller story makes the app feel more like the business owns it.');
}

const { data: services, error: servicesError } = await sb
  .from('services')
  .select('id, name, description, duration_minutes, price_cents, is_active')
  .eq('business_id', business.id)
  .eq('is_active', true)
  .order('sort_order', { ascending: true, nullsFirst: false });

if (servicesError) {
  record('error', 'Services query', servicesError.message);
} else if (!services || services.length === 0) {
  record('error', 'Services', 'No active services. App Review needs at least one bookable service.');
} else {
  record('info', 'Services', `${services.length} active service(s).`);
  const free = services.find((service) => Number(service.price_cents ?? 0) === 0);
  if (free) {
    record('info', 'Reviewer-safe booking', `Free service available: ${free.name}.`);
  } else {
    record(
      'warn',
      'Reviewer-safe booking',
      'No free service. Create a free/in-person reviewer service before App Review if paid Stripe flow is not the intended review path.',
    );
  }
  const weakServices = services.filter(
    (service) =>
      !service.duration_minutes ||
      service.duration_minutes <= 0 ||
      (service.description ?? '').trim().length < 24,
  );
  if (weakServices.length > 0) {
    record(
      'warn',
      'Service detail',
      `${weakServices.length} service(s) need stronger duration/description detail.`,
    );
  }
}

printReport();

const hasErrors = checks.some((check) => check.level === 'error');
const hasWarnings = checks.some((check) => check.level === 'warn');
if (hasErrors || (strict && hasWarnings)) {
  process.exit(1);
}

function readArg(name) {
  const raw = argv.find((arg) => arg.startsWith(`${name}=`));
  return raw ? raw.slice(name.length + 1).trim() : null;
}

function loadEnv(files) {
  const loaded = {};
  for (const file of files) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
      if (!match) continue;
      loaded[match[1]] = stripQuotes(match[2].trim());
    }
  }
  return loaded;
}

function stripQuotes(raw) {
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1);
  }
  return raw;
}

function printReport() {
  const icon = { error: 'x', warn: '!', info: '-' };
  console.log(`\nApp Review demo readiness: ${slug}`);
  for (const check of checks) {
    console.log(`${icon[check.level]} ${check.label}: ${check.detail}`);
  }
  const errors = checks.filter((check) => check.level === 'error').length;
  const warnings = checks.filter((check) => check.level === 'warn').length;
  console.log(`\n${errors} error(s), ${warnings} warning(s).`);
}
