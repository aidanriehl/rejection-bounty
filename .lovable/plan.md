

## Plan: Increase font and icon sizes in Players & Prize Pool cards

Keep the card dimensions as-is, just bump up the visual weight of the content inside.

### Changes in `src/pages/Challenges.tsx`

**All 4 card variants (premium + non-premium for both cards):**

- Icons: `h-4 w-4` → `h-5 w-5`
- Main number: `text-2xl` → `text-3xl`
- Label text: `text-[11px]` → `text-xs` (roughly 11px → 12px)

That's it — same card size, bigger content to fill the space and match the importance.

