import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const infoPlistPath = join(root, 'ios/App/App/Info.plist');
const privacyPath = join(root, 'ios/App/App/PrivacyInfo.xcprivacy');
const entitlementsPath = join(root, 'ios/App/App/App.entitlements');
const projectPath = join(root, 'ios/App/App.xcodeproj/project.pbxproj');

function fail(message) {
  console.error(`iOS verification failed: ${message}`);
  process.exit(1);
}

function lintPlist(path) {
  execFileSync('plutil', ['-lint', path], { stdio: 'pipe' });
}

function readPlistJson(path) {
  const output = execFileSync('plutil', ['-convert', 'json', '-o', '-', path], {
    encoding: 'utf8',
  });
  return JSON.parse(output);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

lintPlist(infoPlistPath);
lintPlist(privacyPath);
lintPlist(entitlementsPath);

const info = readPlistJson(infoPlistPath);
const privacy = readPlistJson(privacyPath);
const entitlements = readPlistJson(entitlementsPath);
const project = readFileSync(projectPath, 'utf8');

expect(info.CFBundleDisplayName === 'OpenBook', 'CFBundleDisplayName must be OpenBook.');
expect(
  info.ITSAppUsesNonExemptEncryption === false,
  'ITSAppUsesNonExemptEncryption must be false for the current HTTPS-only app.',
);
expect(info.LSRequiresIPhoneOS === true, 'LSRequiresIPhoneOS must be true.');
expect(
  Array.isArray(info.UISupportedInterfaceOrientations) &&
    info.UISupportedInterfaceOrientations.length === 1 &&
    info.UISupportedInterfaceOrientations[0] === 'UIInterfaceOrientationPortrait',
  'iPhone orientations must be portrait-only for the current phone-first launch.',
);
expect(
  !('NSCameraUsageDescription' in info),
  'Do not declare camera permission until native camera capture is actually shipped.',
);
expect(
  !('NSLocationWhenInUseUsageDescription' in info),
  'Do not declare location permission until native location access is actually shipped.',
);
expect(
  Array.isArray(info.UIBackgroundModes) && info.UIBackgroundModes.includes('remote-notification'),
  'UIBackgroundModes must include remote-notification for push notification delivery.',
);
expect(
  ['development', 'production'].includes(entitlements['aps-environment']),
  'App.entitlements must declare aps-environment for push notifications.',
);
expect(
  (project.match(/CODE_SIGN_ENTITLEMENTS = App\/App\.entitlements;/g) ?? []).length >= 2,
  'Xcode target should wire App/App.entitlements for both build configurations.',
);
expect(
  (project.match(/TARGETED_DEVICE_FAMILY = 1;/g) ?? []).length >= 2,
  'Xcode target should be iPhone-only until the iPad experience is fully QAed.',
);

expect(privacy.NSPrivacyTracking === false, 'Privacy manifest must declare no tracking.');
expect(
  Array.isArray(privacy.NSPrivacyTrackingDomains) && privacy.NSPrivacyTrackingDomains.length === 0,
  'Privacy manifest should not list tracking domains.',
);

const collectedTypes = new Set(
  (privacy.NSPrivacyCollectedDataTypes ?? []).map((entry) => entry.NSPrivacyCollectedDataType),
);
for (const dataType of [
  'NSPrivacyCollectedDataTypeName',
  'NSPrivacyCollectedDataTypeEmailAddress',
  'NSPrivacyCollectedDataTypePhoneNumber',
  'NSPrivacyCollectedDataTypePhotosorVideos',
  'NSPrivacyCollectedDataTypePurchaseHistory',
  'NSPrivacyCollectedDataTypeDeviceID',
]) {
  expect(collectedTypes.has(dataType), `Privacy manifest must include ${dataType}.`);
}

console.log('iOS plist and privacy manifest verification passed.');
