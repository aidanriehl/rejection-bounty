import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Loader2 } from "lucide-react";
import AvatarDisplay from "@/components/AvatarDisplay";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
  const [query, setQuery] = useState("");
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isSearching = query.trim().length > 0;

  // Fetch friends list
  const fetchFriends = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.
    from("friendships").
    select("friend_id, profiles!friendships_friend_id_fkey(id, username, avatar, avatar_stage, streak, profile_photo_url)").
    eq("user_id", user.id);

    if (error) {
      console.error("Error fetching friends:", error);
      setLoading(false);
      return;
    }

    const friendProfiles = (data ?? []).
    map((row: any) => row.profiles as FriendProfile).
    filter(Boolean);

    setFriends(friendProfiles);
    setFollowedIds(new Set(friendProfiles.map((f) => f.id)));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  // Search all users when query is non-empty
  useEffect(() => {
    if (!query.trim() || !user) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase.
      from("profiles").
      select("id, username, avatar, avatar_stage, streak, profile_photo_url").
      ilike("username", `%${query.trim()}%`).
      neq("id", user.id).
      limit(20);
      setSearchResults(data as FriendProfile[] ?? []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, user]);

  const handleFollow = async (friendId: string) => {
    if (!user) return;
    setActionLoading(friendId);
    const { error } = await supabase.
    from("friendships").
    insert({ user_id: user.id, friend_id: friendId });
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
    const { error } = await supabase.
    from("friendships").
    delete().
    eq("user_id", user.id).
    eq("friend_id", friendId);
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

  const filteredFriends = friends.filter((f) =>
  (f.username ?? "").toLowerCase().includes(query.toLowerCase())
  );

  // Which list to render
  const displayList = isSearching ? searchResults : filteredFriends;

  return (
    <div className="min-h-screen pb-24 pt-4">
      <div className="mx-auto max-w-lg px-4">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => navigate("/profile")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
            
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Friends</h1>
          <span className="text-sm text-muted-foreground">{friends.length}</span>
        </div>

        {/* Search — searches friends when idle, all users when typing */}
        <div className="relative mb-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search friends or find new people"
            className="w-full rounded-xl bg-muted py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          
        </div>

        {/* Context label */}
        {isSearching &&
        <p className="mb-2 mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Search results
          </p>
        }
        {!isSearching && friends.length > 0 &&
        <p className="mb-2 mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Following
          </p>
        }

        {/* List */}
        {loading && !isSearching ?
        <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div> :
        searching ?
        <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div> :
        displayList.length === 0 ?
        <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground px-0 py-[160px]">
              {isSearching ?
            "No users found" :
            friends.length === 0 ?
            "No friends yet" :
            "No friends match your search"}
            </p>
          </div> :

        <div className="space-y-0">
            {displayList.map((person) => {
            const isFollowed = followedIds.has(person.id);
            return (
              <div
                key={person.id}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5">
                
                  <AvatarDisplay
                  avatar={person.avatar as AvatarType}
                  stage={person.avatar_stage as AvatarStage}
                  size="md"
                  photoUrl={person.profile_photo_url} />
                
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {person.username ?? "user"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {person.streak > 0 ?
                    `🔥 ${person.streak} week streak` :
                    "No active streak"}
                    </p>
                  </div>
                  <Button
                  size="sm"
                  variant={isFollowed ? "outline" : "default"}
                  disabled={actionLoading === person.id}
                  onClick={() =>
                  isFollowed ? handleUnfollow(person.id) : handleFollow(person.id)
                  }
                  className="min-w-[80px] text-xs">
                  
                    {actionLoading === person.id ?
                  <Loader2 className="h-3 w-3 animate-spin" /> :
                  isFollowed ?
                  "Following" :

                  "Follow"
                  }
                  </Button>
                </div>);

          })}
          </div>
        }
      </div>
    </div>);

}