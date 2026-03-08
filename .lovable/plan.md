

## Plan: Auto-shrink stat card text instead of truncating

Use CSS `clamp()` or viewport-relative units to scale font sizes down on narrower screens, keeping all text visible without wrapping.

### Changes in `src/pages/Profile.tsx`

**Both stat cards (lines 330-356):**
- Add `whitespace-nowrap` to prevent wrapping
- Replace fixed `text-sm` on title spans with a responsive size using inline `style={{ fontSize: 'clamp(0.65rem, 2.8vw, 0.875rem)' }}`
- Replace fixed `text-[10px]` on subtitle spans with `style={{ fontSize: 'clamp(0.5rem, 2.2vw, 0.625rem)' }}`
- This scales text smoothly from ~10px on 320px screens up to the current sizes on normal phones, never wrapping to a third line

