import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";

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
  winnerName?: string;
}

// Rich gold colors
const GOLD = {
  primary: "hsl(43 96% 56%)",      // #F5B800 - main gold
  dark: "hsl(38 90% 40%)",          // darker gold
  light: "hsl(45 100% 70%)",        // lighter gold
  bg: "hsl(35 50% 12%)",            // warm dark gold-brown bg
  bgLight: "hsl(38 40% 18%)",       // warm lighter gold-brown
  text: "hsl(43 100% 90%)",         // light gold text
};

export default function WinnerMessageThread({
  weekKey,
  userId,
  daysLeft,
  onClose,
  isAdmin = false,
  adminTargetUserId,
  winnerName,
}: WinnerMessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const keyboardHeight = useKeyboardHeight();
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
  }, [messages, keyboardHeight]);

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
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed left-0 right-0 top-0 z-[100] flex flex-col"
      style={{
        backgroundColor: GOLD.bg,
        height: keyboardHeight > 0 ? `calc(100% - ${keyboardHeight}px)` : '100%',
      }}
    >
      {/* Header - Instagram style */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b"
        style={{
          borderColor: "rgba(255,255,255,0.1)",
          background: `linear-gradient(180deg, ${GOLD.bgLight} 0%, ${GOLD.bg} 100%)`,
          paddingTop: "calc(env(safe-area-inset-top) + 12px)",
        }}
      >
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded-full p-2 transition-colors"
          style={{ color: GOLD.primary }}
        >
          <ArrowLeft className="h-6 w-6" />
        </button>

        <div className="flex items-center gap-3 flex-1">
          {/* Logo avatar */}
          <img
            src="/logo.png"
            alt="Rejection Bounty"
            className="h-10 w-10 rounded-full object-cover"
          />
          <div>
            <p className="font-bold" style={{ color: GOLD.text }}>
              {isAdmin ? (winnerName || "Winner") : "Rejection Bounty"}
            </p>
            {isAdmin && (
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                {weekKey}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        data-scroll-container
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <img
              src="/logo.png"
              alt="Rejection Bounty"
              className="h-16 w-16 rounded-full object-cover"
            />
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              {isAdmin ? "Start a conversation with the winner" : "For payout, please send your PayPal, Venmo, or Zelle info 🎁"}
            </p>
          </div>
        )}
        {messages.map((msg) => {
          const isAdminMsg = msg.sender === "admin";
          const isMyMessage = isAdmin ? isAdminMsg : !isAdminMsg;
          return (
            <div key={msg.id} className={`flex ${isMyMessage ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[80%]">
                <div
                  className="rounded-2xl px-4 py-2.5"
                  style={{
                    backgroundColor: isMyMessage
                      ? GOLD.primary
                      : GOLD.bgLight,
                    color: isMyMessage
                      ? GOLD.bg
                      : GOLD.text,
                  }}
                >
                  <p className="text-sm">{msg.message}</p>
                </div>
                <p className="text-[10px] mt-1 mx-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input - Instagram style */}
      <div
        className="px-4 pt-2 border-t flex items-center gap-3"
        style={{
          borderColor: "rgba(255,255,255,0.1)",
          paddingBottom: keyboardHeight > 0 ? 12 : "calc(env(safe-area-inset-bottom) + 12px)",
          backgroundColor: GOLD.bg,
        }}
      >
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Message..."
          className="flex-1 rounded-full px-4 py-3 text-sm outline-none"
          style={{
            backgroundColor: GOLD.bgLight,
            color: GOLD.text,
            border: `1px solid rgba(255,255,255,0.1)`,
          }}
        />
        <button
          onClick={handleSend}
          disabled={!newMessage.trim() || sending}
          className="rounded-full p-3 transition-all disabled:opacity-40"
          style={{
            background: `linear-gradient(135deg, ${GOLD.primary} 0%, ${GOLD.dark} 100%)`,
            color: GOLD.bg,
          }}
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </motion.div>
  );
}
