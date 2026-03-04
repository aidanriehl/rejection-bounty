import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Camera, Upload, Play, Pause, Check, Scissors } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AdminVideoEditorProps {
  videoUrl: string;
  weekKey: string;
  winnerId: string;
  onSave: (data: { thumbnail_url: string | null; trim_start: number; trim_end: number | null }) => void;
  onCancel: () => void;
}

export default function AdminVideoEditor({ videoUrl, weekKey, winnerId, onSave, onCancel }: AdminVideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimRange, setTrimRange] = useState<[number, number]>([0, 0]);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      setTrimRange([0, dur]);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const ct = videoRef.current.currentTime;
    setCurrentTime(ct);
    if (previewing && ct >= trimRange[1]) {
      videoRef.current.pause();
      setPlaying(false);
      setPreviewing(false);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
  };

  const captureThumbnail = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) {
        setThumbnailBlob(blob);
        setThumbnailUrl(URL.createObjectURL(blob));
      }
    }, "image/jpeg", 0.85);
  }, []);

  const previewTrim = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = trimRange[0];
    videoRef.current.play();
    setPlaying(true);
    setPreviewing(true);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const handleSave = async () => {
    setUploading(true);
    let uploadedThumbnailUrl: string | null = null;

    if (thumbnailBlob) {
      const fileName = `thumbnails/${winnerId}-${weekKey}-${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from("avatars")
        .upload(fileName, thumbnailBlob, { contentType: "image/jpeg", upsert: true });
      
      if (data && !error) {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
        uploadedThumbnailUrl = urlData.publicUrl;
      }
    }

    onSave({
      thumbnail_url: uploadedThumbnailUrl,
      trim_start: trimRange[0],
      trim_end: trimRange[1] >= duration - 0.1 ? null : trimRange[1],
    });
    setUploading(false);
  };

  return (
    <div className="space-y-4 rounded-xl border-2 border-primary/20 bg-card p-4">
      <p className="text-sm font-bold text-foreground">Edit Winning Video</p>

      {/* Video Player */}
      <div className="relative rounded-lg overflow-hidden bg-background">
        <video
          ref={videoRef}
          src={videoUrl}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => { setPlaying(false); setPreviewing(false); }}
          className="w-full rounded-lg"
          playsInline
        />
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
        >
          {playing ? (
            <Pause className="h-10 w-10 text-white fill-white" />
          ) : (
            <Play className="h-10 w-10 text-white fill-white" />
          )}
        </button>
      </div>

      {/* Timeline / Current time */}
      <div className="text-xs text-muted-foreground text-center">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      {/* Thumbnail Section */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Thumbnail</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={captureThumbnail}>
            <Camera className="h-3.5 w-3.5 mr-1.5" />
            Capture Frame
          </Button>
        </div>
        {thumbnailUrl && (
          <div className="relative">
            <img src={thumbnailUrl} alt="Thumbnail preview" className="w-full rounded-lg border" />
            <div className="absolute top-2 right-2 rounded-full bg-primary p-1">
              <Check className="h-3 w-3 text-primary-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Trim Section */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Scissors className="h-3.5 w-3.5" />
          Trim Video
        </p>
        {duration > 0 && (
          <>
            <Slider
              min={0}
              max={Math.round(duration * 10) / 10}
              step={0.1}
              value={trimRange}
              onValueChange={(val) => setTrimRange(val as [number, number])}
              className="w-full"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Start: {formatTime(trimRange[0])}</span>
              <span>End: {formatTime(trimRange[1])}</span>
            </div>
            <Button size="sm" variant="outline" onClick={previewTrim} className="w-full">
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Preview Trimmed ({formatTime(trimRange[1] - trimRange[0])})
            </Button>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} disabled={uploading} className="flex-1">
          {uploading ? "Saving..." : "Save & Confirm Winner"}
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>

      {/* Hidden canvas for thumbnail capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
