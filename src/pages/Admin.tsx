import { useState, useEffect, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Trophy, Users, Shuffle, UserCheck, ChevronDown, ChevronUp, Info, Play, Check, MessageCircle, Settings, History, Plus, Trash2, Star, Video, Edit2 } from "lucide-react";
import { mockChallenges } from "@/lib/mock-data";
import AdminVideoEditor from "@/components/AdminVideoEditor";
import WinnerMessageThread from "@/components/WinnerMessageThread";
import { Input } from "@/components/ui/input";

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
  description: string;
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
  return `${now.getFullYear()}-w${weekNum}`;
}

export default function Admin() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
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
  const [messagingEnabled, setMessagingEnabled] = useState(true);
  const [showMessageThread, setShowMessageThread] = useState(false);
  const [pastWinners, setPastWinners] = useState<PastWinner[]>([]);
  const [expandedPastWinner, setExpandedPastWinner] = useState<string | null>(null);
  const [pastWinnerThread, setPastWinnerThread] = useState<PastWinner | null>(null);

  // Challenge management
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [newChallenge, setNewChallenge] = useState({ title: "", emoji: "", description: "" });
  const [editingChallenge, setEditingChallenge] = useState<string | null>(null);

  // Featured videos
  const [featuredVideos, setFeaturedVideos] = useState<FeaturedVideo[]>([]);
  const [allVideosThisWeek, setAllVideosThisWeek] = useState<any[]>([]);
  const [showVideoSelector, setShowVideoSelector] = useState(false);

  // Check admin access
  useEffect(() => {
    if (!user) return;
    supabase.auth.getUser().then(({ data }) => {
      setIsAdmin(data.user?.email === ADMIN_EMAIL);
    });
  }, [user]);

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

    // Get app settings
    const { data: settings } = await supabase
      .from("app_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (settings) setMessagingEnabled((settings as any).winner_messaging_enabled ?? true);

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
    const { data: dbChallenges } = await (supabase
      .from("challenges" as any)
      .select("*")
      .order("created_at", { ascending: false }) as any);

    if (dbChallenges && dbChallenges.length > 0) {
      setChallenges(dbChallenges as ChallengeItem[]);
    } else {
      // Use mock challenges as fallback
      setChallenges(mockChallenges.map(c => ({
        id: c.id,
        title: c.title,
        emoji: c.emoji,
        description: c.description,
        week_key: weekKey,
        is_active: true,
      })));
    }

    // Get featured videos
    const { data: featured } = await (supabase
      .from("featured_videos" as any)
      .select("*")
      .eq("week_key", weekKey)
      .order("display_order", { ascending: true }) as any);

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
      // Get usernames for all videos
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

    setLoadingData(false);
  };

  // Add a new challenge
  const handleAddChallenge = async () => {
    if (!newChallenge.title || !newChallenge.emoji) return;

    // Calculate next week key
    const now = new Date();
    const jan1 = new Date(now.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    const nextWeekKey = `${now.getFullYear()}-w${weekNum + 1}`;

    const { error } = await supabase
      .from("challenges")
      .insert({
        title: newChallenge.title,
        emoji: newChallenge.emoji,
        description: newChallenge.description || newChallenge.title,
        week_key: nextWeekKey,
        is_active: true,
      } as any);

    if (!error) {
      setNewChallenge({ title: "", emoji: "", description: "" });
      fetchData();
    }
  };

  // Delete a challenge
  const handleDeleteChallenge = async (id: string) => {
    await supabase.from("challenges").delete().eq("id", id);
    fetchData();
  };

  // Add video to featured
  const handleAddFeatured = async (video: any) => {
    const ch = getChallengeInfo(video.challenge_id);
    const nextOrder = featuredVideos.length;

    await supabase.from("featured_videos").insert({
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
    await supabase.from("featured_videos").delete().eq("id", id);
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

    // Send auto congratulations message
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

  const toggleMessaging = async (enabled: boolean) => {
    setMessagingEnabled(enabled);
    await supabase
      .from("app_settings")
      .update({ winner_messaging_enabled: enabled, updated_at: new Date().toISOString() } as any)
      .not("id", "is", null);
  };

  if (loading || isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-2xl animate-pulse">⚙️</span>
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  const getUserCompletions = (userId: string) =>
    completions.filter((c) => c.user_id === userId);

  const getChallengeInfo = (challengeId: string) => {
    const ch = mockChallenges.find((c) => c.id === challengeId);
    return ch ? { emoji: ch.emoji, title: ch.title } : { emoji: "🎯", title: `Challenge ${challengeId}` };
  };

  const avatarEmoji = (a: string) =>
    a === "dragon" ? "🐉" : a === "fox" ? "🦊" : a === "owl" ? "🦉" : a === "cat" ? "🐱" : "🌳";

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
                <p className="text-sm font-bold text-foreground">
                  {tickets.find(t => t.user_id === drawing.winner_user_id)?.username ?? drawing.winner_user_id}
                </p>
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
                    {/* Winner info */}
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

                    {/* Video grid */}
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
                                {/* Thumbnail */}
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
                                {/* Challenge info + select */}
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
                                    {isSelected ? (
                                      <><Check className="h-3 w-3 mr-1" /> Selected</>
                                    ) : (
                                      "Select This Video"
                                    )}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Confirm / Edit / Re-draw */}
                    {selectedVideo && !showEditor && (
                      <div className="flex gap-2 pt-1">
                        <Button
                          onClick={() => setShowEditor(true)}
                          className="flex-1"
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Edit & Confirm Winner
                        </Button>
                        <Button variant="outline" onClick={handleRandomDraw}>
                          Re-draw
                        </Button>
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
                          // Send auto congratulations message
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
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No users with videos this week
                      </p>
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
                          {expandedUser === t.user_id ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>

                        {expandedUser === t.user_id && (
                          <div className="px-3 pb-3 space-y-2">
                            {getUserCompletions(t.user_id).map((c) => (
                              <div key={c.id} className="flex items-center gap-2 rounded-lg bg-muted p-2">
                                <div className="h-12 w-12 rounded-lg bg-background flex items-center justify-center overflow-hidden shrink-0">
                                  {c.video_url ? (
                                    <video src={c.video_url} className="h-full w-full object-cover" />
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground truncate">Challenge {c.challenge_id}</p>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => confirmWinner(t.user_id, c.video_url ?? undefined)}
                                  disabled={drawing?.status === "complete"}
                                >
                                  Select
                                </Button>
                              </div>
                            ))}
                            {getUserCompletions(t.user_id).length === 0 && (
                              <p className="text-xs text-muted-foreground">No videos found</p>
                            )}
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

        {/* Section 3: Ticket Calculation Reference */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="h-5 w-5 text-primary" />
              Ticket Calculation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                <span className="text-muted-foreground">1 video</span>
                <Badge variant="secondary">1 ticket</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                <span className="text-muted-foreground">2 videos</span>
                <Badge variant="secondary">2 tickets</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                <span className="text-muted-foreground">3 videos</span>
                <Badge variant="secondary">3 tickets</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                <span className="text-muted-foreground">4 videos</span>
                <Badge variant="secondary">4 tickets</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2 border border-primary/20">
                <span className="font-bold text-foreground">5+ videos</span>
                <Badge variant="default">8 tickets (bonus!)</Badge>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Each challenge completion with a video counts. 5 or more = 8 tickets (capped).
              Subscription adds $3.50/mo to the prize pool. Weekly prize = pool / 4.
            </p>
          </CardContent>
        </Card>

        {/* Section 4: Settings */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="h-5 w-5 text-primary" />
              Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg bg-muted p-3">
              <div>
                <p className="text-sm font-bold text-foreground">Winner Messaging</p>
                <p className="text-xs text-muted-foreground">Show gold banner to winners</p>
              </div>
              <Switch checked={messagingEnabled} onCheckedChange={toggleMessaging} />
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Message Current Winner */}
        {drawing?.status === "complete" && drawing?.winner_user_id && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageCircle className="h-5 w-5 text-primary" />
                Message Winner
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-xl">
                  {avatarEmoji(tickets.find(t => t.user_id === drawing.winner_user_id)?.avatar ?? "dragon")}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {tickets.find(t => t.user_id === drawing.winner_user_id)?.username ?? "Winner"}
                  </p>
                  <p className="text-xs text-muted-foreground">{weekKey}</p>
                </div>
              </div>
              <Button onClick={() => setShowMessageThread(true)} className="w-full">
                <MessageCircle className="h-4 w-4 mr-2" />
                Open Message Thread
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Section 6: Past Winners */}
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
                  const isExpanded = expandedPastWinner === pw.id;
                  return (
                    <div key={pw.id} className="rounded-lg border bg-card">
                      <button
                        onClick={() => setExpandedPastWinner(isExpanded ? null : pw.id)}
                        className="w-full flex items-center gap-3 p-3 text-left"
                      >
                        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-lg">
                          {avatarEmoji(pw.avatar ?? "dragon")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{pw.username}</p>
                          <p className="text-xs text-muted-foreground">
                            Week {weekNum}, {year} · ${Number(pw.prize_amount).toFixed(2)}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">
                          {pw.status === "complete" ? "Paid" : "Pending"}
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="px-3 pb-3 space-y-2">
                          {pw.thumbnail_url && (
                            <img src={pw.thumbnail_url} alt="Winner thumbnail" className="w-full rounded-lg border" />
                          )}
                          {pw.winning_video_url && !pw.thumbnail_url && (
                            <video src={pw.winning_video_url} className="w-full rounded-lg" controls />
                          )}
                          <p className="text-xs text-muted-foreground">
                            Drawn: {new Date(pw.created_at).toLocaleDateString()}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => setPastWinnerThread(pw)}
                          >
                            <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                            View Message History
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 7: Featured Videos */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Star className="h-5 w-5 text-primary" />
              Featured Videos (Recap)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Select up to 4 videos to feature in "Top Videos This Week" on the recap screen.
            </p>

            {featuredVideos.length > 0 ? (
              <div className="space-y-2 mb-3">
                {featuredVideos.map((v, i) => (
                  <div key={v.id} className="flex items-center gap-3 rounded-lg bg-muted p-2">
                    <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                    <div className="h-10 w-10 rounded-lg bg-background overflow-hidden shrink-0">
                      {v.thumbnail_url ? (
                        <img src={v.thumbnail_url} className="h-full w-full object-cover" />
                      ) : v.video_url ? (
                        <video src={v.video_url} className="h-full w-full object-cover" />
                      ) : null}
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

            {/* Video selector modal */}
            {showVideoSelector && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-card rounded-xl border border-border max-w-md w-full max-h-[70vh] overflow-hidden">
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-bold text-foreground">Select a Video</h3>
                    <Button size="sm" variant="ghost" onClick={() => setShowVideoSelector(false)}>
                      ✕
                    </Button>
                  </div>
                  <ScrollArea className="max-h-[50vh] p-4">
                    <div className="space-y-2">
                      {allVideosThisWeek
                        .filter(v => !featuredVideos.some(f => f.video_url === v.video_url))
                        .map((v) => {
                          const ch = getChallengeInfo(v.challenge_id);
                          return (
                            <button
                              key={v.id}
                              onClick={() => handleAddFeatured(v)}
                              className="flex items-center gap-3 rounded-lg bg-muted p-2 w-full text-left hover:bg-muted/70 transition-colors"
                            >
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
                      {allVideosThisWeek.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No videos this week</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 8: Challenge Management */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Video className="h-5 w-5 text-primary" />
              Manage Challenges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Add challenges for next week. Current challenges are from mockChallenges until you add to the database.
            </p>

            {/* Add new challenge form */}
            <div className="rounded-lg border border-border p-3 mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Add New Challenge</p>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Emoji"
                    value={newChallenge.emoji}
                    onChange={(e) => setNewChallenge(prev => ({ ...prev, emoji: e.target.value }))}
                    className="w-16"
                  />
                  <Input
                    placeholder="Challenge title"
                    value={newChallenge.title}
                    onChange={(e) => setNewChallenge(prev => ({ ...prev, title: e.target.value }))}
                    className="flex-1"
                  />
                </div>
                <Input
                  placeholder="Description (optional)"
                  value={newChallenge.description}
                  onChange={(e) => setNewChallenge(prev => ({ ...prev, description: e.target.value }))}
                />
                <Button onClick={handleAddChallenge} className="w-full" disabled={!newChallenge.title || !newChallenge.emoji}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Challenge for Next Week
                </Button>
              </div>
            </div>

            {/* Existing challenges */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Current Challenges</p>
              {challenges.map((ch) => (
                <div key={ch.id} className="flex items-center gap-3 rounded-lg bg-muted p-2">
                  <span className="text-lg">{ch.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{ch.title}</p>
                    <p className="text-xs text-muted-foreground">{ch.week_key}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteChallenge(ch.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Video Preview Dialog */}
      <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
        <DialogContent className="max-w-sm p-2">
          {previewVideo && (
            <video src={previewVideo} controls autoPlay className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>

      {/* Current winner message thread */}
      {showMessageThread && drawing?.winner_user_id && (
        <WinnerMessageThread
          weekKey={weekKey}
          userId={user!.id}
          daysLeft={7}
          onClose={() => setShowMessageThread(false)}
          isAdmin
          adminTargetUserId={drawing.winner_user_id}
        />
      )}

      {/* Past winner message thread */}
      {pastWinnerThread && (
        <WinnerMessageThread
          weekKey={pastWinnerThread.week_key}
          userId={user!.id}
          daysLeft={0}
          onClose={() => setPastWinnerThread(null)}
          isAdmin
          adminTargetUserId={pastWinnerThread.winner_user_id}
        />
      )}
    </div>
  );
}
