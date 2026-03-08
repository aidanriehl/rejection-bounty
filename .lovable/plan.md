

## Problem

The weekly recap (DrawingReveal + WeeklySummary) renders **behind** the feature tour for new users. Even though the tour is at `z-[100]` and the drawing is at `z-[70]`, the drawing is still actively running underneath — playing animations, sounds, and blocking interaction. The `localStorage("show-tour")` check is fragile because the tour component removes that flag early.

## Fix

**In `src/pages/Challenges.tsx`**: Instead of relying on `localStorage("show-tour")`, check whether the FeatureTour is currently active in the parent (`App.tsx` renders it via `showTour` state). The simplest robust approach:

1. **Never show WeeklySummary while tour is active.** Add a prop `tourActive` to `Challenges` (or read it from a shared source). If the tour is active, force `summaryDone = true`.

2. **Simplest implementation**: In `AppRoutes` in `App.tsx`, pass `showTour` state down so `Challenges` can access it. Options:
   - Pass via React context (cleanest)
   - Use a global event or a persistent localStorage flag that isn't cleared until after Challenges mounts

**Recommended approach**: Create a simple context or just keep the `show-tour` localStorage flag around longer. Currently the tour removes it on mount — instead, only remove it after the tour **completes**. Then the existing check in Challenges will work.

### Changes

1. **`src/components/FeatureTour.tsx`**: Move the `localStorage.removeItem("show-tour")` from the mount effect to the `onComplete` callback (or the final slide dismiss).

2. **`src/pages/Challenges.tsx`**: The existing `localStorage.getItem("show-tour") === "true"` check will now work correctly since the flag persists throughout the tour.

3. **Backup guard**: Keep the account-age check (`< 7 days`) as a safety net.

This is a 2-line change that fixes the root cause.

