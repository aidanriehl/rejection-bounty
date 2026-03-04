

## Plan: Actually fix emoji + text alignment in stats cards

**The problem:** `items-baseline` doesn't work for emojis because browsers treat them as replaced content (like images), not text glyphs. They don't participate in baseline alignment the same way letters do.

**The fix:** Use `items-end` (aligns to the bottom of the flex container) combined with explicit bottom padding/margin adjustments on the emoji to visually pin everything to the same ground line. Alternatively, wrap the emoji in a span with a manual `translate-y` to nudge it into position.

### Changes in `src/pages/Profile.tsx`

**Both stat card containers (lines 328 and 342):**
- Change `items-baseline` → `items-end`
- Add a small negative translate on the emoji (`-translate-y-0.5`) to fine-tune its visual bottom edge to match the text baseline
- This forces all elements to the bottom of the row, then the emoji gets nudged to sit flush

```tsx
// Streak card
<div className="flex items-end gap-2">
  <span className="text-xl leading-none -translate-y-0.5">🔥</span>
  <span className="text-3xl font-extrabold leading-none text-foreground">{streak}</span>
  <span className="text-lg font-semibold leading-none text-foreground">Week Streak</span>
</div>

// Challenges card — same pattern
<div className="flex items-end gap-2">
  <span className="text-xl leading-none -translate-y-0.5">🎯</span>
  <span className="text-3xl font-extrabold leading-none text-foreground">{ms.current}/{ms.goal}</span>
  <span className="text-lg font-semibold leading-none text-foreground">challenges completed</span>
</div>
```

This is a small, targeted change — two lines per card.

