export interface Challenge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  completed: boolean;
  hasVideo: boolean;
}

export type AvatarType = "dragon" | "tree" | "fox" | "owl" | "cat";
export type AvatarStage = 0 | 1 | 2 | 3;

export interface UserProfile {
  username: string;
  avatar: AvatarType;
  avatarStage: AvatarStage;
  streak: number;
  totalCompleted: number;
  friends: number;
  bestStreak: number;
  totalAttempted: number;
  isPublic: boolean;
  memberSince: string;
}

export interface FeedPost {
  id: string;
  username: string;
  avatar: AvatarType;
  avatarStage: AvatarStage;
  challengeTitle: string;
  thumbnailUrl: string;
  videoUrl: string;
  likes: number;
  liked: boolean;
  createdAt: string;
  daysAgo: number; // for time-decay scoring
  isFriend: boolean;
}

export const avatarEmojis: Record<AvatarType, string[]> = {
  dragon: ["🪦", "🐉", "🐲", "🐉✨"],
  tree:   ["🪦", "🌱", "🌳", "🌳🍎"],
  fox:    ["🪦", "🦊", "🦊", "🦊👑"],
  owl:    ["🪦", "🦉", "🦉", "🦉✨"],
  cat:    ["🪦", "🐱", "🐈", "🐈👑"],
};

export const avatarLabels: Record<AvatarStage, string> = {
  0: "R.I.P.",
  1: "Rookie",
  2: "Rising",
  3: "Legend",
};

// Legacy mock data removed — challenges now come from the database

export const mockFeedPosts: FeedPost[] = [];


export const getCompletedCount = (challenges: Challenge[]) =>
  challenges.filter((c) => c.completed).length;

export const getTimeUntilSunday = () => {
  const now = new Date();
  const sunday = new Date(now);
  const daysUntilSunday = now.getDay() === 0 ? 0 : 7 - now.getDay();
  sunday.setDate(now.getDate() + daysUntilSunday);
  sunday.setHours(23, 59, 59, 999);
  const diff = sunday.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds };
};

// Generate a consistent week key for localStorage (resets every Sunday)
export const getCurrentWeekKey = () => {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
};

// Time-decay scoring for "This Week" feed
export const getWeeklyScore = (post: FeedPost) => {
  const recencyBonus = Math.max(0, 7 - post.daysAgo) * 10;
  return post.likes + recencyBonus;
};
