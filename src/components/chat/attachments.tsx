"use client";

import { useState, useRef, useEffect } from "react";
import { FileText, Download, Play, Pause, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatAttachment {
  url: string;
  name: string;
  type: string;
  size: number;
  kind: "image" | "file" | "audio";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ──────────── Audio player (voice notes) ──────────── */

export function AudioPlayer({ url, isOwn }: { url: string; isOwn: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onTime = () => setProgress(audio.currentTime);
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("durationchange", onLoaded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("durationchange", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div
      className={cn(
        "flex items-center gap-3 min-w-[200px] max-w-[280px] px-3 py-2 rounded-xl",
        isOwn ? "bg-white/10" : "bg-surface-3"
      )}
    >
      <audio ref={audioRef} src={url} preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-transform active:scale-95",
          isOwn ? "bg-white text-brand" : "bg-brand text-white"
        )}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={cn("h-1 rounded-full overflow-hidden", isOwn ? "bg-white/20" : "bg-border")}>
          <div
            className={cn("h-full transition-[width] duration-100", isOwn ? "bg-white" : "bg-brand")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className={cn("text-[10px] mt-1 tabular-nums", isOwn ? "text-white/70" : "text-text-tertiary")}>
          {playing || progress > 0 ? formatDuration(progress) : formatDuration(duration)}
        </p>
      </div>
    </div>
  );
}

/* ──────────── Single attachment renderer ──────────── */

export function AttachmentBubble({
  attachment,
  isOwn,
}: {
  attachment: ChatAttachment;
  isOwn: boolean;
}) {
  if (attachment.kind === "image") {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block max-w-[280px] rounded-xl overflow-hidden border border-white/10 hover:opacity-95 transition-opacity"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt={attachment.name}
          className="w-full h-auto max-h-[320px] object-cover"
          loading="lazy"
        />
      </a>
    );
  }

  if (attachment.kind === "audio") {
    return <AudioPlayer url={attachment.url} isOwn={isOwn} />;
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      download={attachment.name}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2.5 rounded-xl max-w-[280px] transition-colors",
        isOwn ? "bg-white/10 hover:bg-white/15" : "bg-surface-3 hover:bg-surface-2 border border-border"
      )}
    >
      <div
        className={cn(
          "w-9 h-9 shrink-0 rounded-lg flex items-center justify-center",
          isOwn ? "bg-white/10" : "bg-brand/10 text-brand"
        )}
      >
        <FileText className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-xs font-medium truncate", isOwn ? "text-white" : "text-text-primary")}>
          {attachment.name}
        </p>
        <p className={cn("text-[10px]", isOwn ? "text-white/60" : "text-text-tertiary")}>
          {formatBytes(attachment.size)}
        </p>
      </div>
      <Download className={cn("w-3.5 h-3.5 shrink-0", isOwn ? "text-white/70" : "text-text-tertiary")} />
    </a>
  );
}

/* ──────────── Pre-send preview chips ──────────── */

export function PendingAttachmentChip({
  attachment,
  uploading,
  onRemove,
}: {
  attachment: ChatAttachment;
  uploading?: boolean;
  onRemove: () => void;
}) {
  const Icon =
    attachment.kind === "image" ? ImageIcon : attachment.kind === "audio" ? Play : FileText;

  return (
    <div className="relative group inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-2 border border-border max-w-[200px]">
      {uploading ? (
        <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-brand" />
      ) : (
        <Icon className="w-3.5 h-3.5 shrink-0 text-brand" />
      )}
      <span className="text-[11px] text-text-primary truncate flex-1">{attachment.name}</span>
      <button
        type="button"
        onClick={onRemove}
        disabled={uploading}
        className="w-4 h-4 shrink-0 rounded-full bg-surface-3 hover:bg-danger/20 hover:text-danger flex items-center justify-center transition-colors disabled:opacity-50"
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </div>
  );
}
