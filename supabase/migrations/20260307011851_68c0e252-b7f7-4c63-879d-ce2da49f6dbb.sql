
-- Add best_streak and weeks_completed columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS best_streak integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS weeks_completed integer NOT NULL DEFAULT 0;

-- Create a trigger function that updates best_streak and weeks_completed
-- whenever a challenge_completion is inserted
CREATE OR REPLACE FUNCTION public.update_profile_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_streak integer;
  current_best integer;
  already_completed_this_week boolean;
BEGIN
  -- Check if user already had a completion this week (before this insert)
  SELECT EXISTS (
    SELECT 1 FROM public.challenge_completions
    WHERE user_id = NEW.user_id
      AND week_key = NEW.week_key
      AND id != NEW.id
  ) INTO already_completed_this_week;

  -- If this is the first completion this week, increment weeks_completed
  IF NOT already_completed_this_week THEN
    UPDATE public.profiles
    SET weeks_completed = weeks_completed + 1
    WHERE id = NEW.user_id;
  END IF;

  -- Always ensure best_streak >= streak
  SELECT streak, best_streak INTO current_streak, current_best
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF current_streak > current_best THEN
    UPDATE public.profiles
    SET best_streak = current_streak
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_challenge_completion_update_profile ON public.challenge_completions;
CREATE TRIGGER on_challenge_completion_update_profile
AFTER INSERT ON public.challenge_completions
FOR EACH ROW
EXECUTE FUNCTION public.update_profile_on_completion();

-- Also create a trigger that syncs best_streak whenever streak is updated on profiles
CREATE OR REPLACE FUNCTION public.sync_best_streak()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.streak > NEW.best_streak THEN
    NEW.best_streak := NEW.streak;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_streak_update ON public.profiles;
CREATE TRIGGER on_profile_streak_update
BEFORE UPDATE OF streak ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_best_streak();
