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

      // Track if we've received any progress events
      let receivedProgress = false;
      let simulatedProgress = 0;

      // Simulate progress if real events don't fire (CORS issue with some upload endpoints)
      const progressInterval = setInterval(() => {
        if (!receivedProgress && simulatedProgress < 90) {
          simulatedProgress += Math.random() * 15 + 5;
          simulatedProgress = Math.min(simulatedProgress, 90);
          setState((s) => ({ ...s, progress: Math.round(simulatedProgress) }));
        }
      }, 500);

      xhr.upload.onprogress = (e) => {
        console.log("[Upload] Progress event:", e.loaded, "/", e.total, "computable:", e.lengthComputable);
        if (e.lengthComputable) {
          receivedProgress = true;
          clearInterval(progressInterval);
          const pct = Math.round((e.loaded / e.total) * 100);
          setState((s) => ({ ...s, progress: pct }));
        }
      };

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          clearInterval(progressInterval);
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed (${xhr.status})`));
        };
        xhr.onerror = () => {
          clearInterval(progressInterval);
          reject(new Error("Upload failed"));
        };
        xhr.send(formData);
      });

      // Insert post into database and mark challenge complete
      const meta = metaRef.current;
      if (meta) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Get current week key - MUST match format in UploadIndicator.tsx and mock-data.ts
          const now = new Date();
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          const weekNum = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
          const weekKey = `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;

          console.log("[Upload] Inserting post with video_id:", videoId);
          console.log("[Upload] Week key:", weekKey);
          console.log("[Upload] User ID:", session.user.id);
          console.log("[Upload] Challenge ID:", meta.challengeId);

          // Insert post
          const { data: postData, error: insertError } = await supabase.from("posts").insert({
            user_id: session.user.id,
            challenge_id: meta.challengeId,
            video_id: videoId,
            thumbnail_time: meta.thumbnailTime,
            trim_start: meta.trimStart,
            trim_end: meta.trimEnd,
            caption: meta.caption || "",
            likes: 0,
          }).select().single();

          if (insertError) {
            console.error("[Upload] Failed to insert post:", insertError);
            throw new Error("Failed to save post to feed: " + insertError.message);
          }

          console.log("[Upload] Post inserted successfully:", postData?.id);

          // Mark challenge as complete in challenge_completions
          // Use insert with explicit conflict handling
          const completionPayload = {
            user_id: session.user.id,
            challenge_id: meta.challengeId,
            week_key: weekKey,
            video_url: videoId ? `https://customer-f77ppcboel.cloudflarestream.com/${videoId}/watch` : null,
          };

          console.log("[Upload] Inserting completion:", JSON.stringify(completionPayload));

          // First try insert, if duplicate then it's already recorded
          const { data: completionData, error: completionError } = await supabase
            .from("challenge_completions")
            .insert(completionPayload)
            .select();

          if (completionError) {
            // If it's a unique constraint violation, the completion already exists — that's fine
            if (completionError.code === '23505') {
              console.log("[Upload] Completion already exists for this challenge/week, skipping");
            } else {
              console.error("[Upload] Failed to insert challenge completion:", completionError.message, completionError.code, completionError.details);
            }
          } else {
            console.log("[Upload] Challenge completion saved:", completionData);
          }

          // Verify count
          const { count, error: countError } = await supabase
            .from("challenge_completions")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.user.id)
            .eq("week_key", weekKey);

          console.log("[Upload] Verified completion count for week:", weekKey, "count:", count, "error:", countError);

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
