# Form Workout Sprint Test Cases

Use this checklist before each TestFlight release and after meaningful OTA updates. Keep notes short and action-oriented: device, build/version, test result, and what happened.

## Release Info

- App version:
- Build number:
- OTA update group, if applicable:
- Device:
- iOS version:
- Tester:
- Date:

## Result Key

- Pass: Works as expected.
- Pass with fallback: Primary path is unavailable, but the app gives a clear working alternative.
- Fail: Behavior is broken, confusing, silent, or causes data loss.
- Needs design review: Function works, but the screen feels cluttered, unclear, or hard to use.

## Every Release Smoke Tests

1. Launch app
   - Steps: Install or update the TestFlight build. Open the app from a closed state.
   - Expected: App opens without crashing and lands on Today.

2. Navigate main tabs
   - Steps: Visit Today, Plans, Schedule, Exercises, and Progress.
   - Expected: Each screen loads without crash or blank state.

3. Open Settings
   - Steps: Tap Settings from Today.
   - Expected: Settings opens and closes cleanly.

4. Start and close a workout
   - Steps: Start a scheduled or plan workout, enter at least one set value, close the logger.
   - Expected: App preserves the active workout draft.

5. Resume active workout
   - Steps: Reopen the active workout.
   - Expected: Previous typed values are still present.

6. Finish workout
   - Steps: Complete and save a workout.
   - Expected: Workout saves to history/progress, and the reusable plan is not changed unless explicitly applied.

7. Data persistence
   - Steps: Fully close and reopen the app.
   - Expected: Plans, schedule, preferences, profile values, and workout history remain.

## Sprint 1.1 - Active Workout Drafts

1. Single active workout
   - Steps: Start a workout, then try to start another workout.
   - Expected: App prevents accidental replacement or prompts clearly.

2. Edit active workout sets
   - Steps: Add and remove sets during an active workout.
   - Expected: Set list updates correctly and remains after closing/reopening.

3. Add existing exercise during workout
   - Steps: Add an existing exercise to an active workout.
   - Expected: Exercise appears only in the active workout session.

4. Create exercise during workout
   - Steps: Create a new exercise from the workout logger and add it to the session.
   - Expected: Exercise is available in the library and usable in the active workout.

5. Remove exercise from active workout
   - Steps: Remove one exercise during an active workout.
   - Expected: Exercise is removed from that session only; original plan is unchanged.

6. Save active workout as plan
   - Steps: Modify an active workout and save it as a reusable plan.
   - Expected: New plan is created without replacing the original plan.

## Sprint 1.2B - Starter Templates, Plan Search, Feedback

1. Plans template entry
   - Steps: Open Plans.
   - Expected: One clear Templates button appears near the plan count. There should not be duplicate template buttons in the header.

2. Template browser opens
   - Steps: Tap Templates.
   - Expected: Starter Templates modal opens with plan cards, metadata, filters, and preview exercises.

3. Template filters
   - Steps: Tap several category filters.
   - Expected: Template list updates and remains readable.

4. Import one template
   - Steps: Import a template that is not already added.
   - Expected: Confirmation appears, plan is added, and supporting exercises are available.

5. Duplicate template protection
   - Steps: Try importing the same template again.
   - Expected: App does not duplicate the plan and clearly marks it as already added.

6. Import all templates
   - Steps: Tap Import all.
   - Expected: Missing templates are added once; existing plans and exercises are not duplicated or overwritten.

7. Create/edit plan exercise search
   - Steps: Create or edit a plan. Search exercises by name, muscle group, type, or equipment.
   - Expected: Exercise list filters quickly, shows a count, and clear search restores the list.

8. No exercise search results
   - Steps: Search for a nonsense term.
   - Expected: App shows a no-results state and still offers creating a new exercise.

9. Today feedback entry
   - Steps: Open Today and tap the feedback icon near Settings.
   - Expected: Feedback modal opens without leaving Today.

10. Settings feedback entry
    - Steps: Open Settings and tap Send feedback.
    - Expected: Same feedback modal opens.

11. Feedback required message
    - Steps: Open feedback, leave message blank, tap Send.
    - Expected: App asks for a message and does not silently fail.

12. Feedback with Apple Mail configured
    - Steps: Enter feedback and tap Send on a device with Apple Mail configured.
    - Expected: Native email composer opens with recipient `maxwellliv@gmail.com`, subject, message, steps, and app context.

13. Feedback with Outlook/default email
    - Steps: Enter feedback on a device using Outlook as default email app and tap Send.
    - Expected: Outlook opens with a prepared email addressed to `maxwellliv@gmail.com`.

14. Feedback manual fallback
    - Steps: Test on a device where email cannot be opened.
    - Expected: App shows a prepared report, plus clear actions to open Outlook/default email or select the report text.

15. Feedback report context
    - Steps: Review the prepared email body.
    - Expected: Includes app version, platform, submitted timestamp, plan/exercise/session counts, active draft status, and units. It should not attach private workout details.

## Sprint 2.1A - Profile and Body Metrics

1. Update profile basics
   - Steps: Open Settings and update display name, height, goal, experience, and preferred training days.
   - Expected: Values update and persist after closing/reopening Settings.

2. Save bodyweight entry
   - Steps: Add a bodyweight value and optional note.
   - Expected: Entry appears in recent bodyweight list.

3. Delete bodyweight entry
   - Steps: Delete a recent bodyweight entry.
   - Expected: Entry is removed and does not return after app restart.

4. Unit conversion
   - Steps: Switch weight unit between lb and kg.
   - Expected: Bodyweight and workout values display in the selected unit without corrupting stored data.

5. Backup includes profile data
   - Steps: Export a backup.
   - Expected: Backup completes successfully and includes profile, bodyweight, preferences, plans, exercises, sessions, schedule, and active draft data.

## Regression Checks For Tester Ideas

1. Efficient tracking guardrail
   - Question: Does the new change help someone track, repeat, or understand a workout with less friction?
   - Expected: If no, consider deferring or rejecting the idea.

2. No surprise data changes
   - Question: Did the change alter existing plans, exercises, schedule, sessions, or profile values without explicit user action?
   - Expected: No.

3. No silent failure
   - Question: If a device capability is unavailable, does the app explain what happened and provide a next action?
   - Expected: Yes.

4. Screen density
   - Question: Did the change add duplicate buttons, unclear icons, or settings clutter?
   - Expected: No duplicate entry points unless each one has a distinct purpose.

5. Small-device layout
   - Steps: Test on a smaller iPhone viewport/device.
   - Expected: Text does not overlap, buttons remain tappable, and modals are scrollable.

## Pre-Release Command Checklist

Run these before a build or production OTA:

```powershell
$env:Path = 'C:\Program Files\nodejs;C:\Program Files\Git\cmd;' + $env:Path
npm.cmd run typecheck
npx.cmd expo-doctor --verbose
npx.cmd expo export --platform ios --output-dir dist-ios
npx.cmd expo export --platform android --output-dir dist-android
```

For JS-only OTA updates on the current runtime:

```powershell
npx.cmd eas-cli@latest update --channel production --environment production --message "Short update message"
```

Use a new EAS build when native dependencies, runtime version, app version, app config requiring native rebuild, icons/splash/native assets, or store-facing binary behavior changes.
