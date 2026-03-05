import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const NATIVE_SCHEME = "app.lovable.1f0608baf7f94f668530c5e415e76d58";

/**
 * OAuth callback bounce page.
 * When the OAuth provider redirects here (https://rejection-bounty.lovable.app/auth/callback#access_token=...),
 * this page checks for a "native=1" flag in the hash/query and redirects to the native app's custom URL scheme.
 * This allows the Capacitor in-app browser (SFSafariViewController) to intercept the custom scheme and return to the app.
 */
export default function AuthCallback() {
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash?.substring(1) || "";
    const searchParams = new URLSearchParams(location.search);
    const hashParams = new URLSearchParams(hash);

    // Check if this came from a native app request
    const isNative = searchParams.get("native") === "1" || hashParams.get("native") === "1";

    if (isNative && hash) {
      // Redirect to the native app scheme with the full hash (tokens)
      window.location.href = `${NATIVE_SCHEME}://callback#${hash}`;
      return;
    }

    // For web: just redirect to home — Supabase client will pick up the tokens from the hash
    if (hash.includes("access_token")) {
      window.location.href = `/${hash ? "#" + hash : ""}`;
    } else {
      window.location.href = "/";
    }
  }, [location]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <span className="text-2xl animate-pulse">🔥</span>
      <p className="ml-2 text-muted-foreground">Signing you in...</p>
    </div>
  );
}
