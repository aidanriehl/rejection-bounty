import { useState, useEffect, useMemo, useRef } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Trophy, Shuffle, UserCheck, ChevronDown, ChevronUp, Play, Check, MessageCircle, History, Plus, Trash2, Star, Video, Upload, Inbox, Edit2, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { mockChallenges } from "@/lib/mock-data";
import AdminVideoEditor from "@/components/AdminVideoEditor";
import WinnerMessageThread from "@/components/WinnerMessageThread";
import { Input } from "@/components/ui/input";
import { AnimatePresence } from "framer-motion";

const ADMIN_EMAIL = "aidanriehl5@gmail.com";
const AUTO_MESSAGE = "Congrats on winning!!! As long as your bank account is linked in settings your funds should be on their way 🥳💰";

interface TicketEntry {
  user_id: string;
  username: string;
  avatar: string;
  video_count: number;
  tickets: number;
}

interface CompletionWithVideo {
  id: string;
  user_id: string;
  challenge_id: string;
  video_url: string | null;
  week_key: string;
}

interface PastWinner {
  id: string;
  week_key: string;
  winner_user_id: string;
  winning_video_url: string | null;
  thumbnail_url: string | null;
  prize_amount: number;
  status: string;
  created_at: string;
  username?: string;
  avatar?: string;
}

interface ChallengeItem {
  id: string;
  title: string;
  emoji: string;
  week_key: string;
  is_active: boolean;
}

interface FeaturedVideo {
  id: string;
  video_url: string;
  thumbnail_url: string | null;
  username: string;
  avatar: string;
  challenge_title: string;
  week_key: string;
  display_order: number;
}

