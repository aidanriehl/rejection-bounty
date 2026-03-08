import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, Upload, ChevronLeft, Check, Play, Pause } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { useUpload } from "@/contexts/UploadContext";
import VideoTrimmer from "@/components/VideoTrimmer";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

type Step = "trim" | "post";

export default function PostPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const challengeTitle = (location.state as any)?.challengeTitle || "Challenge";
  const challengeId = (location.state as any)?.challengeId || "";
  const { startUpload, status: globalStatus } = useUpload();

  const [step, setStep] = useState<Step>("trim");
  const [caption, setCaption] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [thumbnailFrames, setThumbnailFrames] = useState<string[]>([]);
  const [coverSliderValue, setCoverSliderValue] = useState(0);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const captionRef = useRef<HTMLTextAreaElement>(null);

  // Pick up file from Challenges page if coming from Photo Library
  useEffect(() => {
    const pendingFile = (window as any).__pendingVideoFile as File | undefined;
    if (pendingFile && (location.state as any)?.fromLibrary) {
      delete (window as any).__pendingVideoFile;
      const url = URL.createObjectURL(pendingFile);
      setVideoFile(pendingFile);
      setVideoUrl(url);
      setStep("trim");
    }
  }, []);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  // Track currentTime for playhead and play state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => {
      setCurrentTime(video.currentTime);
      if (video.currentTime >= trimEnd && trimEnd > 0) {
        video.currentTime = trimStart;
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [trimEnd, trimStart]);

  // Extract thumbnail frames when entering post step
  useEffect(() => {
    if (step !== "post" || !videoUrl || !duration || thumbnailFrames.length > 0) return;

    const trimDuration = trimEnd - trimStart;
    if (trimDuration <= 0) return;

    setLoadingThumbnails(true);

    const video = document.createElement("video");
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    const frames: string[] = [];
    const frameCount = 8;
    let frameIndex = 0;
    let cleanup = false;

    const finish = () => {
      if (cleanup) return;
      setThumbnailFrames(frames);
      setLoadingThumbnails(false);
      video.remove();
    };

    video.addEventListener("loadeddata", () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        finish();
        return;
      }
      canvas.width = 120;
      canvas.height = 160;

      const captureFrame = () => {
        if (cleanup) return;
        if (frameIndex >= frameCount) {
          finish();
          return;
        }

        const time = trimStart + (frameIndex / Math.max(1, frameCount - 1)) * trimDuration;
        video.currentTime = time;
      };

      video.addEventListener("seeked", () => {
        if (cleanup) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL("image/jpeg", 0.7));
        frameIndex++;
        captureFrame();
      });

      captureFrame();
    });

    video.addEventListener("error", finish);

    return () => {
      cleanup = true;
      video.remove();
    };
  }, [step, videoUrl, duration, trimStart, trimEnd, thumbnailFrames.length]);

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
    setTrimStart(0);
    setTrimEnd(0);
    setCurrentTime(0);
    setStep("trim");
  };

  const handleVideoLoaded = () => {
    const video = videoRef.current;
    if (video) {
      const dur = video.duration;
      setDuration(dur);
      setTrimEnd(Math.min(dur, 30));
      video.muted = false;
      video.play();
    }
  };

  const handleTrimChange = (start: number, end: number) => {
    setTrimStart(start);
    setTrimEnd(end);
  };

  const handleScrub = (time: number) => {
    if (videoRef.current) {
      if ((videoRef.current as any).fastSeek) {
        (videoRef.current as any).fastSeek(time);
      } else {
        videoRef.current.currentTime = time;
      }
      setCurrentTime(time);
    }
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  const handleTrimDone = () => {
    setThumbnailFrames([]);
    setCoverSliderValue(0);
    setStep("post");
  };

  const handleBack = () => {
    if (step === "post") {
      setStep("trim");
    } else {
      navigate("/challenges");
    }
  };

  const handlePost = () => {
    if (!videoFile) return;
    const trimDuration = trimEnd - trimStart;
    const thumbTime = trimStart + (coverSliderValue / 100) * trimDuration;
    // Get the selected thumbnail frame
    const thumbIndex = Math.round((coverSliderValue / 100) * Math.max(0, thumbnailFrames.length - 1));
    const selectedThumb = thumbnailFrames[thumbIndex] || thumbnailFrames[0] || null;
    startUpload(videoFile, {
      challengeTitle,
      challengeId,
      caption,
      trimStart,
      trimEnd,
      thumbnailTime: thumbTime,
      thumbnailDataUrl: selectedThumb,
    });
    navigate("/challenges");
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Safe area top fill */}
      <div className="bg-background" style={{ paddingTop: "env(safe-area-inset-top)" }} />

      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <AnimatePresence mode="wait">
        {/* STEP 1: Trim Video */}
        {step === "trim" && videoUrl && (
          <motion.div
            key="trim"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-1 flex-col overflow-hidden"
          >
            {/* Section A: Header */}
            <div className="flex items-center justify-between px-4 py-3 mt-3">
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-sm font-medium text-muted-foreground"
              >
                <ChevronLeft className="h-5 w-5" />
                Back
              </button>
              <h1 className="text-lg font-bold text-foreground">Trim</h1>
              <button
                onClick={handleTrimDone}
                className="flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground"
              >
                Next
              </button>
            </div>

            {/* Section B: Video + Trimmer */}
            <div className="flex-1 flex flex-col items-center px-4 mt-[7px] min-h-0 pb-2">
              <div className="w-full flex flex-col min-h-0 flex-1 items-center">
                {/* Video preview - fixed 9:16 aspect ratio, sized to fit */}
                <div
                  className="relative overflow-hidden rounded-2xl bg-black"
                  style={{ aspectRatio: '9/16', maxHeight: 'calc(100vh - 260px)', width: 'auto' }}
                >
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className="h-full w-full object-cover"
                    onLoadedData={handleVideoLoaded}
                    playsInline
                    autoPlay
                    muted
                    loop
                    preload="auto"
                    controls={false}
                  />
                </div>

                {/* Trim controls with play button - same width as video */}
                {duration > 0 && (
                  <div className="mt-1 shrink-0 flex items-center gap-2" style={{ width: '100%', maxWidth: 'calc((100vh - 260px) * 9 / 16)' }}>
                    <button
                      onClick={togglePlayPause}
                      className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-amber-400"
                    >
                      {isPlaying ? (
                        <Pause className="h-5 w-5 text-amber-900" fill="currentColor" />
                      ) : (
                        <Play className="h-5 w-5 text-amber-900" fill="currentColor" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <VideoTrimmer
                        videoUrl={videoUrl}
                        duration={duration}
                        trimStart={trimStart}
                        trimEnd={trimEnd}
                        onTrimChange={handleTrimChange}
                        onScrub={handleScrub}
                        currentTime={currentTime}
                        isPlaying={isPlaying}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 3: Choose Thumbnail & Post */}
        {step === "post" && videoUrl && (
          <motion.div
            key="post"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-1 flex-col"
          >
            {/* Section A: Header */}
            <div className="flex items-center justify-between px-4 py-3 mt-2.5">
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-sm font-medium text-muted-foreground"
              >
                <ChevronLeft className="h-5 w-5" />
                Back
              </button>
              <h1 className="text-lg font-bold text-foreground">New Post</h1>
              <div className="w-16" /> {/* Spacer for centering */}
            </div>

            {/* Section B: Content */}
            <div data-scroll-container className="flex-1 overflow-y-auto px-4 pb-6 mt-[15px]">
              <p className="mb-4 text-sm font-medium text-muted-foreground text-center">{challengeTitle}</p>

              {/* Thumbnail preview */}
              <div className="mb-4 flex justify-center">
                <div className="w-32 overflow-hidden rounded-xl bg-muted">
                  <div className="aspect-[9/16] w-full flex items-center justify-center">
                    {loadingThumbnails ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : thumbnailFrames.length > 0 ? (
                      <img
                        src={thumbnailFrames[Math.round((coverSliderValue / 100) * Math.max(0, thumbnailFrames.length - 1))] || thumbnailFrames[0]}
                        alt="Thumbnail"
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Cover slider */}
              <div className="mb-5">
                <p className="mb-2 text-xs font-medium text-muted-foreground text-center">Choose cover</p>
                {/* Filmstrip behind slider */}
                <div className="relative mx-auto max-w-xs">
                  <div className="flex h-8 overflow-hidden rounded-lg">
                    {loadingThumbnails ? (
                      <div className="h-full w-full bg-muted animate-pulse" />
                    ) : (
                      thumbnailFrames.map((frame, i) => (
                        <img key={i} src={frame} alt="" className="h-full flex-1 object-cover" draggable={false} />
                      ))
                    )}
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={coverSliderValue}
                    onChange={(e) => setCoverSliderValue(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {/* Slider indicator line */}
                  <div
                    className="absolute top-0 bottom-0 w-[3px] bg-white rounded-full shadow-[0_0_4px_rgba(0,0,0,0.5)] pointer-events-none"
                    style={{ left: `${coverSliderValue}%`, transform: 'translateX(-50%)' }}
                  />
                </div>
              </div>

              {/* Caption */}
              <textarea
                ref={captionRef}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption (optional)"
                rows={3}
                className="mb-4 w-full resize-none rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />

              {/* Post button */}
              <button
                onClick={handlePost}
                disabled={!videoFile || globalStatus === "uploading"}
                className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                Post to Feed
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
