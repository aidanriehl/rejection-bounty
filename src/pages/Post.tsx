import { useState, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, Upload, Film, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type UploadStatus = "idle" | "getting-url" | "uploading" | "processing" | "done" | "error";

export default function PostPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const challengeTitle = (location.state as any)?.challengeTitle || "Challenge";
  const [caption, setCaption] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoId, setVideoId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate: max 30s video, max 100MB
    if (file.size > 100 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 100MB", variant: "destructive" });
      return;
    }

    setVideoFile(file);
    setUploadStatus("idle");
    setVideoId(null);
  };

  const uploadVideo = useCallback(async () => {
    if (!videoFile) return;

    try {
      // Step 1: Get direct upload URL from our edge function
      setUploadStatus("getting-url");
      const { data, error } = await supabase.functions.invoke("upload-video", {
        body: { maxDurationSeconds: 30 },
      });

      if (error || !data?.uploadURL) {
        throw new Error(error?.message || "Failed to get upload URL");
      }

      const { uploadURL, videoId: vid } = data;
      setVideoId(vid);

      // Step 2: Upload directly to Cloudflare Stream
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

      // Upload complete — no need to wait for Cloudflare processing
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
    // TODO: save post to database with videoId + caption
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
    <div className="min-h-screen pb-24 pt-4">
      <div className="mx-auto max-w-lg px-4">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Post to Feed</h1>
          <button
            onClick={() => navigate("/challenges")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Challenge name */}
        <p className="mb-4 text-sm font-medium text-foreground">{challengeTitle}</p>

        {/* Video upload */}
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={isUploading}
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 py-10 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-50"
        >
          {videoFile ? (
            <>
              <Film className="h-5 w-5" />
              <span className="font-medium truncate max-w-[200px]">{videoFile.name}</span>
            </>
          ) : (
            <>
              <Upload className="h-5 w-5" />
              <span>Select video (max 30s)</span>
            </>
          )}
        </button>

        {/* Upload status */}
        {uploadStatus !== "idle" && (
          <div className="mb-4 flex items-center gap-2 text-sm">
            {isUploading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            {uploadStatus === "done" && <CheckCircle2 className="h-4 w-4 text-success" />}
            <span
              className={
                uploadStatus === "error"
                  ? "text-destructive"
                  : uploadStatus === "done"
                  ? "text-success"
                  : "text-muted-foreground"
              }
            >
              {statusLabel[uploadStatus]}
            </span>
          </div>
        )}

        {/* Upload progress bar */}
        {uploadStatus === "uploading" && (
          <div className="mb-4 h-4 w-full overflow-hidden rounded-full border-2 border-foreground/10 bg-muted shadow-[2px_2px_0px_0px_hsl(var(--foreground)/0.06)]">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        {/* Caption */}
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Add a caption (optional)"
          rows={2}
          className="mb-6 w-full resize-none rounded-xl border bg-muted/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />

        {/* Post button */}
        <button
          onClick={handlePost}
          disabled={isUploading}
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
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
