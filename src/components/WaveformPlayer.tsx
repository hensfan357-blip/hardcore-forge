import { useEffect, useRef, useState } from "react";
import { Pause, Play, Download } from "lucide-react";

export function WaveformPlayer({ blob, title, filename }: { blob: Blob; title: string; filename: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState("");
  const [peaks, setPeaks] = useState<number[]>([]);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    setProgress(0);
    let cancelled = false;
    blob.arrayBuffer().then(async (ab) => {
      try {
        const ctx = new AudioContext();
        const buf = await ctx.decodeAudioData(ab);
        ctx.close();
        const data = buf.getChannelData(0);
        const n = 180, step = Math.floor(data.length / n), out: number[] = [];
        for (let i = 0; i < n; i++) {
          let m = 0;
          for (let j = i * step; j < (i + 1) * step; j += 16) m = Math.max(m, Math.abs(data[j] ?? 0));
          out.push(m);
        }
        if (!cancelled) setPeaks(out);
      } catch { if (!cancelled) setPeaks([]); }
    });
    return () => { cancelled = true; URL.revokeObjectURL(u); };
  }, [blob]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const g = c.getContext("2d")!;
    const css = getComputedStyle(c);
    const on = css.getPropertyValue("--primary").trim() ? `color-mix(in oklab, ${css.getPropertyValue("--primary")} 100%, transparent)` : "red";
    const off = `color-mix(in oklab, ${css.getPropertyValue("--muted-foreground")} 45%, transparent)`;
    const w = (c.width = c.clientWidth * 2), h = (c.height = c.clientHeight * 2);
    g.clearRect(0, 0, w, h);
    const p = peaks.length ? peaks : Array.from({ length: 180 }, () => 0.05);
    const bw = w / p.length;
    p.forEach((v, i) => {
      const bh = Math.max(2, v * h * 0.95);
      g.fillStyle = i / p.length <= progress ? on : off;
      g.fillRect(i * bw, (h - bh) / 2, bw * 0.6, bh);
    });
  }, [peaks, progress]);

  const toggle = () => {
    const a = audioRef.current!;
    a.paused ? a.play() : a.pause();
  };
  const seek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const a = audioRef.current!;
    const r = e.currentTarget.getBoundingClientRect();
    if (a.duration) a.currentTime = ((e.clientX - r.left) / r.width) * a.duration;
  };
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <div className="industrial-panel p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Now loaded</div>
          <div className="truncate font-display text-2xl uppercase">{title}</div>
        </div>
        <a href={url} download={filename} className="inline-flex items-center gap-2 border border-primary px-3 py-2 font-mono text-xs uppercase text-primary hover:bg-primary hover:text-primary-foreground">
          <Download className="h-4 w-4" /> MP3
        </a>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="grid h-14 w-14 shrink-0 place-items-center bg-primary text-primary-foreground hover:opacity-90">
          {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
        </button>
        <canvas ref={canvasRef} onClick={seek} className="h-20 w-full cursor-pointer" />
      </div>
      <div className="mt-2 flex justify-between font-mono text-xs text-muted-foreground">
        <span>{fmt(progress * dur)}</span><span>{fmt(dur)}</span>
      </div>
      <audio
        ref={audioRef}
        src={url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime / (e.currentTarget.duration || 1))}
      />
    </div>
  );
}
