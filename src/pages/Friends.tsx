import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, Loader2 } from "lucide-react";
import AvatarDisplay from "@/components/AvatarDisplay";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import type { AvatarType, AvatarStage } from "@/lib/mock-data";

type Tab = "friends" | "following";

interface SocialProfile {
  id: string;
  username: string | null;
  avatar: string;
  avatar_stage: number;
  streak: number;
  profile_photo_url: string | null;
}

export default function FriendsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<Tab>((searchParams.get("tab") as Tab) || "friends");
  const [query, setQuery] = useState("");
  const [friends, setFriends] = useState<SocialProfile[]>([]);
  const [following, setFollowing] = useState<SocialProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<SocialProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isSearching = query.trim().length > 0;

  // Fetch following (people I follow)
  const fetchFollowing = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("friendships")
      .select("friend_id, profiles!friendships_friend_id_fkey(id, username, avatar, avatar_stage, streak, profile_photo_url)")
      .eq("user_id", user.id);
    const profiles = (data ?? []).map((r: any) => r.profiles as SocialProfile).filter(Boolean);
    setFollowing(profiles);
    setFollowedIds(new Set(profiles.map((p) => p.id)));
  }, [user]);

  // Fetch friends (people who follow me)
  const fetchFriends = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("friendships")
      .select("user_id, profiles!friendships_user_id_fkey(id, username, avatar, avatar_stage, streak, profile_photo_url)")
      .eq("friend_id", user.id);
    const profiles = (data ?? []).map((r: any) => r.profiles as SocialProfile).filter(Boolean);
    setFriends(profiles);
  }, [user]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchFollowing(), fetchFriends()]);
      setLoading(false);
    };
    load();
  }, [fetchFollowing, fetchFriends]);

  // Search all users when query is non-empty
  useEffect(() => {
    if (!query.trim() || !user) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, username, avatar, avatar_stage, streak, profile_photo_url")
        .ilike("username", `%${query.trim()}%`)
        .neq("id", user.id)
        .limit(20);
      setSearchResults((data as SocialProfile[]) ?? []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, user]);

  const handleFollow = async (friendId: string) => {
    if (!user) return;
    setActionLoading(friendId);
    const { error } = await supabase.from("friendships").insert({ user_id: user.id, friend_id: friendId });
    if (error) {
      toast({ title: "Failed to follow", variant: "destructive" });
    } else {
      setFollowedIds((prev) => new Set(prev).add(friendId));
      fetchFollowing();
      fetchFriends();
    }
    setActionLoading(null);
  };

  const handleUnfollow = async (friendId: string) => {
    if (!user) return;
    setActionLoading(friendId);
    const { error } = await supabase.from("friendships").delete().eq("user_id", user.id).eq("friend_id", friendId);
    if (error) {
      toast({ title: "Failed to unfollow", variant: "destructive" });
    } else {
      setFollowedIds((prev) => {
        const next = new Set(prev);
        next.delete(friendId);
        return next;
      });
      fetchFollowing();
      fetchFriends();
    }
    setActionLoading(null);
  };

  const baseList = tab === "friends" ? friends : following;
  const displayList = isSearching
    ? searchResults
    : baseList.filter((p) => (p.username ?? "").toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="min-h-screen pb-24 pt-4">
      <div className="mx-auto max-w-lg px-4">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => navigate("/profile")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-foreground">
            @{profile?.username || ""}
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border mb-2">
          <button
            onClick={() => { setTab("friends"); setQuery(""); }}
            className={`flex-1 py-2.5 text-sm font-semibold text-center transition-colors ${
              tab === "friends"
                ? "text-foreground border-b-2 border-foreground"
                : "text-muted-foreground"
            }`}
          >
            {friends.length} Followers
          </button>
          <button
            onClick={() => { setTab("following"); setQuery(""); }}
            className={`flex-1 py-2.5 text-sm font-semibold text-center transition-colors ${
              tab === "following"
                ? "text-foreground border-b-2 border-foreground"
                : "text-muted-foreground"
            }`}
          >
            {following.length} Following
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full rounded-xl bg-muted py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Context label for search */}
        {isSearching && (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Search results
          </p>
        )}

        {/* List */}
        {loading && !isSearching ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : searching ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : displayList.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {isSearching
              ? "No users found"
              : tab === "friends"
              ? "No followers yet"
              : "Not following anyone"}
          </p>
        ) : (
          <div className="space-y-0">
            {displayList.map((person) => {
              const isFollowed = followedIds.has(person.id);
              const isMe = person.id === user?.id;
              return (
                <div key={person.id} className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5">
                  <AvatarDisplay
                    avatar={person.avatar as AvatarType}
                    stage={person.avatar_stage as AvatarStage}
                    size="md"
                    photoUrl={person.profile_photo_url}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{person.username ?? "user"}</p>
                    <p className="text-xs text-muted-foreground">
                      {person.streak > 0 ? `🔥 ${person.streak} week streak` : "No active streak"}
                    </p>
                  </div>
                  {!isMe && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionLoading === person.id}
                      onClick={() => (isFollowed ? handleUnfollow(person.id) : handleFollow(person.id))}
                      className={`min-w-[80px] text-xs ${isFollowed ? "text-muted-foreground border-border" : "text-foreground border-foreground"}`}
                    >
                      {actionLoading === person.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : isFollowed ? (
                        "Following"
                      ) : (
                        "Follow"
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
