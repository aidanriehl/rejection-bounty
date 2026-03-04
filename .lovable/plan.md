

## Plan: Brick-drop animation for challenge cards after reveal

The current `justRevealed` animation drops all cards from above with rotation. The user wants a more deliberate "bricks stacking" effect — each card falls from above and lands in place sequentially, like bricks being laid.

### Changes in `src/pages/Challenges.tsx`

Update the `justRevealed` animation on each challenge `motion.div`:

- **Initial state**: `opacity: 0, y: -600, scale: 0.95` — cards start far above, nearly full-size (not shrunk/rotated like before)
- **Animate to**: `opacity: 1, y: 0, scale: 1`
- **Transition**: Sequential staggered delay (`i * 0.15`), using a spring with high stiffness (~400) and moderate damping (~28) to create a satisfying "thud" with a subtle bounce when each brick lands
- **Remove the `rotate: -8`** — bricks fall straight, not tumbling

This creates the illusion of cards dropping in one by one from the top, stacking like bricks. The spring bounce gives a physical "weight" to each landing.

### Optionally animate the rest of the page content too

The header sections (countdown, prize cards, progress bar) could fade in first before the bricks start dropping, giving a sense of the "stage" being set before the challenges land. A simple `justRevealed` opacity+y fade on those sections with a shorter delay would work.

