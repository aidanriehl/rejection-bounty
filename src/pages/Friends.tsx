import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, UserPlus, X, Loader2 } from "lucide-react";
import AvatarDisplay from "@/components/AvatarDisplay";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AvatarType, AvatarStage } from "@/lib/mock-data";

interface FriendProfile {
  id: string;
  username: string | null;
  avatar: string;
  avatar_stage: number;
  streak: number;
  profile_photo_url: string | null;
}

export default function FriendsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch friends list
  const fetchFriends = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("friendships")
      .select("friend_id, profiles!friendships_friend_id_fkey(id, username, avatar, avatar_stage, streak, profile_photo_url)")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching friends:", error);
      setLoading(false);
      return;
    }

    const friendProfiles = (data ?? [])
      .map((row: any) => row.profiles as FriendProfile)
      .filter(Boolean);

    setFriends(friendProfiles);
    setFollowedIds(new Set(friendProfiles.map((f) => f.id)));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  // Search users
  useEffect(() => {
    if (!searchQuery.trim() || !user) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, username, avatar, avatar_stage, streak, profile_photo_url")
        .ilike("username", `%${searchQuery.trim()}%`)
        .neq("id", user.id)
        .limit(20);
      setSearchResults((data as FriendProfile[]) ?? []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, user]);

  const handleFollow = async (friendId: string) => {
    if (!user) return;
    setActionLoading(friendId);
    const { error } = await supabase
      .from("friendships")
      .insert({ user_id: user.id, friend_id: friendId });
    if (error) {
      toast({ title: "Failed to follow", variant: "destructive" });
    } else {
      setFollowedIds((prev) => new Set(prev).add(friendId));
      toast({ title: "Followed!" });
      fetchFriends();
    }
    setActionLoading(null);
  };

  const handleUnfollow = async (friendId: string) => {
    if (!user) return;
    setActionLoading(friendId);
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("user_id", user.id)
      .eq("friend_id", friendId);
    if (error) {
      toast({ title: "Failed to unfollow", variant: "destructive" });
    } else {
      setFollowedIds((prev) => {
        const next = new Set(prev);
        next.delete(friendId);
        return next;
      });
      fetchFriends();
    }
    setActionLoading(null);
  };

  const filtered = friends.filter((f) =>
    (f.username ?? "").toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 className="text-lg font-bold text-foreground">Friends</h1>
          <span className="text-sm text-muted-foreground">{friends.length}</span>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddModal(true)}
            className="gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            Add
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search friends"
            className="w-full rounded-lg bg-muted py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Friends list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-0">
            {filtered.map((friend) => (
              <div
                key={friend.id}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left"
              >
                <AvatarDisplay
                  avatar={friend.avatar as AvatarType}
                  stage={friend.avatar_stage as AvatarStage}
                  size="md"
                  photoUrl={friend.profile_photo_url}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {friend.username ?? "user"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {friend.streak > 0
                      ? `🔥 ${friend.streak} week streak`
                      : "No active streak"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-destructive"
                  disabled={actionLoading === friend.id}
                  onClick={() => handleUnfollow(friend.id)}
                >
                  Unfollow
                </Button>
              </div>
            ))}
            {filtered.length === 0 && !loading && (
              <div className="py-16 text-center">
                <p className="text-sm text-muted-foreground">
                  {friends.length === 0
                    ? "No friends yet — tap Add to find people!"
                    : "No friends found"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Friends Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Find Friends</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username"
              autoFocus
              className="w-full rounded-lg bg-muted py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="max-h-72 overflow-y-auto">
            {searching && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!searching && searchResults.length === 0 && searchQuery.trim() && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No users found
              </p>
            )}
            {!searching &&
              searchResults.map((u) => {
                const isFollowed = followedIds.has(u.id);
                return (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 rounded-lg px-2 py-2.5"
                  >
                    <AvatarDisplay
                      avatar={u.avatar as AvatarType}
                      stage={u.avatar_stage as AvatarStage}
                      size="sm"
                      photoUrl={u.profile_photo_url}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {u.username ?? "user"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={isFollowed ? "outline" : "default"}
                      disabled={actionLoading === u.id}
                      onClick={() =>
                        isFollowed ? handleUnfollow(u.id) : handleFollow(u.id)
                      }
                      className="min-w-[80px] text-xs"
                    >
                      {actionLoading === u.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : isFollowed ? (
                        "Following"
                      ) : (
                        "Follow"
                      )}
                    </Button>
                  </div>
                );
              })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
