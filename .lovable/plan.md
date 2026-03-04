

## Plan: Redesign Video Upload UX + Add Frame/Thumbnail Picker

### What's wrong now
The Post page is a plain form with a dashed border drop zone — feels like a file manager, not a social app. There's no way to pick a thumbnail frame from the video.

### Redesign: Post Page (`src/pages/Post.tsx`)

**1. Video preview replaces the upload zone**
- After selecting a file, generate an in-browser `<video>` preview using `URL.createObjectURL(videoFile)`
- Show the video in a rounded card with a play button overlay, replacing the dashed rectangle
- Before a file is selected, show a more inviting upload area: larger icon, bolder CTA text like "Tap to add your video", subtle animated border

**2. Frame/Thumbnail Slider**
- Once a video is loaded, show a horizontal slider (`<input type="range">`) below the preview
- As the user scrubs the slider, seek the `<video>` element to that time (`videoRef.currentTime = ...`)
- Display the current frame in the video preview in real-time
- Label: "Choose your cover frame"
- Store the selected timestamp so it can be sent with the post data (e.g. `thumbnailTime`)
- Use a `<canvas>` to capture the frame at the chosen time for a static thumbnail if needed later

**3. Visual polish**
- Video preview: `rounded-2xl overflow-hidden aspect-[9/16]` with a dark background
- Slider: styled with primary color track, thumb with a ring
- Upload area before selection: icon + text centered, subtle pulse animation on the border
- Keep caption textarea and Post button below

### Changes

**`src/pages/Post.tsx`** — full rework of the upload area:
- Add `videoRef` to control `<video>` element
- Add `videoUrl` state from `URL.createObjectURL`
- Add `thumbnailTime` state controlled by range slider
- On slider change: `videoRef.current.currentTime = value`
- Before file selected: styled upload zone with larger icon
- After file selected: video preview + frame slider + upload status
- Clean up object URL on unmount

**`src/pages/Challenges.tsx`** — no changes needed (it navigates to `/post`)

