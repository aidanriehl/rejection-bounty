

**Fix:** The modal card is anchored to the bottom (`items-end`) inside a container that starts at `top-[30%]` and ends at `bottom-[72px]`, so it hugs the nav bar instead of centering vertically.

**Changes in `src/pages/Profile.tsx`:**

1. Split into two layers:
   - **Backdrop layer:** `fixed inset-0 z-50 bg-black/50` — dims the full screen
   - **Content layer:** `fixed inset-0 z-50 flex items-center justify-center` with `pointer-events-none` — centers the modal card vertically and horizontally on the full screen (above the nav)

2. The modal card itself gets `max-h-[60vh]` and `overflow-y-auto` to cap its height at ~60% of the viewport, keeping it visually centered without being too tall. Add `pointer-events-auto` so it remains interactive.

3. Add `mb-[72px]` or `pb-[72px]` to the centering container so the card centers in the space above the nav bar rather than the full screen.

This keeps the backdrop fullscreen, the card vertically centered in the usable area, and the nav bar visible underneath.

