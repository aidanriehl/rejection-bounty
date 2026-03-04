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
import { Trophy, Users, Ticket, Shuffle, UserCheck, ChevronDown, ChevronUp, Info, Play, Check } from "lucide-react";
import { mockChallenges } from "@/lib/mock-data";

const ADMIN_EMAIL = "aidanriehl5@gmail.com";

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
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

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

    setLoadingData(false);
  };

  const totalTickets = useMemo(() => tickets.reduce((s, t) => s + t.tickets, 0), [tickets]);

  const handleRandomDraw = () => {
    if (totalTickets === 0) return;
    // Weighted random selection
    const pool: TicketEntry[] = [];
    tickets.forEach((t) => {
      for (let i = 0; i < t.tickets; i++) pool.push(t);
    });
    const winner = pool[Math.floor(Math.random() * pool.length)];
    setDrawnUser(winner);
  };

  const confirmWinner = async (userId: string, videoUrl?: string) => {
    // Upsert weekly drawing
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

    setDrawing(data);
    setDrawnUser(null);
    fetchData();
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
                  {drawing?.status === "complete" ? "Winner Already Selected" : "Draw Random Winner"}
                </Button>

                {drawnUser && (
                  <div className="rounded-xl border-2 border-primary bg-primary/5 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                        {drawnUser.avatar === "dragon" ? "🐉" :
                         drawnUser.avatar === "fox" ? "🦊" :
                         drawnUser.avatar === "owl" ? "🦉" :
                         drawnUser.avatar === "cat" ? "🐱" : "🌳"}
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{drawnUser.username}</p>
                        <p className="text-sm text-muted-foreground">
                          {drawnUser.tickets} tickets ({drawnUser.video_count} videos)
                        </p>
                      </div>
                    </div>

                    {/* Show their videos */}
                    {getUserCompletions(drawnUser.user_id).length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {getUserCompletions(drawnUser.user_id).map((c) => (
                          <div key={c.id} className="relative group">
                            <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground overflow-hidden">
                              {c.video_url ? (
                                <video src={c.video_url} className="h-full w-full object-cover" />
                              ) : (
                                "No vid"
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="default"
                              className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] h-5 px-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => confirmWinner(drawnUser.user_id, c.video_url ?? undefined)}
                            >
                              Pick
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button onClick={() => confirmWinner(drawnUser.user_id)} className="flex-1">
                        <UserCheck className="h-4 w-4 mr-2" />
                        Confirm as Winner
                      </Button>
                      <Button variant="outline" onClick={handleRandomDraw}>
                        Re-draw
                      </Button>
                    </div>
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
                            {t.avatar === "dragon" ? "🐉" :
                             t.avatar === "fox" ? "🦊" :
                             t.avatar === "owl" ? "🦉" :
                             t.avatar === "cat" ? "🐱" : "🌳"}
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
      </div>
    </div>
  );
}
