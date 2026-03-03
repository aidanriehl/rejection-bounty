import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import type { Profile } from "@/hooks/useAuth";

interface SetupProps {
  userId: string;
  onComplete: (profile: Profile) => void;
}

export default function Setup({ userId, onComplete }: SetupProps) {
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim().toLowerCase();

    if (trimmed.length < 3) {
      toast({ title: "Username must be at least 3 characters", variant: "destructive" });
      return;
    }

    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      toast({ title: "Only letters, numbers, and underscores", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { data, error } = await supabase
      .from("profiles")
      .update({ username: trimmed })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      const msg = error.message.includes("unique")
        ? "That username is taken"
        : "Something went wrong";
      toast({ title: msg, variant: "destructive" });
      setSaving(false);
      return;
    }

    localStorage.setItem("tour_pending", "true");
    onComplete(data as Profile);
    navigate("/challenges");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-5xl">✨</span>
          <h1 className="text-2xl font-bold text-foreground">Pick a username</h1>
          <p className="text-sm text-muted-foreground">
            This is how others will see you
          </p>
        </div>

        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="@codymaverick"
          maxLength={20}
          className="h-12 text-center text-lg"
          autoFocus
        />

        <Button
          type="submit"
          size="lg"
          className="h-12 w-full text-base font-semibold"
          disabled={saving || username.trim().length < 3}
        >
          {saving ? "Saving…" : "Let's go 🚀"}
        </Button>
      </form>
    </div>
  );
}
