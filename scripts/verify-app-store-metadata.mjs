import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const metadataPath = join(process.cwd(), 'docs/app-store-metadata.json');
const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
const shouldCheckNetwork = process.argv.includes('--network');

function fail(message) {
  console.error(`App Store metadata verification failed: ${message}`);
  process.exit(1);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function charCount(value) {
  return [...String(value ?? '')].length;
}

function requireText(key, maxLength) {
  expect(typeof metadata[key] === 'string' && metadata[key].trim().length > 0, `${key} is required.`);
  expect(charCount(metadata[key]) <= maxLength, `${key} must be ${maxLength} characters or fewer.`);
}

function requireHttpsUrl(key) {
  expect(typeof metadata[key] === 'string', `${key} is required.`);
  let parsed;
  try {
    parsed = new URL(metadata[key]);
  } catch {
    fail(`${key} must be a valid URL.`);
  }
  expect(parsed.protocol === 'https:', `${key} must use https.`);
  return parsed.toString();
}

requireText('appName', 30);
requireText('subtitle', 30);
requireText('promotionalText', 170);
requireText('description', 4000);
requireText('keywords', 100);
requireText('primaryCategory', 40);
requireText('reviewNotes', 4000);

expect(!metadata.subtitle.toLowerCase().includes('iphone'), 'Subtitle should not rely on Apple trademark wording.');
expect(
  /free|in-person|reviewer-safe/i.test(metadata.reviewNotes),
  'reviewNotes must explain the reviewer-safe booking path.',
);
expect(
  Array.isArray(metadata.demoInstructions) && metadata.demoInstructions.length >= 4,
  'demoInstructions must include the App Review test path.',
);
expect(
  Array.isArray(metadata.screenshotPlan) && metadata.screenshotPlan.length >= 6,
  'screenshotPlan should cover the main App Store screenshot set.',
);

const urls = [
  requireHttpsUrl('supportUrl'),
  requireHttpsUrl('marketingUrl'),
  requireHttpsUrl('privacyPolicyUrl'),
  requireHttpsUrl('termsUrl'),
];

if (shouldCheckNetwork) {
  await Promise.all(
    urls.map(async (url) => {
      const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      if (!response.ok) {
        throw new Error(`${url} returned ${response.status}`);
      }
    }),
  ).catch((error) => fail(error.message));
}

console.log(
  `App Store metadata verification passed${shouldCheckNetwork ? ' with URL checks' : ''}.`,
);
