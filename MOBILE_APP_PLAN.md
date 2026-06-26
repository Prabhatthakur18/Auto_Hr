# Mobile App (Android APK) Plan

Internal-distribution Android app wrapping the existing HR web app, with working push notifications.

## Current Stack (as of 2026-06-23)

- **Frontend**: Vite + React 18 + TypeScript + Tailwind, plain SPA (no native shell, no Capacitor/RN yet)
- **Backend**: Express + Prisma + PostgreSQL/MySQL (via Prisma), JWT auth via cookies
- **Notifications today**: in-app only (`NotificationBell` component) — works only while a browser tab is open, no push when app is closed/phone locked

## Why Not a Full Rewrite

A React Native / Flutter rewrite would mean duplicating all existing screens, forms, and API logic. Since this is an **internal-only** app (no Play Store requirement, no app-store review constraints), wrapping the existing React app is far less work and keeps one codebase.

## Recommended Approach: Capacitor

[Capacitor](https://capacitorjs.com/) packages the existing Vite/React build into a native Android WebView shell, producing a real installable `.apk`.

- Reuses ~95% of existing frontend code unchanged
- Gives access to native plugins (push notifications, biometrics, file system, etc.)
- No Play Store needed — build a signed APK, distribute directly (e.g. internal file share, MDM, email link)
- iOS later if ever needed, from the same codebase

## Step-by-Step Plan

### Phase 1 — Capacitor Wrapper (basic APK, no push yet)
1. `npm install @capacitor/core @capacitor/cli @capacitor/android` in `frontend/`
2. `npx cap init` — set app id (e.g. `com.autoformindia.hr`) and app name
3. Confirm Vite build output dir (`dist`) is set as Capacitor's `webDir`
4. `npx cap add android`
5. Build frontend (`npm run build`) → `npx cap sync android`
6. Open in Android Studio, generate a signed release APK
7. Sanity check: login, attendance, leave, salary tabs all load correctly inside the WebView
8. Verify API base URL / CORS / cookie settings work from the native WebView context (cookies set with `SameSite`/`Secure` may need adjusting for native origin)

### Phase 2 — Real Push Notifications (Firebase Cloud Messaging)
1. Create a Firebase project, add the Android app, get `google-services.json`
2. `npm install @capacitor/push-notifications`, sync with Android project
3. **Backend (Prisma schema)**: add a table/column to store device push tokens per user (e.g. `DeviceToken { id, userId, token, platform, createdAt }`)
4. **Backend**: new endpoint to register/update a device token on login/app start
5. **Backend**: wherever in-app notifications are currently created (announcements, leave approvals, attendance alerts, etc.), also trigger an FCM push to the user's registered token(s)
6. **Client**: request push permission, listen for token registration/refresh, send token to backend; handle foreground/background notification taps (e.g. deep-link to relevant tab)
7. Test on a real device — phone locked, app killed, app backgrounded

### Phase 3 — Polish
- App icon, splash screen (Capacitor splash screen plugin)
- Handle offline/poor network gracefully (loading states, retry)
- Versioning strategy for re-distributing updated APKs internally (no auto-update via Play Store, so either: re-push APK manually, or add Capacitor's [Live Updates] / a simple "new version available" banner)

## Effort Estimate

| Phase | Effort |
|---|---|
| Phase 1 (Capacitor wrapper, basic APK) | ~1 day |
| Phase 2 (FCM push end-to-end) | 3-5 days, depends on number of notification types |
| Phase 3 (polish) | 1-2 days |

## Open Questions / Decisions Needed
- Which events should trigger push notifications? (leave approval/rejection, salary slip ready, attendance anomaly, announcements — confirm full list against existing in-app notification triggers)
- Distribution mechanism for the APK (shared drive, MDM tool, email)?
- Any requirement for iOS later, or Android-only is sufficient?
