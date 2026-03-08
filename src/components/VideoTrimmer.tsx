import { useState, useRef, useEffect, useCallback, memo } from "react";
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

function VideoTrimmer({
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
  const playheadRef = useRef<HTMLDivElement>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [dragging, setDragging] = useState<"left" | "right" | "playhead" | null>(null);
  const dragStartRef = useRef({ x: 0, trimStart: 0, trimEnd: 0 });

  // Use ref for playhead position during drag to avoid re-renders
  const playheadTimeRef = useRef(currentTime);
  const rafRef = useRef<number | null>(null);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

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

  // Direct DOM update for playhead position (no React re-render)
  const updatePlayheadVisual = useCallback((time: number) => {
    if (!playheadRef.current || !duration) return;
    const w = getContainerWidth() - HANDLE_WIDTH * 2;
    const clampedTime = Math.max(trimStart, Math.min(trimEnd, time));
    const x = HANDLE_WIDTH + (clampedTime / duration) * w;
    playheadRef.current.style.left = `${x - 20}px`;
  }, [duration, trimStart, trimEnd, getContainerWidth]);

  // Sync playhead ref with currentTime when not dragging
  useEffect(() => {
    if (!dragging) {
      playheadTimeRef.current = currentTime;
      // Update playhead position via DOM for smooth non-dragging updates
      updatePlayheadVisual(currentTime);
    }
  }, [currentTime, dragging, updatePlayheadVisual]);

  // Throttle video seeking - 100ms for smoother scrubbing
  const lastSeekRef = useRef(0);
  const throttledVideoSeek = useCallback((time: number) => {
    const now = Date.now();
    if (now - lastSeekRef.current > 100) {
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
      playheadTimeRef.current = clampedStart;
      // Use RAF for smooth visual update
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        updatePlayheadVisual(clampedStart);
      });
      throttledVideoSeek(clampedStart);
    } else if (dragging === "right") {
      const newEnd = Math.max(time, trimStart + minDuration);
      const clampedEnd = Math.min(duration, newEnd);
      onTrimChange(trimStart, clampedEnd);
      playheadTimeRef.current = clampedEnd;
      // Use RAF for smooth visual update
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        updatePlayheadVisual(clampedEnd);
      });
      throttledVideoSeek(clampedEnd);
    } else if (dragging === "playhead") {
      const clampedTime = Math.max(trimStart, Math.min(trimEnd, time));
      playheadTimeRef.current = clampedTime;
      // Use RAF for smooth 60fps visual update - no state update!
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        updatePlayheadVisual(clampedTime);
      });
      throttledVideoSeek(clampedTime);
    }
  }, [dragging, trimStart, trimEnd, duration, xToTime, onTrimChange, throttledVideoSeek, updatePlayheadVisual]);

  const handlePointerUp = useCallback(() => {
    // Cancel any pending RAF
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    // Final seek to exact position when drag ends
    if (dragging) {
      onScrub(playheadTimeRef.current);
    }
    setDragging(null);
  }, [dragging, onScrub]);

  const leftX = timeToX(trimStart);
  const rightX = timeToX(trimEnd);
  // Initial playhead position (will be updated via ref during drag)
  const initialPlayheadX = timeToX(Math.max(trimStart, Math.min(trimEnd, currentTime)));
  const thumbnailX = timeToX(Math.max(trimStart, Math.min(trimEnd, thumbnailTime)));

  return (
    <div className="rounded-lg bg-amber-400 p-[2px]">
      <div
        ref={containerRef}
        className="relative h-12 select-none"
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
        {/* Uses ref for direct DOM updates during drag for smooth 60fps movement */}
        <div
          ref={playheadRef}
          className="absolute inset-y-0 z-20 flex cursor-col-resize items-center justify-center touch-none"
          style={{
            left: initialPlayheadX - 20,
            width: 40,
            willChange: dragging === "playhead" ? "left" : "auto",
          }}
          onPointerDown={(e) => handlePointerDown("playhead", e)}
        >
          <div className="h-full w-[3px] rounded-full bg-white shadow-[0_0_4px_rgba(0,0,0,0.5)]" />
        </div>
      </div>

      {/* Cover button only (timestamps removed) */}
      {onSetCover && (
        <div className="mt-1 flex justify-center px-2">
          <button
            onClick={onSetCover}
            className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary active:bg-primary/20"
          >
            <Image className="h-3 w-3" />
            Set Cover
          </button>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(Math.abs(seconds) / 60);
  const s = Math.floor(Math.abs(seconds) % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Memoize to prevent re-renders when parent state changes during scrubbing
export default memo(VideoTrimmer);
