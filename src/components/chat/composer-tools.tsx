"use client";

import { useState, useRef, useEffect } from "react";
import { Paperclip, Mic, Square, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatAttachment } from "./attachments";

export type UploadResult = ChatAttachment;

const ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

/**
 * Upload a File to /api/upload?folder=chat and return the public URL + metadata.
 */
export async function uploadChatFile(file: File): Promise<UploadResult> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload?folder=chat", { method: "POST", body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Upload failed");
  }
  return res.json();
}

/* ──────────── Attach button (file picker) ──────────── */

export function AttachButton({
  onPicked,
  disabled,
}: {
  onPicked: (files: File[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) onPicked(files);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="p-2 rounded-xl text-text-tertiary hover:text-text-primary hover:bg-surface-3 transition-colors disabled:opacity-40"
        title="Attach file"
      >
        <Paperclip className="w-4 h-4" />
      </button>
    </>
  );
}

/* ──────────── Voice recorder button ──────────── */

interface VoiceRecorderProps {
  onRecorded: (file: File) => void;
  disabled?: boolean;
}

export function VoiceRecorder({ onRecorded, disabled }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const cancelledRef = useRef(false);

  // Auto-stop at 5 minutes for safety
  const MAX_SECONDS = 300;

  useEffect(() => {
    return () => {
      stopStream();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const start = async () => {
    setError(null);
    cancelledRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Pick best supported mime type
      const mimeCandidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ];
      const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stopStream();
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setRecording(false);

        if (cancelledRef.current) {
          chunksRef.current = [];
          setSeconds(0);
          return;
        }

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const ext = (recorder.mimeType || "audio/webm").includes("mp4") ? "m4a" : "webm";
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: blob.type });
        chunksRef.current = [];
        setSeconds(0);
        onRecorded(file);
      };

      recorder.start();
      setRecording(true);
      setSeconds(0);

      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) {
            stop();
            return s + 1;
          }
          return s + 1;
        });
      }, 1000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Microphone access denied";
      setError(msg);
      setTimeout(() => setError(null), 3000);
    }
  };

  const stop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const cancel = () => {
    cancelledRef.current = true;
    stop();
  };

  if (recording) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-danger/10 border border-danger/30">
        <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
        <span className="text-[11px] tabular-nums font-medium text-danger min-w-[32px]">
          {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, "0")}
        </span>
        <button
          type="button"
          onClick={cancel}
          className="p-1 rounded-lg text-text-tertiary hover:text-danger hover:bg-danger/10 transition-colors"
          title="Cancel"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={stop}
          className="p-1 rounded-lg text-success hover:bg-success/10 transition-colors"
          title="Send voice note"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={disabled}
      className={cn(
        "p-2 rounded-xl transition-colors disabled:opacity-40",
        error
          ? "text-danger bg-danger/10"
          : "text-text-tertiary hover:text-text-primary hover:bg-surface-3"
      )}
      title={error || "Record voice note"}
    >
      <Mic className="w-4 h-4" />
    </button>
  );
}

/* ──────────── Uploading indicator ──────────── */

export function UploadingIndicator() {
  return (
    <div className="inline-flex items-center gap-1.5 text-[11px] text-text-tertiary px-2">
      <Loader2 className="w-3 h-3 animate-spin" />
      Uploading…
    </div>
  );
}
