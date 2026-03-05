

## Plan: Update "Why get rejected?" modal content and add scroll progress indicator

### Content Changes (Profile.tsx, lines ~198-240)

Rewrite the modal body to match the screenshot text and formatting:

1. **First paragraph** — bold: "We live in a world where you never have to experience rejection if you don't want to."
2. **Second paragraph** — normal, line-broken: "You can remain tongue-tied, / stay comfortable, / and survive fine."
3. **Third paragraph** — bold: "But we want more in life than that."
4. **Fourth paragraph** — normal: "Yet it isn't — because our brains still think rejection is dangerous."
5. **Fifth paragraph** — normal: "You see for most of human history, getting cast out from the social group could be the difference between **life and death.**"
6. **Sixth paragraph** — green/muted italic: "*Now that threat is gone, but the alarm isn't.*"
7. **Seventh paragraph** — normal: "And what people don't realize is rejection, confidence, and not giving a f*** is a muscle we can work on just like anything else."
8. **Eighth paragraph** — green/muted italic: "*We don't realize this, because we never practice it.*"
9. **Ninth paragraph** — normal: "Start small, have consistency, and after 100 rejections people will start to ask what changed."
10. **"And remember:"** — normal
11. **Final quote** — blockquote style with left green border: "Danger is real — but fear isn't. It's made up, and we can control it."

### Formatting Details
- Green title stays unchanged
- Green italic lines use `text-primary italic`
- Final quote uses a left border (`border-l-4 border-primary pl-4`) with bold text
- Line breaks in the "tongue-tied" section use `<br />` tags

### Scroll Progress Indicator
- Wrap the modal content in a `ScrollArea` component (already available)
- Add a thin vertical progress bar on the right side of the modal that fills based on scroll position
- Track scroll position via `onScroll` on the viewport, calculate percentage, render a small absolute-positioned bar

### Files to Change
- `src/pages/Profile.tsx` — rewrite modal content + add scroll progress bar

