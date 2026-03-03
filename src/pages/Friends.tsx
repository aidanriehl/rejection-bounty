import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import AvatarDisplay from "@/components/AvatarDisplay";
import { type AvatarType, type AvatarStage } from "@/lib/mock-data";

interface Friend {
  id: string;
  username: string;
  avatar: AvatarType;
  avatarStage: AvatarStage;
  streak: number;
}

const mockFriends: Friend[] = [
  { id: "1", username: "brave_sarah", avatar: "dragon", avatarStage: 3, streak: 12 },
  { id: "2", username: "fearless_mike", avatar: "owl", avatarStage: 1, streak: 2 },
  { id: "3", username: "no_fear_nina", avatar: "tree", avatarStage: 0, streak: 0 },
  { id: "4", username: "courage_queen", avatar: "cat", avatarStage: 3, streak: 8 },
  { id: "5", username: "bold_ben", avatar: "fox", avatarStage: 2, streak: 5 },
  { id: "6", username: "daring_dana", avatar: "dragon", avatarStage: 2, streak: 4 },
  { id: "7", username: "gutsy_greg", avatar: "owl", avatarStage: 1, streak: 1 },
  { id: "8", username: "plucky_pat", avatar: "cat", avatarStage: 2, streak: 6 },
  { id: "9", username: "nervy_nate", avatar: "fox", avatarStage: 3, streak: 10 },
  { id: "10", username: "tough_tina", avatar: "tree", avatarStage: 1, streak: 3 },
  { id: "11", username: "risky_rachel", avatar: "dragon", avatarStage: 0, streak: 0 },
  { id: "12", username: "hardy_hank", avatar: "owl", avatarStage: 2, streak: 7 },
];

export default function FriendsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filtered = mockFriends.filter((f) =>
    f.username.toLowerCase().includes(search.toLowerCase())
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
          <span className="text-sm text-muted-foreground">{mockFriends.length}</span>
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
        <div className="space-y-0">
          {filtered.map((friend) => (
            <button
              key={friend.id}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-muted/50"
            >
              <AvatarDisplay avatar={friend.avatar} stage={friend.avatarStage} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{friend.username}</p>
                <p className="text-xs text-muted-foreground">
                  {friend.streak > 0 ? `🔥 ${friend.streak} week streak` : "No active streak"}
                </p>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">No friends found</p>
          )}
        </div>
      </div>
    </div>
  );
}
