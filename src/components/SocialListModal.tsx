import { useState, useEffect, useCallback } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AvatarDisplay from "@/components/AvatarDisplay";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { AvatarType, AvatarStage } from "@/lib/mock-data";

type Tab = "friends" | "following";

interface SocialProfile {
  id: string;
  username: string | null;
  avatar: string;
  avatar_stage: number;
  profile_photo_url: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  initialTab: Tab;
  friendsCount: number;
  followingCount: number;
}

export default function SocialListModal({ open, onClose, userId, initialTab, friendsCount, followingCount }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [friends, setFriends] = useState<SocialProfile[]>([]);
  const [following, setFollowing] = useState<SocialProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  // Fetch following (people I follow)
  const fetchFollowing = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("friendships")
      .select("friend_id, profiles!friendships_friend_id_fkey(id, username, avatar, avatar_stage, profile_photo_url)")
      .eq("user_id", userId);
    const profiles = (data ?? []).map((r: any) => r.profiles as SocialProfile).filter(Boolean);
    setFollowing(profiles);
    setFollowedIds(new Set(profiles.map((p) => p.id)));
    setLoading(false);
  }, [userId]);

  // Fetch friends (people who follow me)
  const fetchFriends = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("friendships")
      .select("user_id, profiles!friendships_user_id_fkey(id, username, avatar, avatar_stage, profile_photo_url)")
      .eq("friend_id", userId);
    const profiles = (data ?? []).map((r: any) => r.profiles as SocialProfile).filter(Boolean);
    setFriends(profiles);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    fetchFollowing();
    fetchFriends();
  }, [open, fetchFollowing, fetchFriends]);

  const handleFollow = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase.from("friendships").insert({ user_id: userId, friend_id: id });
    if (error) {
      toast({ title: "Failed to follow", variant: "destructive" });
    } else {
      setFollowedIds((prev) => new Set(prev).add(id));
    }
    setActionLoading(null);
  };

  const handleUnfollow = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase.from("friendships").delete().eq("user_id", userId).eq("friend_id", id);
    if (error) {
      toast({ title: "Failed to unfollow", variant: "destructive" });
    } else {
      setFollowedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
    setActionLoading(null);
  };

  const list = tab === "friends" ? friends : following;
  const filtered = query.trim()
    ? list.filter((p) => (p.username ?? "").toLowerCase().includes(query.toLowerCase()))
    : list;

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 flex flex-col rounded-t-2xl bg-card"
          style={{ maxHeight: "70vh" }}
        >
          {/* Handle bar */}
          <div className="flex justify-center py-2.5">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setTab("friends")}
              className={`flex-1 py-2.5 text-sm font-semibold text-center transition-colors ${
                tab === "friends"
                  ? "text-foreground border-b-2 border-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {friendsCount} Friends
            </button>
            <button
              onClick={() => setTab("following")}
              className={`flex-1 py-2.5 text-sm font-semibold text-center transition-colors ${
                tab === "following"
                  ? "text-foreground border-b-2 border-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {followingCount} Following
            </button>
          </div>

          {/* Search */}
          <div className="px-4 py-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="w-full rounded-lg bg-muted py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-4 pb-6" style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                {query.trim() ? "No results" : tab === "friends" ? "No friends yet" : "Not following anyone"}
              </p>
            ) : (
              filtered.map((person) => {
                const isFollowed = followedIds.has(person.id);
                const isMe = person.id === userId;
                return (
                  <div key={person.id} className="flex items-center gap-3 py-2.5">
                    <AvatarDisplay
                      avatar={person.avatar as AvatarType}
                      stage={person.avatar_stage as AvatarStage}
                      size="md"
                      photoUrl={person.profile_photo_url}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{person.username ?? "user"}</p>
                    </div>
                    {!isMe && (
                      <Button
                        size="sm"
                        variant={isFollowed ? "outline" : "default"}
                        disabled={actionLoading === person.id}
                        onClick={() => isFollowed ? handleUnfollow(person.id) : handleFollow(person.id)}
                        className="min-w-[80px] text-xs"
                      >
                        {actionLoading === person.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : isFollowed ? "Following" : "Follow"}
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
