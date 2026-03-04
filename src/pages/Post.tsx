import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, Upload, Film, Loader2, CheckCircle2, Play, Pause } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";

type UploadStatus = "idle" | "getting-url" | "uploading" | "processing" | "done" | "error";

export default function PostPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const challengeTitle = (location.state as any)?.challengeTitle || "Challenge";

  const [caption, setCaption] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [thumbnailTime, setThumbnailTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 100MB", variant: "destructive" });
      return;
    }

    // Revoke old URL
    if (videoUrl) URL.revokeObjectURL(videoUrl);

    const url = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoUrl(url);
    setUploadStatus("idle");
    setVideoId(null);
    setThumbnailTime(0);
    setIsPlaying(false);
  };

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      videoRef.current.currentTime = 0;
    }
  };

  const handleSliderChange = (value: number[]) => {
    const time = value[0];
    setThumbnailTime(time);
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
      videoRef.current.currentTime = time;
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const uploadVideo = useCallback(async () => {
    if (!videoFile) return;

    try {
      setUploadStatus("getting-url");
      const { data, error } = await supabase.functions.invoke("upload-video", {
        body: { maxDurationSeconds: 30 },
      });

      if (error || !data?.uploadURL) {
        throw new Error(error?.message || "Failed to get upload URL");
      }

      const { uploadURL, videoId: vid } = data;
      setVideoId(vid);

      setUploadStatus("uploading");
      const formData = new FormData();
      formData.append("file", videoFile);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", uploadURL);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed with status ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(formData);
      });

      setUploadStatus("done");
      toast({ title: "Video uploaded! 🎬" });
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadStatus("error");
      toast({
        title: "Upload failed",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    }
  }, [videoFile]);

  const handlePost = async () => {
    if (videoFile && uploadStatus === "idle") {
      await uploadVideo();
    }
    // TODO: save post to database with videoId + caption + thumbnailTime
    toast({ title: "Posted to feed!" });
    navigate("/challenges");
  };

  const statusLabel: Record<UploadStatus, string> = {
    idle: "",
    "getting-url": "Preparing upload…",
    uploading: `Uploading… ${uploadProgress}%`,
    processing: "Processing video…",
    done: "Ready!",
    error: "Upload failed",
  };

  const isUploading = ["getting-url", "uploading", "processing"].includes(uploadStatus);

  return (
    <div className="fixed inset-0 bottom-[72px] flex flex-col pt-4">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-hidden px-4">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Post to Feed</h1>
          <button
            onClick={() => navigate("/challenges")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Challenge name */}
        <p className="mb-3 text-sm font-medium text-foreground">{challengeTitle}</p>

        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Video area — constrained height */}
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
                disabled={isUploading}
                className="absolute right-2 top-2 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/70 disabled:opacity-50"
              >
                Change
              </button>
            </div>

            {duration > 0 && (
              <div className="mt-2 rounded-xl bg-muted/30 px-4 py-2.5">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Choose your cover frame</p>
                <Slider
                  value={[thumbnailTime]}
                  onValueChange={handleSliderChange}
                  max={duration}
                  step={0.1}
                  className="w-full"
                />
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>0:00</span>
                  <span>{Math.floor(thumbnailTime)}:{String(Math.round((thumbnailTime % 1) * 10)).padStart(1, "0")}s</span>
                  <span>0:{String(Math.floor(duration)).padStart(2, "0")}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload status */}
        {uploadStatus !== "idle" && (
          <div className="mb-2 flex items-center gap-2 text-sm">
            {isUploading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            {uploadStatus === "done" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            <span className={uploadStatus === "error" ? "text-destructive" : uploadStatus === "done" ? "text-green-500" : "text-muted-foreground"}>
              {statusLabel[uploadStatus]}
            </span>
          </div>
        )}

        {uploadStatus === "uploading" && (
          <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
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
          disabled={isUploading || !videoFile}
          className="w-full shrink-0 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isUploading ? "Uploading…" : "Post to Feed"}
        </button>

        {/* Skip */}
        <button
          onClick={() => navigate("/challenges")}
          className="mt-2 w-full py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
