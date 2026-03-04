

## Current State

- A **Friends page** exists at `/friends` with mock data and search, but it's only accessible if you already know the route. There's no link to it from the Profile page.
- There's **no follow/friend system** in the database — the friends list is entirely hardcoded mock data.
- There's **no way to add or follow** other users.

## Plan: Add Friends Link to Profile + Build a Real Follow System

### 1. Add "Friends" link on Profile page
- Below the username (or as a third stat card), add a tappable row showing friend count that navigates to `/friends`
- Style: compact row with a `Users` icon + "X Friends" + chevron, placed between the username and stat cards

### 2. Create `friendships` database table
```sql
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, friend_id)
);
```
- RLS: users can see their own friendships, insert their own, delete their own
- This is a one-directional follow model (user_id follows friend_id)

### 3. Update Friends page to use real data
- Replace mock data with a query: `select profiles.* from friendships join profiles on profiles.id = friendships.friend_id where friendships.user_id = currentUser.id`
- Keep the search/filter UI

### 4. Add "Follow" capability
- On the Friends page, add an "Add Friends" button that opens a search modal to find users by username
- Search queries `profiles` table, shows results with a "Follow" button
- Following inserts into `friendships`, unfollowing deletes

### Files changed
- **Migration**: new `friendships` table + RLS policies
- **`src/pages/Profile.tsx`**: add friends count + link to `/friends`
- **`src/pages/Friends.tsx`**: replace mock data with real queries, add "Add Friends" search modal with follow/unfollow

