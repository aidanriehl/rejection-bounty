import { useState, useRef, useEffect, useCallback } from "react";
import { Image } from "lucide-react";

interface VideoTrimmerProps {
  videoUrl: string;
  duration: number;
  trimStart: number;
  trimEnd: number;
  onTrimChange: (start: number, end: number) => void;
  onScrub: (time: number) => void;
  currentTime?: number;
  isPlaying?: boolean;
  thumbnailTime?: number;
  onSetCover?: () => void;
}

const HANDLE_WIDTH = 16;
const FILMSTRIP_FRAMES = 10;

export default function VideoTrimmer({
  videoUrl,
  duration,
  trimStart,
  trimEnd,
  onTrimChange,
  onScrub,
  currentTime = 0,
  isPlaying = false,
  thumbnailTime = 0,
  onSetCover,
}: VideoTrimmerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const [frames, setFrames] = useState<string[]>([]);
  const [dragging, setDragging] = useState<"left" | "right" | "playhead" | null>(null);
  const [localPlayheadTime, setLocalPlayheadTime] = useState(currentTime);
  const dragStartRef = useRef({ x: 0, trimStart: 0, trimEnd: 0 });

  // Extract filmstrip frames
  useEffect(() => {
    if (!videoUrl || !duration) return;

    const video = document.createElement("video");
    video.src = videoUrl;
    // Don't set crossOrigin for blob URLs (local files)
    if (!videoUrl.startsWith("blob:")) {
      video.crossOrigin = "anonymous";
    }
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    const extractedFrames: string[] = [];

    video.addEventListener("loadeddata", () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      canvas.width = 80;
      canvas.height = 80;

      let frameIndex = 0;

      const captureFrame = () => {
        if (frameIndex >= FILMSTRIP_FRAMES) {
          setFrames(extractedFrames);
          video.remove();
          return;
        }

        const time = (frameIndex / FILMSTRIP_FRAMES) * duration;
        video.currentTime = time;
      };

      video.addEventListener("seeked", () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        extractedFrames.push(canvas.toDataURL("image/jpeg", 0.5));
        frameIndex++;
        captureFrame();
      });

      captureFrame();
    });
  }, [videoUrl, duration]);

  const getContainerWidth = useCallback(() => {
    return containerRef.current?.offsetWidth ?? 300;
  }, []);

  const timeToX = useCallback((time: number) => {
    const w = getContainerWidth() - HANDLE_WIDTH * 2;
    return HANDLE_WIDTH + (time / duration) * w;
  }, [duration, getContainerWidth]);

  const xToTime = useCallback((x: number) => {
    const w = getContainerWidth() - HANDLE_WIDTH * 2;
    const t = ((x - HANDLE_WIDTH) / w) * duration;
    return Math.max(0, Math.min(duration, t));
  }, [duration, getContainerWidth]);

  // Sync localPlayheadTime with currentTime when not dragging
  useEffect(() => {
    if (!dragging) {
      setLocalPlayheadTime(currentTime);
    }
  }, [currentTime, dragging]);

  // Throttle video seeking only - visual updates are immediate
  const lastSeekRef = useRef(0);
  const throttledVideoSeek = useCallback((time: number) => {
    const now = Date.now();
    if (now - lastSeekRef.current > 50) {
      lastSeekRef.current = now;
      onScrub(time);
    }
  }, [onScrub]);

  const handlePointerDown = useCallback((type: "left" | "right" | "playhead", e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(type);
    dragStartRef.current = { x: e.clientX, trimStart, trimEnd };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [trimStart, trimEnd]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    e.preventDefault();

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const time = xToTime(x);
    const minDuration = 1;

    if (dragging === "left") {
      const newStart = Math.min(time, trimEnd - minDuration);
      const clampedStart = Math.max(0, newStart);
      onTrimChange(clampedStart, trimEnd);
      setLocalPlayheadTime(clampedStart);
      throttledVideoSeek(clampedStart);
    } else if (dragging === "right") {
      const newEnd = Math.max(time, trimStart + minDuration);
      const clampedEnd = Math.min(duration, newEnd);
      onTrimChange(trimStart, clampedEnd);
      setLocalPlayheadTime(clampedEnd);
      throttledVideoSeek(clampedEnd);
    } else if (dragging === "playhead") {
      const clampedTime = Math.max(trimStart, Math.min(trimEnd, time));
      setLocalPlayheadTime(clampedTime); // Immediate visual update
      throttledVideoSeek(clampedTime); // Throttled video seek
    }
  }, [dragging, trimStart, trimEnd, duration, xToTime, onTrimChange, throttledVideoSeek]);

  const handlePointerUp = useCallback(() => {
    // Final seek to exact position when drag ends
    if (dragging === "playhead") {
      onScrub(localPlayheadTime);
    }
    setDragging(null);
  }, [dragging, localPlayheadTime, onScrub]);

  const leftX = timeToX(trimStart);
  const rightX = timeToX(trimEnd);
  // Use localPlayheadTime for smooth dragging visuals
  const displayTime = dragging === "playhead" ? localPlayheadTime : currentTime;
  const playheadX = timeToX(Math.max(trimStart, Math.min(trimEnd, displayTime)));
  const thumbnailX = timeToX(Math.max(trimStart, Math.min(trimEnd, thumbnailTime)));

  return (
    <div className="mt-2 rounded-xl bg-muted/30 px-2 py-2.5">
      <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">Trim video</p>

      <div
        ref={containerRef}
        className="relative h-16 select-none"
        style={{ touchAction: dragging ? "none" : "pan-y" }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Filmstrip background */}
        <div className="absolute inset-0 flex overflow-hidden rounded-lg">
          {frames.length > 0
            ? frames.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="h-full flex-1 object-cover"
                  draggable={false}
                />
              ))
            : Array.from({ length: FILMSTRIP_FRAMES }).map((_, i) => (
                <div key={i} className="h-full flex-1 bg-muted-foreground/10" />
              ))}
        </div>

        {/* Dimmed regions outside trim */}
        <div
          className="absolute inset-y-0 left-0 rounded-l-lg bg-background/70"
          style={{ width: leftX }}
        />
        <div
          className="absolute inset-y-0 right-0 rounded-r-lg bg-background/70"
          style={{ width: getContainerWidth() - rightX }}
        />

        {/* Selected region border (top + bottom yellow lines) */}
        <div
          className="absolute top-0 h-[3px] bg-amber-400"
          style={{ left: leftX, width: rightX - leftX }}
        />
        <div
          className="absolute bottom-0 h-[3px] bg-amber-400"
          style={{ left: leftX, width: rightX - leftX }}
        />

        {/* Left handle */}
        <div
          className="absolute inset-y-0 z-10 flex cursor-col-resize items-center justify-center rounded-l-lg bg-amber-400 touch-none"
          style={{ left: leftX - HANDLE_WIDTH, width: HANDLE_WIDTH }}
          onPointerDown={(e) => handlePointerDown("left", e)}
        >
          <div className="h-6 w-0.5 rounded-full bg-amber-900/50" />
        </div>

        {/* Right handle */}
        <div
          className="absolute inset-y-0 z-10 flex cursor-col-resize items-center justify-center rounded-r-lg bg-amber-400 touch-none"
          style={{ left: rightX, width: HANDLE_WIDTH }}
          onPointerDown={(e) => handlePointerDown("right", e)}
        >
          <div className="h-6 w-0.5 rounded-full bg-amber-900/50" />
        </div>

        {/* Thumbnail marker - small camera icon indicator */}
        {thumbnailTime > 0 && (
          <div
            className="absolute top-0 z-15 pointer-events-none"
            style={{ left: thumbnailX - 6 }}
          >
            <div className="flex h-4 w-3 items-center justify-center rounded-b bg-primary">
              <div className="h-1.5 w-1.5 rounded-full bg-white" />
            </div>
          </div>
        )}

        {/* Playhead - wide touch target, thin visual line */}
        <div
          className="absolute inset-y-0 z-20 flex cursor-col-resize items-center justify-center touch-none"
          style={{ left: playheadX - 20, width: 40 }}
          onPointerDown={(e) => handlePointerDown("playhead", e)}
        >
          <div className="h-full w-[3px] rounded-full bg-white shadow-[0_0_4px_rgba(0,0,0,0.5)]" />
        </div>
      </div>

      {/* Time labels and cover button */}
      <div className="mt-1 flex items-center justify-between px-2">
        <span className="text-[10px] text-muted-foreground">{formatTime(trimStart)}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-foreground">{formatTime(trimEnd - trimStart)}</span>
          {onSetCover && (
            <button
              onClick={onSetCover}
              className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary active:bg-primary/20"
            >
              <Image className="h-3 w-3" />
              Set Cover
            </button>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground">{formatTime(trimEnd)}</span>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(Math.abs(seconds) / 60);
  const s = Math.floor(Math.abs(seconds) % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
