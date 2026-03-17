

## Plan: App Store Demo Account Setup

### Problem
Apple reviewers can't log in because the app uses email OTP (magic code) authentication. They need email + password credentials.

### What needs to happen

**1. Add password login option to Onboarding.tsx**
- On the email entry screen (the "form" mode), add a small "Use password instead" text link below the email input
- When tapped, show a password field below the email
- Submit calls `supabase.auth.signInWithPassword({ email, password })` instead of `signInWithOtp`
- A "Use code instead" link toggles back to the OTP flow
- This is subtle enough that regular users won't be confused, but Apple reviewers can use it

**2. Create the demo account via database**
- Use the migration tool to create a database function that sets up the demo account
- Create an auth user with email `demo@rejectionbounty.com` and a known password (e.g. `DemoReview2026!`)
- You don't need a real inbox for this email — password login bypasses email verification entirely
- Insert a profile row with a username like `DemoReviewer`, an avatar, and some stats (streak: 3, total_completed: 8, etc.)

**3. Seed demo content**
- Insert a few `challenge_completions` for the demo user tied to the current week's challenges
- Insert a couple `posts` entries (you'll need to provide video URLs/IDs for these later)
- Insert a `weekly_drawings` entry for a past week to show the winner showcase feature
- Insert some `friendships` so the Followers tab has content

**4. App Store Connect setup (manual, by you)**
- In App Store Connect → App Information → Demo Account, enter:
  - Email: `demo@rejectionbounty.com`
  - Password: `DemoReview2026!`
- In Review Notes, add: "Tap 'Log In', enter the demo credentials, then tap 'Use password instead' below the email field to reveal the password input. The admin panel is restricted to the app owner and is not a user-facing feature."

### Technical details

**Onboarding.tsx changes:**
- Add `showPassword` state boolean
- In the "form" mode view, conditionally render a password `<input type="password">` 
- Change the submit handler: if `showPassword && password`, call `signInWithPassword`; otherwise call `signInWithOtp` as before
- The rest of the auth flow (AuthContext profile fetch → routing) works identically for both methods

**Demo account creation:**
- Will need to create the auth user. This requires using an edge function or the service role key since we can't create users with passwords from the client side. I'll use `supabase.auth.admin.createUser()` in an edge function to create the demo user with `email_confirm: true` (so no verification needed).
- Alternatively, we can manually insert the demo user via the auth admin API through an edge function that runs once.

**Files to modify:**
- `src/pages/Onboarding.tsx` — add password field toggle and `signInWithPassword` logic
- New edge function `supabase/functions/seed-demo-account/index.ts` — one-time script to create the demo user + seed data

