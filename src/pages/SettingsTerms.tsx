import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function SettingsTerms() {
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
        <h1 className="text-xl font-bold text-foreground">Terms & Privacy</h1>
      </div>

      {/* Content */}
      <div className="px-4 py-6 pb-24">
        <div className="mx-auto max-w-lg space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p className="text-xs text-muted-foreground">Last Updated: March 5, 2026</p>

          <h2 className="font-bold text-foreground text-lg pt-2">Terms of Service</h2>

          <div className="space-y-3">
            <p><span className="font-semibold text-foreground">1. Acceptance:</span> By using Rejection Bounty, you agree to these terms.</p>
            <p><span className="font-semibold text-foreground">2. Eligibility:</span> You must be 13 years or older to use this app.</p>
            <p><span className="font-semibold text-foreground">3. Account:</span> You are responsible for maintaining the security of your account and all activity under it.</p>
            <p><span className="font-semibold text-foreground">4. Content:</span> You retain ownership of videos you upload. By uploading, you grant us a license to display your content within the app. You agree not to upload illegal, harmful, or inappropriate content.</p>
            <p><span className="font-semibold text-foreground">5. Subscriptions:</span> Paid subscriptions are billed through Apple. You can cancel anytime through your Apple ID settings. Refunds are handled by Apple per their policies.</p>
            <p><span className="font-semibold text-foreground">6. Weekly Drawing:</span> Participation in the weekly drawing is subject to the Official Sweepstakes Rules. No purchase necessary to enter.</p>
            <p><span className="font-semibold text-foreground">7. Payouts:</span> Prize winners must link a valid bank account via Stripe to receive payouts. We are not responsible for delays caused by incorrect banking information.</p>
            <p><span className="font-semibold text-foreground">8. Termination:</span> We may suspend or terminate accounts that violate these terms.</p>
            <p><span className="font-semibold text-foreground">9. Disclaimers:</span> The app is provided "as is." We make no guarantees about availability or results from using the app.</p>
          </div>

          <hr className="border-border my-6" />

          <h2 className="font-bold text-foreground text-lg">Privacy Policy</h2>

          <div className="space-y-3">
            <p><span className="font-semibold text-foreground">1. Introduction:</span> Rejection Bounty ("we," "our," or "us") respects your privacy. This policy explains how we collect, use, and protect your information.</p>

            <p><span className="font-semibold text-foreground">2. Information We Collect:</span></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Email address (used for magic link sign-in)</li>
              <li>Username and profile photo</li>
              <li>Videos and content you upload</li>
              <li>Payment information (processed securely by Stripe)</li>
              <li>Basic app usage analytics</li>
            </ul>

            <p><span className="font-semibold text-foreground">3. How We Use Your Information:</span></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Create and manage your account</li>
              <li>Display your profile and content to other users</li>
              <li>Process payments and prize payouts</li>
              <li>Improve the app experience</li>
            </ul>

            <p><span className="font-semibold text-foreground">4. Information Sharing:</span> We do not sell your personal information. We share data only with service providers (Supabase, Stripe, Apple) as necessary to operate the app.</p>
            <p><span className="font-semibold text-foreground">5. Data Security:</span> We use industry-standard security measures including encrypted connections and secure authentication.</p>
            <p><span className="font-semibold text-foreground">6. Your Rights:</span> You may access, update, or delete your account data by contacting us at replacedplastics@gmail.com.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
