import { useState, useEffect, useRef } from "react";
import logo from "@/assets/logo.png";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Message {
  id: string;
  user_id: string;
  sender: "admin" | "user";
  message: string;
  created_at: string;
}

export default function SettingsMessages() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("user_messages")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    setMessages((data as Message[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`user-msgs-${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "user_messages",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending || !user) return;
    setSending(true);

    await supabase.from("user_messages").insert({
      user_id: user.id,
      sender: "user",
      message: newMessage.trim(),
    } as any);

    setNewMessage("");
    setSending(false);
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

  return (
    <div className="fixed inset-0 flex flex-col" style={{ backgroundColor: "hsl(var(--background))" }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b bg-background"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}
      >
        <button
          onClick={() => navigate("/settings")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg">
            🎯
          </div>
          <div>
            <p className="font-bold text-foreground">Rejection Bounty</p>
            <p className="text-xs text-muted-foreground">Support</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        data-scroll-container className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-3xl">
              💬
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Have a question or need help?<br />Send us a message!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMyMessage = msg.sender === "user";
            return (
              <div key={msg.id} className={`flex ${isMyMessage ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[80%]">
                  <div
                    className={`rounded-2xl px-4 py-2.5 ${
                      isMyMessage
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="text-sm">{msg.message}</p>
                  </div>
                  <p className="text-[10px] mt-1 mx-1 text-muted-foreground">
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div
        className="px-4 pt-3 border-t flex items-center gap-3 bg-background"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Message..."
          className="flex-1 rounded-full border bg-muted/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={handleSend}
          disabled={!newMessage.trim() || sending}
          className="rounded-full bg-primary p-3 text-primary-foreground transition-all disabled:opacity-40"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
