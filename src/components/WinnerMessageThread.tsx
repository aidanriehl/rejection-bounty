import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  winner_user_id: string;
  sender: string;
  message: string;
  created_at: string;
}

interface WinnerMessageThreadProps {
  weekKey: string;
  userId: string;
  daysLeft: number;
  onClose: () => void;
  isAdmin?: boolean;
  adminTargetUserId?: string;
}

export default function WinnerMessageThread({
  weekKey,
  userId,
  daysLeft,
  onClose,
  isAdmin = false,
  adminTargetUserId,
}: WinnerMessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const targetUserId = adminTargetUserId ?? userId;

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("winner_messages")
      .select("*")
      .eq("week_key", weekKey)
      .eq("winner_user_id", targetUserId)
      .order("created_at", { ascending: true });
    setMessages((data as Message[]) ?? []);
  };

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`winner-msgs-${weekKey}-${targetUserId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "winner_messages",
        filter: `week_key=eq.${weekKey}`,
      }, (payload) => {
        const row = payload.new as Message;
        if (row.winner_user_id === targetUserId) {
          setMessages((prev) => [...prev, row]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [weekKey, targetUserId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    const sender = isAdmin ? "admin" : "user";

    await supabase.from("winner_messages").insert({
      week_key: weekKey,
      winner_user_id: targetUserId,
      sender,
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-2xl flex flex-col"
        style={{
          backgroundColor: "hsl(var(--card))",
          maxHeight: "85dvh",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🏆</span>
              <span className="text-lg font-extrabold" style={{ color: "hsl(45 90% 50%)" }}>
                Winner!
              </span>
            </div>
            {daysLeft > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Available for {daysLeft} more day{daysLeft !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ minHeight: 200 }}>
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No messages yet</p>
          )}
          {messages.map((msg) => {
            const isAdminMsg = msg.sender === "admin";
            return (
              <div key={msg.id} className={`flex ${isAdminMsg ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[80%] ${isAdminMsg ? "" : ""}`}>
                  {isAdminMsg && (
                    <p className="text-[10px] font-bold text-muted-foreground mb-1 ml-1">
                      Rejection Bounty
                    </p>
                  )}
                  <div
                    className="rounded-2xl px-3.5 py-2.5"
                    style={{
                      backgroundColor: isAdminMsg
                        ? "hsl(var(--muted))"
                        : "hsl(var(--primary))",
                      color: isAdminMsg
                        ? "hsl(var(--foreground))"
                        : "hsl(var(--primary-foreground))",
                    }}
                  >
                    <p className="text-sm">{msg.message}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 mx-1">
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div className="px-4 pb-6 pt-2 border-t flex gap-2" style={{ borderColor: "hsl(var(--border))" }}>
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 rounded-full px-4 py-2.5 text-sm bg-muted text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="rounded-full p-2.5 transition-colors disabled:opacity-40"
            style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
