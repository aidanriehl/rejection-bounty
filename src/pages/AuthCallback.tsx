import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const NATIVE_SCHEME = "app.lovable.1f0608baf7f94f668530c5e415e76d58";

/**
 * OAuth callback bounce page.
 * 
 * Flow on native iOS:
 * 1. SFSafariViewController loads this page after OAuth completes
 * 2. URL looks like: https://rejection-bounty.lovable.app/auth/callback?native=1#access_token=...&refresh_token=...
 * 3. This page detects native=1 and redirects to the custom URL scheme
 * 4. iOS intercepts the custom scheme, closes SFSafariViewController, fires appUrlOpen event
 * 5. DeepLinkHandler in App.tsx catches the event and sets the Supabase session
 */
export default function AuthCallback() {
  const location = useLocation();
  const [fallbackVisible, setFallbackVisible] = useState(false);

  useEffect(() => {
    const hash = location.hash?.substring(1) || "";
    const searchParams = new URLSearchParams(location.search);

    // Check if this came from a native app request
    const isNative = searchParams.get("native") === "1";

    console.log("[AuthCallback] Loaded", {
      isNative,
      hasHash: !!hash,
      hashLength: hash.length,
      search: location.search,
    });

    if (isNative && hash) {
      // Build the deep link URL with the full token hash
      const deepLinkUrl = `${NATIVE_SCHEME}://callback#${hash}`;
      console.log("[AuthCallback] Redirecting to native app:", deepLinkUrl);
      
      // Redirect to the custom URL scheme — this triggers iOS to open the native app
      window.location.href = deepLinkUrl;
      
      // Show fallback button after 2 seconds in case the redirect doesn't work
      setTimeout(() => setFallbackVisible(true), 2000);
      return;
    }

    // For web: redirect to home with the hash — Supabase client will pick up the tokens
    if (hash.includes("access_token")) {
      window.location.href = `/#${hash}`;
    } else {
      window.location.href = "/";
    }
  }, [location]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <span className="text-2xl animate-pulse">🔥</span>
      <p className="text-muted-foreground">Signing you in...</p>
      
      {fallbackVisible && (
        <div className="mt-4 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">
            If the app didn't open automatically:
          </p>
          <a
            href={`${NATIVE_SCHEME}://callback${location.hash}`}
            className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-md"
          >
            Open Rejection Bounty
          </a>
        </div>
      )}
    </div>
  );
}
