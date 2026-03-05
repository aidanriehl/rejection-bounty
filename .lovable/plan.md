

## Plan: Inline stat labels next to numbers

Move "day streak" and "challenges completed" to sit on the same line as the number, with matching `font-extrabold` weight but roughly half the font size.

### Changes in `src/pages/Profile.tsx`

**Streak card (lines 216-220):**
- Move "day streak" text into the same flex row as the number
- Change from `text-[11px] text-muted-foreground` to `text-sm font-extrabold text-foreground` (half of `text-2xl`)

**Challenges card (lines 226-230):**
- Move "challenges completed" text into the same flex row as the number
- Same styling: `text-sm font-extrabold text-foreground`

Result: `🔥 0 day streak` and `🎯 0/10 challenges completed` all on one line, labels bold but smaller.

