# App Privacy Labels

This file translates OpenBook's current data collection into App Store Connect language. Reconcile it with the live privacy policy before submission.

## Tracking

- Tracking: No.
- Tracking domains: None declared in `PrivacyInfo.xcprivacy`.

## Data Linked To The User

### Contact Info

- Name: used for account, bookings, customer records, business owner profiles, and booking confirmations.
- Email Address: used for sign-in, account recovery, owner/customer records, booking confirmations, and support.
- Phone Number: used for booking contact, customer records, WhatsApp/customer communication, and business contact details.

Purpose: App Functionality.

### User Content

- Photos or Videos: business logos, hero images, gallery images, and other uploaded storefront media.

Purpose: App Functionality.

### Purchases

- Purchase History: booking records, paid service history, Stripe payment metadata, credits, packages, and related finance views.

Purpose: App Functionality.

### Identifiers

- Device ID: APNs and Firebase Cloud Messaging registration tokens used to register a device for booking reminders and account notifications.

Purpose: App Functionality.

## Data That May Be Processed By Vendors

- Supabase: auth, database, storage, sessions.
- Stripe: payment processing and connected-account onboarding.
- Resend/email provider: transactional booking and business notification emails.
- Apple Push Notification service and Firebase Cloud Messaging: push notification delivery and device-token routing.
- OpenAI: assistant responses when users interact with AI features.
- Vercel: application hosting and request logs.

Confirm the production privacy policy names these processors before submission.

## Current Native Permission Position

The native iOS shell does not request camera, microphone, contacts, location, photo library, calendar, Bluetooth, or health permissions. It does register for push notifications after permission is granted.

Business image uploads happen through the web upload surface. If future native capture/gallery permissions are added, update both:

- `ios/App/App/Info.plist`
- `ios/App/App/PrivacyInfo.xcprivacy`

## App Review Notes

Recommended review note:

> OpenBook is a phone-first booking app for local businesses. Businesses configure their own app-like storefront in the dashboard, and customers discover, book, manage bookings, and use the AI assistant inside the OpenBook iOS app. A reviewer-safe demo business with a free or in-person booking service is available so review can complete without a live card payment.
