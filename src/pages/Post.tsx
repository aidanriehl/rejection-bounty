import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, Upload, Loader2, CheckCircle2, Play, Pause } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { useUpload } from "@/contexts/UploadContext";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function PostPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const challengeTitle = (location.state as any)?.challengeTitle || "Challenge";
  const { startUpload, status: globalStatus } = useUpload();

  const [caption, setCaption] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [thumbnailTime, setThumbnailTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  // Enforce trim bounds during playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isPlaying) return;
    const onTimeUpdate = () => {
      if (video.currentTime >= trimEnd) {
        video.pause();
        setIsPlaying(false);
        video.currentTime = trimEnd;
      }
    };
    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [isPlaying, trimEnd]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 100MB", variant: "destructive" });
      return;
    }

    if (videoUrl) URL.revokeObjectURL(videoUrl);

    const url = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoUrl(url);
    setThumbnailTime(0);
    setTrimStart(0);
    setTrimEnd(0);
    setIsPlaying(false);
  };

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      setTrimEnd(dur);
      setThumbnailTime(0);
      videoRef.current.currentTime = 0;
    }
  };

  const handleTrimChange = (value: number[]) => {
    const [start, end] = value;
    setTrimStart(start);
    setTrimEnd(end);
    if (thumbnailTime < start) setThumbnailTime(start);
    if (thumbnailTime > end) setThumbnailTime(end);
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
      videoRef.current.currentTime = start;
    }
  };

  const handleCoverDrag = (value: number[]) => {
    const time = value[0];
    setThumbnailTime(time);
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
      if ((videoRef.current as any).fastSeek) {
        (videoRef.current as any).fastSeek(time);
      } else {
        videoRef.current.currentTime = time;
      }
    }
  };

  const handleCoverCommit = (value: number[]) => {
    const time = value[0];
    setThumbnailTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      if (videoRef.current.currentTime < trimStart || videoRef.current.currentTime >= trimEnd) {
        videoRef.current.currentTime = trimStart;
      }
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handlePost = () => {
    if (!videoFile) return;

    // Start background upload via context and navigate away immediately
    startUpload(videoFile, {
      challengeTitle,
      caption,
      trimStart,
      trimEnd,
      thumbnailTime,
    });

    toast({ title: "Posting to feed…" });
    navigate("/challenges");
  };

  return (
    <div className="fixed inset-0 bottom-[72px] flex flex-col pt-6">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-y-auto px-4 pb-4">
        {/* Header */}
        <div className="mb-0 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Post to Feed</h1>
          <button
            onClick={() => navigate("/challenges")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Challenge name */}
        <p className="mb-5 text-sm font-medium text-foreground">{challengeTitle}</p>

        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Video area */}
        {!videoUrl ? (
          <button
            onClick={() => fileRef.current?.click()}
            className="group mb-3 flex aspect-[9/13] w-2/3 mx-auto flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-muted/20 transition-all hover:border-primary/40 hover:bg-muted/30"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <Upload className="h-6 w-6" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">Tap to add your video</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Max 30 seconds · 100MB</p>
            </div>
          </button>
        ) : (
          <div className="mb-3 w-2/3 mx-auto">
            <div className="relative overflow-hidden rounded-2xl bg-black">
              <div className="aspect-[9/13] w-full">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="h-full w-full object-contain"
                  onLoadedMetadata={handleVideoLoaded}
                  onEnded={() => setIsPlaying(false)}
                  playsInline
                  muted
                />
              </div>

              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/10 transition-opacity hover:bg-black/20"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm">
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
                </div>
              </button>

              <button
                onClick={() => fileRef.current?.click()}
                className="absolute right-2 top-2 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/70"
              >
                Change
              </button>
            </div>

            {duration > 0 && (
              <>
                {/* Trim slider */}
                <div className="mt-2 rounded-xl bg-muted/30 px-4 py-2.5">
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Trim video</p>
                  <Slider
                    value={[trimStart, trimEnd]}
                    onValueChange={handleTrimChange}
                    min={0}
                    max={duration}
                    step={0.1}
                    minStepsBetweenThumbs={5}
                    className="w-full"
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                    <span>{formatTime(trimStart)}</span>
                    <span>{formatTime(trimEnd)}</span>
                  </div>
                </div>

                {/* Cover frame slider */}
                <div className="mt-2 rounded-xl bg-muted/30 px-4 py-2.5">
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Choose your cover frame</p>
                  <Slider
                    value={[thumbnailTime]}
                    onValueChange={handleCoverDrag}
                    onValueCommit={handleCoverCommit}
                    min={trimStart}
                    max={trimEnd}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                    <span>{formatTime(trimStart)}</span>
                    <span>{formatTime(thumbnailTime)}</span>
                    <span>{formatTime(trimEnd)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Caption */}
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Add a caption (optional)"
          rows={2}
          className="mb-3 w-full resize-none rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />

        {/* Post button */}
        <button
          onClick={handlePost}
          disabled={!videoFile || globalStatus === "uploading"}
          className="w-full shrink-0 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          Post to Feed
        </button>
      </div>
    </div>
  );
}
