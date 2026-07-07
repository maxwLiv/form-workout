# Form Workout Tracker

Version 0.8.0 - phases 1-8

A React Native and Expo workout tracker built for iPhone development from Windows.

## Included

- Exercise library with types, muscle groups, tracking methods, search, and filters
- Workout plans with ordered exercises and editable set prescriptions
- Active workout logging across strength, timed, distance, interval, and count methods
- Weekly workout and recovery-day scheduling
- Today dashboard connected to the current weekday
- Offline SQLite persistence for exercises, plans, schedule, and completed sessions
- Filterable workout history, session details, progress trends, and personal records
- Synchronized same-day completion status across Today and Schedule
- Apple HIG-oriented accessibility, typography, touch targets, and modal behavior
- Pound/kilogram and mile/kilometer preferences with converted display and entry
- Data reset controls and an explicit completed-results-to-plan workflow
- Versioned JSON backup export and validated, confirmed data restore

## Run locally

Install Node.js and Expo Go, then run:

```powershell
npm.cmd install
npm.cmd start -- --clear
```

Scan the QR code with Expo Go. This project targets Expo SDK 57 and requires Node.js 22.13 or newer.

## Release builds

The iOS bundle identifier and Android application ID are both `com.maxliv.formworkout`.

After signing in to Expo Application Services, link the local app to an EAS project and create builds with:

```powershell
npx eas-cli@latest init
npx eas-cli@latest build --profile preview --platform all
npx eas-cli@latest build --profile production --platform all
```

Production build numbers are managed remotely and increment automatically. Store submission credentials are intentionally not committed to this repository.

## Data storage

Device data is stored locally in `form-workout.db` through Expo SQLite. The database uses a versioned state record so future migrations can be added without changing the UI data layer.

Settings can export all exercises, plans, schedules, preferences, and workout history as a versioned JSON backup through the system share sheet. Import validates the complete backup before asking for confirmation and replacing the local database.

## Dependency audit note

The project uses the Expo SDK 57 dependency versions selected by `npx expo install --fix`. Run `npm run doctor` after dependency or configuration changes.

## Not included in ZIP snapshots

`node_modules`, `.expo`, generated bundles, and caches are excluded. Run `npm.cmd install` after extracting a snapshot.
