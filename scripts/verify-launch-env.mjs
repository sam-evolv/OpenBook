import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = new Set(process.argv.slice(2));
const strict = args.has('--strict');
const production = args.has('--production');
const network = args.has('--network');

const env = loadEnv([
  '.env',
  '.env.local',
  '.env.production',
  '.env.production.local',
]);

const checks = [];

function record(level, label, detail) {
  checks.push({ level, label, detail });
}

function value(key) {
  const raw = process.env[key] ?? env[key] ?? '';
  return raw.trim();
}

function isPlaceholder(v) {
  return (
    !v ||
    /placeholder|changeme|change_me|your_|example|dummy|test-value/i.test(v)
  );
}

function requireKey(key, options = {}) {
  const v = value(key);
  if (isPlaceholder(v)) {
    record('error', key, 'Missing or placeholder value.');
    return '';
  }
  if (options.minLength && v.length < options.minLength) {
    record('error', key, `Too short. Expected at least ${options.minLength} characters.`);
  }
  if (options.startsWith && !v.startsWith(options.startsWith)) {
    record(
      production && options.productionOnly ? 'error' : 'warn',
      key,
      `Expected to start with ${options.startsWith}.`,
    );
  }
  return v;
}

function optionalKey(key) {
  const v = value(key);
  if (isPlaceholder(v)) {
    record('warn', key, 'Not set. Fine if this feature is intentionally disabled at launch.');
  }
  return v;
}

function requireHttpsUrl(key) {
  const v = requireKey(key);
  if (!v) return null;
  try {
    const url = new URL(v);
    if (url.protocol !== 'https:') {
      record('error', key, 'Must use https in production.');
    }
    return url;
  } catch {
    record('error', key, 'Must be a valid URL.');
    return null;
  }
}

const appUrl = requireHttpsUrl('NEXT_PUBLIC_APP_URL');
const supabaseUrl = requireHttpsUrl('NEXT_PUBLIC_SUPABASE_URL');
requireKey('NEXT_PUBLIC_SUPABASE_ANON_KEY', { minLength: 20 });
requireKey('SUPABASE_SERVICE_ROLE_KEY', { minLength: 20 });

requireKey('STRIPE_SECRET_KEY', {
  startsWith: production ? 'sk_live_' : 'sk_',
  productionOnly: true,
});
requireKey('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', {
  startsWith: production ? 'pk_live_' : 'pk_',
  productionOnly: true,
});
requireKey('STRIPE_WEBHOOK_SECRET', { startsWith: 'whsec_' });

requireKey('OPENAI_API_KEY', { startsWith: 'sk-' });
requireKey('MCP_HOLD_SIGNING_KEY', { minLength: 32 });
requireKey('MCP_POLLING_TOKEN_KEY', { minLength: 32 });
requireKey('VERCEL_CRON_SECRET', { minLength: 32 });
optionalKey('RESEND_API_KEY');

const appDomain = requireKey('APP_DOMAIN');
if (appUrl && appDomain && appUrl.hostname !== appDomain) {
  record(
    'warn',
    'APP_DOMAIN',
    `APP_DOMAIN is ${appDomain}, but NEXT_PUBLIC_APP_URL host is ${appUrl.hostname}.`,
  );
}

if (production && appUrl?.hostname.endsWith('.vercel.app')) {
  record('error', 'NEXT_PUBLIC_APP_URL', 'Production builds should point at app.openbook.ie, not a Vercel preview host.');
}

if (supabaseUrl && !supabaseUrl.hostname.endsWith('.supabase.co')) {
  record('warn', 'NEXT_PUBLIC_SUPABASE_URL', 'Host is not a standard supabase.co project URL. Confirm this is intentional.');
}

const whatsappKeys = [
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_BUSINESS_ACCOUNT_ID',
  'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
];
const whatsappSet = whatsappKeys.filter((key) => !isPlaceholder(value(key)));
if (whatsappSet.length > 0 && whatsappSet.length < whatsappKeys.length) {
  record('warn', 'WhatsApp', 'Some WhatsApp keys are set and some are missing. Either complete the set or disable the feature.');
} else if (whatsappSet.length === 0) {
  record('warn', 'WhatsApp', 'No WhatsApp keys set. Fine only if WhatsApp launch is intentionally deferred.');
}

const publicUrls = [
  ['Privacy policy', 'https://openbook.ie/privacy'],
  ['Terms', 'https://openbook.ie/terms'],
  ['Support email', 'mailto:support@openbook.ie'],
];

for (const [label, url] of publicUrls) {
  record('info', label, url);
}

if (network) {
  await probeUrl('NEXT_PUBLIC_APP_URL', appUrl);
  await probeUrl('Privacy policy', new URL('https://openbook.ie/privacy'));
  await probeUrl('Terms', new URL('https://openbook.ie/terms'));
}

printReport();

if (strict && checks.some((check) => check.level === 'error')) {
  process.exit(1);
}

function loadEnv(files) {
  const loaded = {};
  for (const file of files) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;
    const lines = readFileSync(path, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
      if (!match) continue;
      const [, key, raw] = match;
      loaded[key] = stripQuotes(raw.trim());
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

async function probeUrl(label, url) {
  if (!url) return;
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    if (res.ok) {
      record('info', label, `Reachable (${res.status}).`);
    } else {
      record('warn', label, `Returned HTTP ${res.status}.`);
    }
  } catch (err) {
    record('warn', label, `Network probe failed: ${err?.message ?? String(err)}`);
  }
}

function printReport() {
  const icon = { error: 'x', warn: '!', info: '-' };
  console.log('\nLaunch environment preflight');
  console.log(production ? 'Mode: production' : 'Mode: local/staging');
  for (const check of checks) {
    console.log(`${icon[check.level]} ${check.label}: ${check.detail}`);
  }
  const errors = checks.filter((check) => check.level === 'error').length;
  const warnings = checks.filter((check) => check.level === 'warn').length;
  console.log(`\n${errors} error(s), ${warnings} warning(s).`);
  if (!strict && (errors || warnings)) {
    console.log('Run with --strict to fail on errors, or --strict --production for the launch gate.');
  }
}
