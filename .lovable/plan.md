

## Plan: Fix stats card text alignment

Two issues to fix in the stats cards in `src/pages/Profile.tsx`:

1. **Left-align (baseline) the text** — currently using `items-center` which vertically centers everything. Switch to `items-baseline` so the emoji, number, and label all sit on the same text baseline ("on the ground").

2. **Make emojis consistent size** — both the 🔥 and 🎯 emojis should use the same font size and have consistent vertical alignment. Use `items-baseline` so they naturally align to the bottom of the text line.

### Changes in `src/pages/Profile.tsx`

**Lines 328-331 (Streak card):**
- Change `items-center` → `items-baseline`

**Lines 342-345 (Challenges card):**
- Change `items-center` → `items-baseline`

Both cards get the same treatment — `items-baseline` makes all elements share the same bottom line, like text sitting on a ruled page.

