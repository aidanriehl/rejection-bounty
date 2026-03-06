import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function SettingsRules() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 bg-background px-4 py-3 border-b"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}
      >
        <button
          onClick={() => navigate("/settings")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Sweepstakes Rules</h1>
      </div>

      {/* Content */}
      <div className="px-4 py-6 pb-24">
        <div className="mx-auto max-w-lg space-y-4 text-sm text-muted-foreground leading-relaxed">
          <h2 className="font-bold text-foreground text-lg">Official Sweepstakes Rules</h2>

          <p className="font-semibold text-foreground text-base">NO PURCHASE NECESSARY TO ENTER OR WIN.</p>

          <div className="space-y-3">
            <p><span className="font-semibold text-foreground">1. Eligibility:</span> Open to users 13 years or older.</p>

            <p><span className="font-semibold text-foreground">2. How to Enter (Free):</span> Complete at least one challenge with a video upload during the weekly period to receive one (1) free entry.</p>

            <p><span className="font-semibold text-foreground">3. Bonus Entries (Subscribers):</span> Paid subscribers receive 1 entry per challenge completed with video (up to 4 entries for 4 challenges). Completing 5 or more challenges earns 8 total entries. Maximum entries per week: 13 tickets.</p>

            <p><span className="font-semibold text-foreground">4. Drawing Period:</span> Weekly, ending Sunday at midnight.</p>

            <p><span className="font-semibold text-foreground">5. Winner Selection:</span> One winner selected randomly each week from all eligible entries. Each entry has an equal chance of winning.</p>

            <p><span className="font-semibold text-foreground">6. Prize:</span> Weekly prize amount varies based on the community pool. Winner will be notified in-app.</p>

            <p><span className="font-semibold text-foreground">7. Odds:</span> Depend on the total number of entries received.</p>

            <p><span className="font-semibold text-foreground">8. Sponsor:</span> Rejection Bounty. Apple Inc. is not a sponsor and is not responsible for this promotion.</p>

            <p><span className="font-semibold text-foreground">9. General:</span> Void where prohibited by law.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