function getAdminWeekKey() {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function getUpcomingWeeks(count: number = 8): string[] {
  const weeks: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const future = new Date(now.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const jan1 = new Date(future.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((future.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    weeks.push(`${future.getFullYear()}-W${String(weekNum).padStart(2, "0")}`);
  }
  return weeks;
}

function formatWeekLabel(weekKey: string): string {
  const match = weekKey.match(/(\d{4})-W(\d{2})/);
  if (!match) return weekKey;
  const [, year, week] = match;
  const currentWeek = getAdminWeekKey();
  if (weekKey === currentWeek) return `Week ${parseInt(week)} (Current)`;
  if (parseInt(week) === parseInt(currentWeek.split("-W")[1]) + 1) return `Week ${parseInt(week)} (Next)`;
  return `Week ${parseInt(week)}, ${year}`;
}

export default function Admin() {
  const { user, loading } = useAuth();
  const [weekKey] = useState(getAdminWeekKey);
  const [tickets, setTickets] = useState<TicketEntry[]>([]);
  const [completions, setCompletions] = useState<CompletionWithVideo[]>([]);
  const [prizeAmount, setPrizeAmount] = useState(0);
  const [drawing, setDrawing] = useState<any>(null);
  const [drawnUser, setDrawnUser] = useState<TicketEntry | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<CompletionWithVideo | null>(null);
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [showMessageThread, setShowMessageThread] = useState(false);
  const [pastWinners, setPastWinners] = useState<PastWinner[]>([]);
  const [pastWinnerThread, setPastWinnerThread] = useState<PastWinner | null>(null);

  // Support inbox
  interface SupportThread {
    user_id: string;
    username: string | null;
    avatar: string;
    last_message: string;
    last_time: string;
    unread: number;
  }
  const [supportThreads, setSupportThreads] = useState<SupportThread[]>([]);
  const [activeSupportUser, setActiveSupportUser] = useState<{ user_id: string; username: string | null } | null>(null);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [supportReply, setSupportReply] = useState("");
  const [sendingSupport, setSendingSupport] = useState(false);

  // Challenge management
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [newChallenge, setNewChallenge] = useState({ title: "", emoji: "", week_key: "" });
  const [selectedChallengeWeek, setSelectedChallengeWeek] = useState<string>("");
  const [editingChallenge, setEditingChallenge] = useState<ChallengeItem | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Featured videos
  const [featuredVideos, setFeaturedVideos] = useState<FeaturedVideo[]>([]);
  const [allVideosThisWeek, setAllVideosThisWeek] = useState<any[]>([]);
  const [showVideoSelector, setShowVideoSelector] = useState(false);

  // Check admin access - use same method as BottomNav
  const isAdmin = user?.email === ADMIN_EMAIL;

  // Fetch data
  useEffect(() => {
    if (!isAdmin) return;
    fetchData();
  }, [isAdmin, weekKey]);

  const fetchData = async () => {
    setLoadingData(true);

    // Get prize pool for current month
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: pool } = await supabase
      .from("prize_pool")
      .select("*")
      .eq("month", currentMonth)
      .maybeSingle();

    const totalPool = pool?.total_amount ?? 0;
    setPrizeAmount(Number(totalPool) / 4);

    // Get or create weekly drawing
    const { data: existingDrawing } = await supabase
      .from("weekly_drawings")
      .select("*")
      .eq("week_key", weekKey)
      .maybeSingle();

    if (existingDrawing) {
      setDrawing(existingDrawing);
      if (existingDrawing.prize_amount) setPrizeAmount(Number(existingDrawing.prize_amount));
    } else {
      setDrawing({ week_key: weekKey, status: "pending", prize_amount: Number(totalPool) / 4 });
    }

    // Calculate tickets via RPC
    const { data: ticketData } = await supabase.rpc("calculate_tickets", { p_week_key: weekKey });
    setTickets((ticketData as TicketEntry[]) ?? []);

    // Get all completions with videos for this week
    const { data: comps } = await supabase
      .from("challenge_completions")
      .select("*")
      .eq("week_key", weekKey)
      .not("video_url", "is", null);
    setCompletions((comps as CompletionWithVideo[]) ?? []);

    // Get past winners
    const { data: pastDrawings } = await supabase
      .from("weekly_drawings")
      .select("*")
      .eq("status", "complete")
      .order("created_at", { ascending: false })
      .limit(20);

    if (pastDrawings) {
      const winnerIds = pastDrawings.map((d: any) => d.winner_user_id).filter(Boolean);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar")
        .in("id", winnerIds);

      const profileMap: Record<string, any> = {};
      profiles?.forEach((p: any) => { profileMap[p.id] = p; });

      setPastWinners(pastDrawings.map((d: any) => ({
        ...d,
        username: profileMap[d.winner_user_id]?.username ?? "Unknown",
        avatar: profileMap[d.winner_user_id]?.avatar ?? "dragon",
      })));
    }

    // Get challenges (try from Supabase, fallback to mock)
    const { data: dbChallenges } = await (supabase as any)
      .from("challenges")
      .select("*")
      .order("created_at", { ascending: false });

    if (dbChallenges && dbChallenges.length > 0) {
      setChallenges(dbChallenges as ChallengeItem[]);
    } else {
      setChallenges(mockChallenges.map(c => ({
        id: c.id,
        title: c.title,
        emoji: c.emoji,
        week_key: weekKey,
        is_active: true,
      })));
    }

    // Get featured videos
    const { data: featured } = await (supabase as any)
      .from("featured_videos")
      .select("*")
      .eq("week_key", weekKey)
      .order("display_order", { ascending: true });

    if (featured) {
      setFeaturedVideos(featured as FeaturedVideo[]);
    }

    // Get all videos this week for selection
    const { data: allVids } = await supabase
      .from("challenge_completions")
      .select("*")
      .eq("week_key", weekKey)
      .not("video_url", "is", null);

    if (allVids) {
      const userIds = [...new Set(allVids.map((v: any) => v.user_id))];
      const { data: vidProfiles } = await supabase
        .from("profiles")
        .select("id, username, avatar")
        .in("id", userIds);

      const profMap: Record<string, any> = {};
      vidProfiles?.forEach((p: any) => { profMap[p.id] = p; });

      setAllVideosThisWeek(allVids.map((v: any) => ({
        ...v,
        username: profMap[v.user_id]?.username ?? "Unknown",
        avatar: profMap[v.user_id]?.avatar ?? "dragon",
      })));
    }

    // Fetch support threads
    const { data: allMsgs } = await supabase
      .from("user_messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (allMsgs) {
      const threadMap: Record<string, { msgs: any[] }> = {};
      allMsgs.forEach((m: any) => {
        if (!threadMap[m.user_id]) threadMap[m.user_id] = { msgs: [] };
        threadMap[m.user_id].msgs.push(m);
      });

      const userIds = Object.keys(threadMap);
      const { data: threadProfiles } = await supabase
        .from("profiles")
        .select("id, username, avatar")
        .in("id", userIds);

      const profLookup: Record<string, any> = {};
      threadProfiles?.forEach((p: any) => { profLookup[p.id] = p; });

      const threads: SupportThread[] = userIds.map((uid) => {
        const msgs = threadMap[uid].msgs;
        const lastMsg = msgs[0];
        return {
          user_id: uid,
          username: profLookup[uid]?.username ?? null,
          avatar: profLookup[uid]?.avatar ?? "dragon",
          last_message: lastMsg.message,
          last_time: lastMsg.created_at,
          unread: 0,
        };
      });

      threads.sort((a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime());
      setSupportThreads(threads);
    }

    setLoadingData(false);
  };

  // Add a new challenge
  const handleAddChallenge = async () => {
    if (!newChallenge.title || !newChallenge.emoji || !newChallenge.week_key) return;

    // Check if week already has 8 challenges
    const weekChallenges = challenges.filter(c => c.week_key === newChallenge.week_key);
    if (weekChallenges.length >= 8) {
      alert(`Week ${newChallenge.week_key} already has 8 challenges!`);
      return;
    }

    await (supabase as any).from("challenges").insert({
      title: newChallenge.title,
      emoji: newChallenge.emoji,
      description: newChallenge.title,
      week_key: newChallenge.week_key,
      is_active: true,
    } as any);

    setNewChallenge({ title: "", emoji: "", week_key: newChallenge.week_key });
    fetchData();
  };

  // Update an existing challenge
  const handleUpdateChallenge = async () => {
    if (!editingChallenge) return;

    await (supabase as any)
      .from("challenges")
      .update({
        title: editingChallenge.title,
        emoji: editingChallenge.emoji,
      })
      .eq("id", editingChallenge.id);

    setEditingChallenge(null);
    fetchData();
  };

  // CSV upload for challenges - format: title, emoji, week_key
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split("\n").filter(l => l.trim());

    // Parse CSV: title, emoji, week_key
    const challengesToInsert = lines.map(line => {
      const parts = line.split(",").map(p => p.trim());
      if (parts.length < 3) return null;
      const [title, emoji, week_key] = parts;
      // Normalize week_key format to YYYY-WXX
      const normalizedWeek = week_key.toUpperCase().replace(/^(\d{4})-W(\d)$/, "$1-W0$2");
      return {
        title,
        emoji,
        description: title,
        week_key: normalizedWeek,
        is_active: true,
      };
    }).filter((c): c is NonNullable<typeof c> => c !== null && !!c.emoji && !!c.title && !!c.week_key);

    // Group by week and validate
    const byWeek: Record<string, typeof challengesToInsert> = {};
    for (const ch of challengesToInsert) {
      if (!byWeek[ch.week_key]) byWeek[ch.week_key] = [];
      byWeek[ch.week_key].push(ch);
    }

    // Check existing challenges per week
    for (const wk of Object.keys(byWeek)) {
      const existing = challenges.filter(c => c.week_key === wk).length;
      const adding = byWeek[wk].length;
      if (existing + adding > 8) {
        alert(`Week ${wk} would have ${existing + adding} challenges (max 8). Existing: ${existing}, Adding: ${adding}`);
        if (csvInputRef.current) csvInputRef.current.value = "";
        return;
      }
    }

    if (challengesToInsert.length > 0) {
      await (supabase as any).from("challenges").insert(challengesToInsert as any);
      fetchData();
    }

    if (csvInputRef.current) csvInputRef.current.value = "";
  };

  // Delete a challenge
  const handleDeleteChallenge = async (id: string) => {
    await (supabase as any).from("challenges").delete().eq("id", id);
    fetchData();
  };

  // Add video to featured
  const handleAddFeatured = async (video: any) => {
    const ch = getChallengeInfo(video.challenge_id);
    const nextOrder = featuredVideos.length;

    await (supabase as any).from("featured_videos").insert({
      video_url: video.video_url,
      thumbnail_url: video.thumbnail_url || null,
      username: video.username,
      avatar: video.avatar,
      challenge_title: ch.title,
      week_key: weekKey,
      display_order: nextOrder,
      completion_id: video.id,
    } as any);

    setShowVideoSelector(false);
    fetchData();
  };

  // Remove from featured
  const handleRemoveFeatured = async (id: string) => {
    await (supabase as any).from("featured_videos").delete().eq("id", id);
    fetchData();
  };

  const totalTickets = useMemo(() => tickets.reduce((s, t) => s + t.tickets, 0), [tickets]);

  const handleRandomDraw = () => {
    if (totalTickets === 0) return;
    const pool: TicketEntry[] = [];
    tickets.forEach((t) => {
      for (let i = 0; i < t.tickets; i++) pool.push(t);
    });
    const winner = pool[Math.floor(Math.random() * pool.length)];
    setDrawnUser(winner);
    setSelectedVideo(null);
  };

  const confirmWinner = async (userId: string, videoUrl?: string) => {
    const { data } = await supabase
      .from("weekly_drawings")
      .upsert({
        week_key: weekKey,
        prize_amount: prizeAmount,
        winner_user_id: userId,
        winning_video_url: videoUrl ?? null,
        status: "complete",
      }, { onConflict: "week_key" })
      .select()
      .single();

    await supabase.from("winner_messages").insert({
      week_key: weekKey,
      winner_user_id: userId,
      sender: "admin",
      message: AUTO_MESSAGE,
    } as any);

    setDrawing(data);
    setDrawnUser(null);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-2xl animate-pulse">⚙️</span>
      </div>
    );
  }

  if (!user || !isAdmin) return <Navigate to="/" replace />;

  const getUserCompletions = (userId: string) =>
    completions.filter((c) => c.user_id === userId);

  const getChallengeInfo = (challengeId: string) => {
    const ch = mockChallenges.find((c) => c.id === challengeId);
    return ch ? { emoji: ch.emoji, title: ch.title } : { emoji: "🎯", title: `Challenge ${challengeId}` };
  };

  const avatarEmoji = (a: string) =>
    a === "dragon" ? "🐉" : a === "fox" ? "🦊" : a === "owl" ? "🦉" : a === "cat" ? "🐱" : "🌳";

  const currentWinnerName = tickets.find(t => t.user_id === drawing?.winner_user_id)?.username ?? "Winner";

  return (
    <div className="min-h-screen pb-24 pt-6">
      <div className="mx-auto max-w-lg px-4">
        <h1 className="text-2xl font-black text-foreground mb-6">Admin Dashboard</h1>

        {/* Section 1: This Week's Drawing */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-primary" />
              This Week's Drawing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">Week</p>
                <p className="text-lg font-bold text-foreground">{weekKey}</p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">Prize</p>
                <p className="text-lg font-bold text-primary">${prizeAmount.toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">Total Tickets</p>
                <p className="text-lg font-bold text-foreground">{totalTickets}</p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">Users w/ Tickets</p>
                <p className="text-lg font-bold text-foreground">{tickets.length}</p>
              </div>
            </div>
            {drawing?.status === "complete" && (
              <div className="mt-4 rounded-lg border-2 border-primary/30 bg-primary/5 p-3">
                <Badge variant="default" className="mb-1">Winner Selected</Badge>
                <p className="text-sm font-bold text-foreground">{currentWinnerName}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Draw Winner */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shuffle className="h-5 w-5 text-primary" />
              Draw Winner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="random">
              <TabsList className="w-full">
                <TabsTrigger value="random" className="flex-1">Random Draw</TabsTrigger>
                <TabsTrigger value="manual" className="flex-1">Manual Pick</TabsTrigger>
              </TabsList>

              <TabsContent value="random" className="mt-4">
                <Button
                  onClick={handleRandomDraw}
                  disabled={totalTickets === 0 || drawing?.status === "complete"}
                  className="w-full mb-4"
                >
                  <Shuffle className="h-4 w-4 mr-2" />
                  {drawing?.status === "complete" ? "Winner Already Selected" : drawnUser ? "Re-draw" : "Draw Random Winner"}
                </Button>

                {drawnUser && (
                  <div className="rounded-xl border-2 border-primary bg-primary/5 p-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                        {avatarEmoji(drawnUser.avatar)}
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{drawnUser.username}</p>
                        <p className="text-sm text-muted-foreground">
                          {drawnUser.tickets} tickets · {drawnUser.video_count} videos
                        </p>
                      </div>
                    </div>

                    {getUserCompletions(drawnUser.user_id).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Their videos this week:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {getUserCompletions(drawnUser.user_id).map((c) => {
                            const ch = getChallengeInfo(c.challenge_id);
                            const isSelected = selectedVideo?.id === c.id;
                            return (
                              <div
                                key={c.id}
                                className={`rounded-lg border-2 overflow-hidden transition-colors ${
                                  isSelected ? "border-primary bg-primary/10" : "border-border bg-muted"
                                }`}
                              >
                                <button
                                  onClick={() => c.video_url && setPreviewVideo(c.video_url)}
                                  className="relative w-full aspect-video bg-background flex items-center justify-center"
                                >
                                  {c.video_url ? (
                                    <>
                                      <video src={c.video_url} className="h-full w-full object-cover" />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                        <Play className="h-6 w-6 text-white fill-white" />
                                      </div>
                                    </>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">No video</span>
                                  )}
                                </button>
                                <div className="p-2 space-y-1.5">
                                  <p className="text-xs text-foreground truncate">
                                    {ch.emoji} {ch.title}
                                  </p>
                                  <Button
                                    size="sm"
                                    variant={isSelected ? "default" : "outline"}
                                    className="w-full h-7 text-xs"
                                    onClick={() => setSelectedVideo(isSelected ? null : c)}
                                  >
                                    {isSelected ? <><Check className="h-3 w-3 mr-1" /> Selected</> : "Select This Video"}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {selectedVideo && !showEditor && (
                      <div className="flex gap-2 pt-1">
                        <Button onClick={() => setShowEditor(true)} className="flex-1">
                          <UserCheck className="h-4 w-4 mr-2" />
                          Edit & Confirm Winner
                        </Button>
                        <Button variant="outline" onClick={handleRandomDraw}>Re-draw</Button>
                      </div>
                    )}

                    {selectedVideo && showEditor && selectedVideo.video_url && (
                      <AdminVideoEditor
                        videoUrl={selectedVideo.video_url}
                        weekKey={weekKey}
                        winnerId={drawnUser.user_id}
                        onSave={async (editData) => {
                          await supabase
                            .from("weekly_drawings")
                            .upsert({
                              week_key: weekKey,
                              prize_amount: prizeAmount,
                              winner_user_id: drawnUser.user_id,
                              winning_video_url: selectedVideo.video_url,
                              status: "complete",
                              thumbnail_url: editData.thumbnail_url,
                              trim_start: editData.trim_start,
                              trim_end: editData.trim_end,
                            } as any, { onConflict: "week_key" })
                            .select()
                            .single();
                          await supabase.from("winner_messages").insert({
                            week_key: weekKey,
                            winner_user_id: drawnUser.user_id,
                            sender: "admin",
                            message: AUTO_MESSAGE,
                          } as any);
                          setDrawnUser(null);
                          setShowEditor(false);
                          fetchData();
                        }}
                        onCancel={() => setShowEditor(false)}
                      />
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="manual" className="mt-4">
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-2">
                    {tickets.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No users with videos this week</p>
                    )}
                    {tickets.map((t) => (
                      <div key={t.user_id} className="rounded-lg border bg-card">
                        <button
                          onClick={() => setExpandedUser(expandedUser === t.user_id ? null : t.user_id)}
                          className="w-full flex items-center gap-3 p-3 text-left"
                        >
                          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-lg">
                            {avatarEmoji(t.avatar)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">{t.username}</p>
                            <p className="text-xs text-muted-foreground">{t.tickets} tickets · {t.video_count} vids</p>
                          </div>
                          {expandedUser === t.user_id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </button>

                        {expandedUser === t.user_id && (
                          <div className="px-3 pb-3 space-y-2">
                            {getUserCompletions(t.user_id).map((c) => (
                              <div key={c.id} className="flex items-center gap-2 rounded-lg bg-muted p-2">
                                <div className="h-12 w-12 rounded-lg bg-background flex items-center justify-center overflow-hidden shrink-0">
                                  {c.video_url ? <video src={c.video_url} className="h-full w-full object-cover" /> : <span className="text-xs text-muted-foreground">—</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground truncate">Challenge {c.challenge_id}</p>
                                </div>
                                <Button size="sm" onClick={() => confirmWinner(t.user_id, c.video_url ?? undefined)} disabled={drawing?.status === "complete"}>
                                  Select
                                </Button>
                              </div>
                            ))}
                            {getUserCompletions(t.user_id).length === 0 && <p className="text-xs text-muted-foreground">No videos found</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Section 3: Featured Videos (Recap) */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Star className="h-5 w-5 text-primary" />
              Featured Videos (Recap)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">Select up to 4 videos for "Top Videos This Week" on recap.</p>

            {featuredVideos.length > 0 ? (
              <div className="space-y-2 mb-3">
                {featuredVideos.map((v, i) => (
                  <div key={v.id} className="flex items-center gap-3 rounded-lg bg-muted p-2">
                    <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                    <div className="h-10 w-10 rounded-lg bg-background overflow-hidden shrink-0">
                      {v.thumbnail_url ? <img src={v.thumbnail_url} className="h-full w-full object-cover" /> : v.video_url ? <video src={v.video_url} className="h-full w-full object-cover" /> : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{v.username}</p>
                      <p className="text-xs text-muted-foreground truncate">{v.challenge_title}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleRemoveFeatured(v.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No featured videos yet</p>
            )}

            {featuredVideos.length < 4 && (
              <Button onClick={() => setShowVideoSelector(true)} className="w-full" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Featured Video
              </Button>
            )}

            {showVideoSelector && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-card rounded-xl border border-border max-w-md w-full max-h-[70vh] overflow-hidden">
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-bold text-foreground">Select a Video</h3>
                    <Button size="sm" variant="ghost" onClick={() => setShowVideoSelector(false)}>✕</Button>
                  </div>
                  <ScrollArea className="max-h-[50vh] p-4">
                    <div className="space-y-2">
                      {allVideosThisWeek.filter(v => !featuredVideos.some(f => f.video_url === v.video_url)).map((v) => {
                        const ch = getChallengeInfo(v.challenge_id);
                        return (
                          <button key={v.id} onClick={() => handleAddFeatured(v)} className="flex items-center gap-3 rounded-lg bg-muted p-2 w-full text-left hover:bg-muted/70 transition-colors">
                            <div className="h-12 w-12 rounded-lg bg-background overflow-hidden shrink-0">
                              <video src={v.video_url} className="h-full w-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{v.username}</p>
                              <p className="text-xs text-muted-foreground truncate">{ch.emoji} {ch.title}</p>
                            </div>
                          </button>
                        );
                      })}
                      {allVideosThisWeek.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No videos this week</p>}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 4: Manage Challenges */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              Manage Challenges
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* CSV Upload */}
            <div className="rounded-lg border border-dashed border-border p-4 mb-4 text-center">
              <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
              <Button variant="outline" onClick={() => csvInputRef.current?.click()} className="mb-2">
                <Upload className="h-4 w-4 mr-2" />
                Upload CSV
              </Button>
              <p className="text-xs text-muted-foreground">Format: <code className="bg-muted px-1 rounded">title, emoji, week</code></p>
              <p className="text-[10px] text-muted-foreground mt-1">Example: Ask a stranger for a high-five, 🖐️, 2026-W11</p>
            </div>

            {/* Week Status Overview */}
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Week Status</p>
              <div className="flex flex-wrap gap-2">
                {getUpcomingWeeks(6).map(wk => {
                  const count = challenges.filter(c => c.week_key === wk).length;
                  const isComplete = count === 8;
                  const isCurrent = wk === getAdminWeekKey();
                  return (
                    <button
                      key={wk}
                      onClick={() => setSelectedChallengeWeek(selectedChallengeWeek === wk ? "" : wk)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        selectedChallengeWeek === wk
                          ? "bg-primary text-primary-foreground"
                          : isComplete
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : count > 0 ? (
                        <AlertCircle className="h-3 w-3" />
                      ) : null}
                      <span>W{wk.split("-W")[1]}</span>
                      <span className="opacity-60">{count}/8</span>
                      {isCurrent && <span className="text-[10px]">(now)</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Add single challenge */}
            <div className="rounded-lg border border-border p-3 mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Add Single Challenge</p>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Challenge title"
                  value={newChallenge.title}
                  onChange={(e) => setNewChallenge(prev => ({ ...prev, title: e.target.value }))}
                  className="flex-1"
                />
                <Input
                  placeholder="🎯"
                  value={newChallenge.emoji}
                  onChange={(e) => setNewChallenge(prev => ({ ...prev, emoji: e.target.value }))}
                  className="w-14 text-center"
                />
              </div>
              <select
                value={newChallenge.week_key}
                onChange={(e) => setNewChallenge(prev => ({ ...prev, week_key: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mb-2"
              >
                <option value="">Select week...</option>
                {getUpcomingWeeks(8).map(wk => (
                  <option key={wk} value={wk}>{formatWeekLabel(wk)} ({challenges.filter(c => c.week_key === wk).length}/8)</option>
                ))}
              </select>
              <Button
                onClick={handleAddChallenge}
                className="w-full"
                disabled={!newChallenge.title || !newChallenge.emoji || !newChallenge.week_key}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Challenge
              </Button>
            </div>

            {/* Challenges by selected week */}
            {selectedChallengeWeek && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">
                    {formatWeekLabel(selectedChallengeWeek)} — {challenges.filter(c => c.week_key === selectedChallengeWeek).length}/8 challenges
                  </p>
                </div>
                {challenges.filter(c => c.week_key === selectedChallengeWeek).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No challenges for this week</p>
                ) : (
                  challenges.filter(c => c.week_key === selectedChallengeWeek).map((ch, idx) => (
                    <div key={ch.id} className="flex items-center gap-3 rounded-lg bg-muted p-2">
                      <span className="text-xs font-bold text-muted-foreground w-5">{idx + 1}</span>
                      <span className="text-lg">{ch.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{ch.title}</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setEditingChallenge(ch)}>
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteChallenge(ch.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* All challenges (when no week selected) */}
            {!selectedChallengeWeek && challenges.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">All Challenges (tap a week above to filter)</p>
                <p className="text-xs text-muted-foreground">{challenges.length} total challenges</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Challenge Dialog */}
        <Dialog open={!!editingChallenge} onOpenChange={() => setEditingChallenge(null)}>
          <DialogContent className="max-w-sm">
            <h3 className="text-lg font-bold mb-4">Edit Challenge</h3>
            {editingChallenge && (
              <div className="space-y-3">
                <Input
                  placeholder="Challenge title"
                  value={editingChallenge.title}
                  onChange={(e) => setEditingChallenge({ ...editingChallenge, title: e.target.value })}
                />
                <Input
                  placeholder="🎯"
                  value={editingChallenge.emoji}
                  onChange={(e) => setEditingChallenge({ ...editingChallenge, emoji: e.target.value })}
                  className="w-20"
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditingChallenge(null)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateChallenge} className="flex-1">
                    Save
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Section 5: Past Winners */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-primary" />
              Past Winners
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pastWinners.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No winners yet</p>
            ) : (
              <div className="space-y-2">
                {pastWinners.map((pw) => {
                  const weekNum = pw.week_key.split("-w")[1];
                  const year = pw.week_key.split("-w")[0];
                  return (
                    <div key={pw.id} className="flex items-center gap-3 rounded-lg bg-muted p-3">
                      <div className="h-9 w-9 rounded-full bg-background flex items-center justify-center text-lg">
                        {avatarEmoji(pw.avatar ?? "dragon")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{pw.username}</p>
                        <p className="text-xs text-muted-foreground">
                          Week {weekNum}, {year} · ${Number(pw.prize_amount).toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={() => setPastWinnerThread(pw)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-background text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 6: Message Current Winner (Settings replacement) */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="h-5 w-5 text-primary" />
              Winner Messaging
            </CardTitle>
          </CardHeader>
          <CardContent>
            {drawing?.status === "complete" && drawing?.winner_user_id ? (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-xl">
                  {avatarEmoji(tickets.find(t => t.user_id === drawing.winner_user_id)?.avatar ?? "dragon")}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{currentWinnerName}</p>
                  <p className="text-xs text-muted-foreground">This week's winner</p>
                </div>
                <Button onClick={() => setShowMessageThread(true)}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No winner selected yet this week</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Video Preview Dialog */}
      <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
        <DialogContent className="max-w-sm p-2">
          {previewVideo && <video src={previewVideo} controls autoPlay className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>

      {/* Current winner message thread */}
      <AnimatePresence>
        {showMessageThread && drawing?.winner_user_id && (
          <WinnerMessageThread
            weekKey={weekKey}
            userId={user!.id}
            daysLeft={7}
            onClose={() => setShowMessageThread(false)}
            isAdmin
            adminTargetUserId={drawing.winner_user_id}
            winnerName={currentWinnerName}
          />
        )}
      </AnimatePresence>

      {/* Past winner message thread */}
      <AnimatePresence>
        {pastWinnerThread && (
          <WinnerMessageThread
            weekKey={pastWinnerThread.week_key}
            userId={user!.id}
            daysLeft={0}
            onClose={() => setPastWinnerThread(null)}
            isAdmin
            adminTargetUserId={pastWinnerThread.winner_user_id}
            winnerName={pastWinnerThread.username}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
