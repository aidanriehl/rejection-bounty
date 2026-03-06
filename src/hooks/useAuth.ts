import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  username: string | null;
  avatar: string;
  avatar_stage: number;
  streak: number;
  total_completed: number;
  profile_photo_url: string | null;
  created_at: string;
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("[useAuth] Profile fetch error:", error);
      return null;
    }
    return data as Profile;
  } catch (err) {
    console.error("[useAuth] Profile fetch exception:", err);
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[useAuth] Auth state change:", event, session?.user?.email);

        if (!mounted) return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          // Defer profile fetch to avoid Supabase auth deadlock
          setTimeout(async () => {
            if (!mounted) return;
            const profileData = await fetchProfile(currentUser.id);
            if (mounted) {
              setProfile(profileData);
              setLoading(false);
            }
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.error("[useAuth] getSession error:", error);
      }
      console.log("[useAuth] Initial session:", session?.user?.email || "none");

      if (!mounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const profileData = await fetchProfile(currentUser.id);
        if (mounted) {
          setProfile(profileData);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return { user, profile, loading, signOut, setProfile };
}
