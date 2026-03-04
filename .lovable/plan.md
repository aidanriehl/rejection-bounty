

## Plan: Shrink the video upload area without changing aspect ratio

The issue is simple: the upload zone currently stretches to `w-full` (100% width), and the aspect ratio then makes it very tall. The fix is to **constrain the width** (e.g., `w-2/3` or `max-w-[200px]`) and **center it horizontally**. The aspect ratio stays the same — the whole box just gets smaller because it's narrower.

### Changes in `src/pages/Post.tsx`

**Upload placeholder (empty state):**
- Wrap or modify the upload button to use `w-2/3 mx-auto` instead of `w-full`
- Keep `aspect-[9/13]` as-is

**Video preview (after selecting a file):**
- Same treatment: constrain the video container width to `w-2/3 mx-auto`
- The aspect ratio stays `aspect-[9/13]`, just renders smaller

Everything else (caption, thumbnail slider, buttons) remains unchanged and will have more room.

