import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { X, SwitchCamera, Circle, Square, Timer } from "lucide-react";

interface CameraRecorderProps {
  onRecorded: (file: File) => void;
  onClose: () => void;
  challengeTitle: string;
}

const MAX_DURATION = 30; // seconds

export default function CameraRecorder({ onRecorded, onClose, challengeTitle }: CameraRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);

  const startCamera = useCallback(async (facing: "user" | "environment") => {
    // Stop any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
    } catch (err) {
      console.error("Camera access denied:", err);
      setHasPermission(false);
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const flipCamera = () => {
    const newFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(newFacing);
    startCamera(newFacing);
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    setElapsed(0);

    const mr = new MediaRecorder(streamRef.current, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm",
    });

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const file = new File([blob], `challenge-${Date.now()}.webm`, { type: "video/webm" });
      setReviewUrl(url);
      setRecordedFile(file);
    };

    mr.start(100);
    mediaRecorderRef.current = mr;
    setIsRecording(true);

    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        if (prev >= MAX_DURATION - 1) {
          stopRecording();
          return MAX_DURATION;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  const handleRetake = () => {
    if (reviewUrl) URL.revokeObjectURL(reviewUrl);
    setReviewUrl(null);
    setRecordedFile(null);
    setElapsed(0);
    startCamera(facingMode);
  };

  const handleUse = () => {
    if (recordedFile) {
      onRecorded(recordedFile);
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Review screen
  if (reviewUrl) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col bg-black"
      >
        <video
          src={reviewUrl}
          className="h-full w-full object-cover"
          autoPlay
          loop
          playsInline
        />

        {/* Top bar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <button onClick={handleRetake} className="text-white text-sm font-semibold">
            Retake
          </button>
          <p className="text-xs text-white/70">{formatTime(elapsed)}</p>
        </div>

        {/* Bottom actions */}
        <div className="absolute bottom-24 inset-x-0 flex justify-center gap-4 px-6">
          <button
            onClick={handleRetake}
            className="flex-1 rounded-full border border-white/30 py-3 text-sm font-semibold text-white"
          >
            Re-record
          </button>
          <button
            onClick={handleUse}
            className="flex-1 rounded-full bg-white py-3 text-sm font-semibold text-black"
          >
            Use Video
          </button>
        </div>
      </motion.div>
    );
  }

  // Camera permission denied
  if (hasPermission === false) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black"
      >
        <p className="mb-4 text-center text-white">Camera access is required to record.</p>
        <p className="mb-6 text-center text-sm text-white/60 max-w-[280px] mx-auto">
          Please enable camera permissions in your browser settings.
        </p>
        <button
          onClick={onClose}
          className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black"
        >
          Go Back
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-black"
    >
      {/* Camera preview */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-cover"
        style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
      />

      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <button onClick={onClose} className="text-white">
          <X className="h-6 w-6" />
        </button>
        <p className="text-xs font-medium text-white/80 truncate max-w-[60%] text-center">
          {challengeTitle}
        </p>
        <button onClick={flipCamera} className="text-white">
          <SwitchCamera className="h-6 w-6" />
        </button>
      </div>

      {/* Timer */}
      {isRecording && (
        <div className="absolute top-14 inset-x-0 flex justify-center">
          <div className="flex items-center gap-1.5 rounded-full bg-destructive/80 px-3 py-1">
            <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-semibold text-white">{formatTime(elapsed)}</span>
          </div>
        </div>
      )}

      {/* Progress bar for max duration */}
      {isRecording && (
        <div className="absolute top-12 inset-x-4">
          <div className="h-0.5 w-full rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-destructive transition-all duration-1000 ease-linear"
              style={{ width: `${(elapsed / MAX_DURATION) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-24 inset-x-0 flex items-center justify-center">
        {isRecording ? (
          <button
            onClick={stopRecording}
            className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white"
          >
            <Square className="h-8 w-8 fill-destructive text-destructive" />
          </button>
        ) : (
          <button
            onClick={startRecording}
            className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white"
          >
            <Circle className="h-16 w-16 fill-destructive text-destructive" />
          </button>
        )}
      </div>

      {/* Max time hint */}
      {!isRecording && (
        <div className="absolute bottom-6 inset-x-0 flex justify-center">
          <span className="flex items-center gap-1 text-xs text-white/50">
            <Timer className="h-3 w-3" />
            Max {MAX_DURATION}s
          </span>
        </div>
      )}
    </motion.div>
  );
}
