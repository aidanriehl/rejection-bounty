import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type UploadStatus = "idle" | "uploading" | "done" | "error";

interface UploadMeta {
  challengeTitle: string;
  challengeId: string;
  caption: string;
  trimStart: number;
  trimEnd: number;
  thumbnailTime: number;
}

interface UploadState {
  status: UploadStatus;
  progress: number;
  videoId: string | null;
  challengeTitle: string | null;
  caption: string | null;
  trimStart: number;
  trimEnd: number;
  thumbnailTime: number;
}

interface UploadContextValue extends UploadState {
  startUpload: (file: File, meta: UploadMeta) => void;
  retry: () => void;
  clearUpload: () => void;
}

const initialState: UploadState = {
  status: "idle",
  progress: 0,
  videoId: null,
  challengeTitle: null,
  caption: null,
  trimStart: 0,
  trimEnd: 0,
  thumbnailTime: 0,
};

const UploadContext = createContext<UploadContextValue | null>(null);

export function useUpload() {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error("useUpload must be used within UploadProvider");
  return ctx;
}

export function UploadProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UploadState>(initialState);
  const fileRef = useRef<File | null>(null);
  const metaRef = useRef<UploadMeta | null>(null);

  const doUpload = useCallback(async (file: File) => {
    try {
      setState((s) => ({ ...s, status: "uploading", progress: 0 }));

      const { data, error } = await supabase.functions.invoke("upload-video", {
        body: { maxDurationSeconds: 30 },
      });

      if (error || !data?.uploadURL) {
        throw new Error(error?.message || "Failed to get upload URL");
      }

      const { uploadURL, videoId } = data;
      setState((s) => ({ ...s, videoId }));

      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", uploadURL);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setState((s) => ({ ...s, progress: pct }));
        }
      };

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(formData);
      });

      // Insert post into database and mark challenge complete
      const meta = metaRef.current;
      if (meta) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Get current week key - MUST match format in UploadIndicator.tsx
          const now = new Date();
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          const weekNum = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
          const weekKey = `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;

          console.log("[Upload] Inserting post with video_id:", videoId);
          console.log("[Upload] Week key:", weekKey);
          console.log("[Upload] User ID:", session.user.id);
          console.log("[Upload] Challenge ID:", meta.challengeId);

          // Insert post with all required fields
          const { data: postData, error: insertError } = await supabase.from("posts").insert({
            user_id: session.user.id,
            challenge_id: meta.challengeId,
            video_id: videoId,
            thumbnail_time: meta.thumbnailTime,
            trim_start: meta.trimStart,
            trim_end: meta.trimEnd,
            caption: meta.caption || "",
            likes: 0,
          } as any).select().single();

          if (insertError) {
            console.error("[Upload] Failed to insert post:", insertError);
            throw new Error("Failed to save post to feed: " + insertError.message);
          }

          console.log("[Upload] Post inserted successfully:", postData?.id);

          // Mark challenge as complete in challenge_completions - WITH ERROR HANDLING
          const { data: completionData, error: completionError } = await supabase
            .from("challenge_completions")
            .upsert({
              user_id: session.user.id,
              challenge_id: meta.challengeId,
              week_key: weekKey,
              video_url: videoId ? `https://customer-f77ppcboel.cloudflarestream.com/${videoId}/watch` : null,
            } as any, { onConflict: "user_id,challenge_id,week_key" })
            .select();

          if (completionError) {
            console.error("[Upload] Failed to insert challenge completion:", completionError);
            // Don't throw - post was saved, completion is secondary
          } else {
            console.log("[Upload] Challenge completion saved:", completionData);
          }

          // Dispatch event so Challenges page can trigger confetti
          window.dispatchEvent(new CustomEvent("challenge-completed", {
            detail: { challengeId: meta.challengeId }
          }));
        } else {
          throw new Error("Not authenticated - please log in again");
        }
      }

      setState((s) => ({ ...s, status: "done", progress: 100 }));
      // No toast - the UploadIndicator banner already shows success

      // Auto-clear after a few seconds
      setTimeout(() => {
        setState(initialState);
        fileRef.current = null;
        metaRef.current = null;
      }, 3000);
    } catch (err: any) {
      console.error("Upload error:", err);
      setState((s) => ({ ...s, status: "error" }));
      toast({
        title: "Upload failed",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    }
  }, []);

  const startUpload = useCallback((file: File, meta: UploadMeta) => {
    fileRef.current = file;
    metaRef.current = meta;
    setState({
      status: "uploading",
      progress: 0,
      videoId: null,
      challengeTitle: meta.challengeTitle,
      caption: meta.caption,
      trimStart: meta.trimStart,
      trimEnd: meta.trimEnd,
      thumbnailTime: meta.thumbnailTime,
    });
    doUpload(file);
  }, [doUpload]);

  const retry = useCallback(() => {
    if (fileRef.current) {
      doUpload(fileRef.current);
    }
  }, [doUpload]);

  const clearUpload = useCallback(() => {
    setState(initialState);
    fileRef.current = null;
    metaRef.current = null;
  }, []);

  return (
    <UploadContext.Provider value={{ ...state, startUpload, retry, clearUpload }}>
      {children}
    </UploadContext.Provider>
  );
}
