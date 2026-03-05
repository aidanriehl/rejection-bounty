import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type UploadStatus = "idle" | "uploading" | "done" | "error";

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
  startUpload: (file: File, meta: {
    challengeTitle: string;
    caption: string;
    trimStart: number;
    trimEnd: number;
    thumbnailTime: number;
  }) => void;
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

      setState((s) => ({ ...s, status: "done", progress: 100 }));
      toast({ title: "Video uploaded! 🎬" });

      // Auto-clear after a few seconds
      setTimeout(() => {
        setState(initialState);
        fileRef.current = null;
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

  const startUpload = useCallback((file: File, meta: {
    challengeTitle: string;
    caption: string;
    trimStart: number;
    trimEnd: number;
    thumbnailTime: number;
  }) => {
    fileRef.current = file;
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
  }, []);

  return (
    <UploadContext.Provider value={{ ...state, startUpload, retry, clearUpload }}>
      {children}
    </UploadContext.Provider>
  );
}
