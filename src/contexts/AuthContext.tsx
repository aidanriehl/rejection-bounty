import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cacheProfile, getCachedProfile, clearCachedProfile } from "@/lib/capacitor-storage";
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

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  setProfile: (profile: Profile | null) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string, retries = 3): Promise<Profile | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[AuthContext] Fetching profile for user: ${userId} (attempt ${attempt})`);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("[AuthContext] ❌ Profile fetch error:", error.message, error.code, error.details);
        if (attempt === retries) {
          console.error("[AuthContext] ❌ FINAL ATTEMPT FAILED");
        }
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 500 * attempt));
          continue;
        }
        return null;
      }
      console.log("[AuthContext] ✅ Profile fetched successfully:", {
        id: data?.id,
        username: data?.username,
      });
      // Cache profile to native storage for resilience
      await cacheProfile(data);
      return data as Profile;
    } catch (err) {
      console.error("[AuthContext] ❌ Profile fetch exception:", err);
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 500 * attempt));
        continue;
      }
      return null;
    }
  }
  return null;
}

/**
 * Try to load profile from cache (native Preferences / localStorage).
 * Returns a valid Profile or null.
 */
async function loadCachedProfile(userId: string): Promise<Profile | null> {
  try {
    const cached = await getCachedProfile();
    if (cached && typeof cached === "object" && (cached as Profile).id === userId && (cached as Profile).username) {
      console.log("[AuthContext] ✅ Using cached profile for", userId);
      return cached as Profile;
    }
  } catch (e) {
    console.warn("[AuthContext] Cache read failed:", e);
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const profileRef = useRef<Profile | null>(null);
  // Track whether we've ever successfully loaded a profile this session
  const profileEverLoadedRef = useRef(false);

  const updateProfile = (p: Profile | null) => {
    profileRef.current = p;
    setProfile(p);
    if (p?.username) {
      profileEverLoadedRef.current = true;
      cacheProfile(p);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      if (profileData) {
        updateProfile(profileData);
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[AuthContext] Auth state change:", event, session?.user?.email);

        if (!mounted) return;

        // Handle token refresh failures — but DON'T sign out immediately.
        // The cached profile + session retry should handle this gracefully.
        if (event === "TOKEN_REFRESHED" && !session) {
          console.error("[AuthContext] Token refresh failed — will retry on next interaction");
          // Don't clear user/profile — let the user keep using the app
          // The next API call will fail and we can handle it then
          return;
        }

        // Handle explicit sign out
        if (event === "SIGNED_OUT") {
          console.log("[AuthContext] User signed out");
          profileRef.current = null;
          profileEverLoadedRef.current = false;
          setUser(null);
          setProfile(null);
          setLoading(false);
          await clearCachedProfile();
          return;
        }

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          // Skip re-fetch if we already have a valid profile for this user
          const existingProfile = profileRef.current;
          if (existingProfile?.id === currentUser.id && existingProfile?.username) {
            console.log("[AuthContext] Skipping profile re-fetch, already loaded");
            setLoading(false);
            return;
          }

          // Defer profile fetch to avoid Supabase auth deadlock
          setTimeout(async () => {
            if (!mounted) return;

            // Try network fetch first
            const profileData = await fetchProfile(currentUser.id);
            if (!mounted) return;

            if (profileData) {
              updateProfile(profileData);
              setLoading(false);
              return;
            }

            // Network fetch failed — try cached profile
            console.warn("[AuthContext] Network profile fetch failed, trying cache...");
            const cached = await loadCachedProfile(currentUser.id);
            if (mounted) {
              if (cached) {
                updateProfile(cached);
              } else {
                console.warn("[AuthContext] No cached profile either");
              }
              setLoading(false);
            }
          }, 0);
        } else {
          profileRef.current = null;
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.error("[AuthContext] getSession error:", error);
        // DON'T sign out on transient errors!
        // Instead, check if we have a cached profile we can use.
        // Only sign out if the error is definitively "no session" (not network issues).
        if (error.message?.includes("refresh_token_not_found") || 
            error.message?.includes("Invalid Refresh Token") ||
            error.code === "session_not_found") {
          console.log("[AuthContext] Session definitively invalid, clearing");
          await supabase.auth.signOut().catch(() => {});
          if (mounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
            await clearCachedProfile();
          }
          return;
        }
        // For other errors (network, timeout), DON'T sign out
        console.log("[AuthContext] Transient getSession error, checking cache...");
      }

      if (!mounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        // Try network fetch
        const profileData = await fetchProfile(currentUser.id);
        if (mounted) {
          if (profileData) {
            updateProfile(profileData);
          } else {
            // Network failed — use cache
            const cached = await loadCachedProfile(currentUser.id);
            if (cached) {
              updateProfile(cached);
            }
          }
          setLoading(false);
        }
      } else if (!error) {
        // Only clear loading if there was no error (genuine no-session)
        if (mounted) setLoading(false);
      } else {
        // Error case with no session — try cache as last resort
        const cached = await getCachedProfile();
        if (mounted) {
          if (cached && (cached as Profile).username) {
            console.log("[AuthContext] Using cached profile despite getSession error");
            // We have a cached profile but no valid session
            // Don't show setup, but the user will need to re-auth on next API call
            updateProfile(cached as Profile);
          }
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    profileRef.current = null;
    profileEverLoadedRef.current = false;
    setUser(null);
    setProfile(null);
    await clearCachedProfile();
  };

  // Expose setProfile that also caches
  const setProfileExternal = (p: Profile | null) => {
    if (p) {
      updateProfile(p);
    } else {
      profileRef.current = null;
      setProfile(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, setProfile: setProfileExternal, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
