CREATE OR REPLACE FUNCTION public.calculate_tickets(p_week_key text)
 RETURNS TABLE(user_id uuid, username text, avatar text, video_count bigint, tickets integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    cc.user_id,
    p.username,
    p.avatar,
    COUNT(cc.id) AS video_count,
    CASE
      -- Check if user is a paid subscriber
      WHEN EXISTS (
        SELECT 1 FROM public.subscriptions s
        WHERE s.user_id = cc.user_id AND s.status = 'active'
      ) THEN
        -- Paid: 2 tickets per challenge + 3 bonus if 5+ completed
        CASE
          WHEN COUNT(cc.id) >= 5 THEN (COUNT(cc.id)::INT * 2) + 3
          ELSE COUNT(cc.id)::INT * 2
        END
      ELSE
        -- Free: 1 ticket total regardless of how many completed
        1
    END AS tickets
  FROM public.challenge_completions cc
  JOIN public.profiles p ON p.id = cc.user_id
  WHERE cc.week_key = p_week_key
    AND cc.video_url IS NOT NULL
  GROUP BY cc.user_id, p.username, p.avatar;
END;
$function$;