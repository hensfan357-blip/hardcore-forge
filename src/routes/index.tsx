import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Skull, Trash2, Loader2 } from "lucide-react";
import { STYLES, buildPrompt, type HardcoreStyle } from "@/lib/styles-crate";
import { listTracks, saveTrack, deleteTrack, type Track } from "@/lib/track-store";
import { WaveformPlayer } from "@/components/WaveformPlayer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hardcore Forge — AI Hardcore Instrumental Generator" },
      { name: "description", content: "Dig the crate, pick a Hardcore style, set tempo and distortion, and forge raw instrumental MP3s." },
      { property: "og:title", content: "Hardcore Forge — AI Hardcore Instrumental Generator" },
      { property: "og:description", content: "Gabber, Frenchcore, Uptempo, Terrorcore, Beatdown and more. Raw instrumentals, MP3 downloads." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [q, setQ] = useState("");
  const [style, setStyle] = useState<HardcoreStyle>(STYLES[0]!);
  const [bpm, setBpm] = useState(STYLES[0]!.defaultBpm);
  const [distortion, setDistortion] = useState(75);
  const [extra, setExtra] = useState("");
  const [length, setLength] = useState<"clip" | "full">("clip");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [current, setCurrent] = useState<Track | null>(null);

  useEffect(() => { listTracks().then((t) => { setTracks(t); setCurrent(t[0] ?? null); }).catch(() => {}); }, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return STYLES.filter((x) => (x.name + x.tagline + x.era + x.prompt).toLowerCase().includes(s));
  }, [q]);

  const pick = (s: HardcoreStyle) => { setStyle(s); setBpm(s.defaultBpm); };

  async function generate() {
    if (busy) return;
    setBusy(true); setError("");
    const prompt = buildPrompt(style, { bpm, distortion, extra, length });
    try {
      const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, length }) });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(res.status === 429 ? "Too many requests — wait a moment and try again." : res.status === 402 ? "Out of AI credits. Add credits to keep generating." : j.error || `Generation failed (${res.status})`);
      }
      const blob = await res.blob();
      const t: Track = { id: crypto.randomUUID(), styleId: style.id, styleName: style.name, bpm, distortion, prompt, createdAt: Date.now(), blob };
      await saveTrack(t);
      setTracks((p) => [t, ...p]);
      setCurrent(t);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    await deleteTrack(id);
    setTracks((p) => p.filter((t) => t.id !== id));
    if (current?.id === id) setCurrent(null);
  }

  const fname = (t: Track) => `${t.styleId}-${t.bpm}bpm-${new Date(t.createdAt).toISOString().slice(0, 19).replace(/[:T]/g, "")}.mp3`;

  return (
    <div className="min-h-screen bg-background text-foreground noise">
      <header className="border-b border-border px-6 py-5">
        <div className="mx-auto flex max-w-7xl items-end justify-between gap-4">
          <h1 className="flex items-center gap-3 font-display text-5xl uppercase leading-none tracking-tight md:text-6xl">
            <Skull className="h-10 w-10 text-primary" /> Hardcore<span className="text-primary">Forge</span>
          </h1>
          <p className="hidden font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground md:block">Instrumentals only · No vocals · No chiptune</p>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          <section>
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 className="font-display text-2xl uppercase">The Crate</h2>
              <label className="flex w-full max-w-xs items-center gap-2 border border-border bg-card px-3 py-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Dig for a style…" className="w-full bg-transparent font-mono text-sm outline-none placeholder:text-muted-foreground" />
              </label>
            </div>
            <div className="crate-scroll flex snap-x gap-4 overflow-x-auto pb-4">
              {filtered.map((s, i) => (
                <button key={s.id} onClick={() => pick(s)} className={`record group relative w-52 shrink-0 snap-start border p-4 text-left transition-transform hover:-translate-y-2 ${style.id === s.id ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
                  <div className="mb-6 flex justify-between font-mono text-[10px] uppercase text-muted-foreground">
                    <span>Cat. HC-{String(i + 1).padStart(3, "0")}</span><span>{s.era}</span>
                  </div>
                  <div className="vinyl mx-auto mb-4 h-24 w-24 rounded-full" />
                  <div className="font-display text-2xl uppercase leading-none">{s.name}</div>
                  <div className="mt-2 text-xs text-muted-foreground">{s.tagline}</div>
                  <div className="mt-3 font-mono text-xs text-primary">{s.bpm[0]}–{s.bpm[1]} BPM</div>
                </button>
              ))}
              {!filtered.length && <p className="font-mono text-sm text-muted-foreground">Nothing in the crate matches.</p>}
            </div>
          </section>

          <section className="industrial-panel space-y-5 p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-2xl uppercase">Control Rack — <span className="text-primary">{style.name}</span></h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <Slider label="Tempo" value={bpm} unit="BPM" min={style.bpm[0] - 20} max={style.bpm[1] + 20} onChange={setBpm} />
              <Slider label="Distortion" value={distortion} unit="%" min={0} max={100} onChange={setDistortion} />
            </div>
            <div>
              <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-muted-foreground">Extra direction</label>
              <textarea value={extra} onChange={(e) => setExtra(e.target.value)} rows={3} maxLength={500} placeholder="e.g. reverse bass tails, air raid siren intro, long screeching kick roll before the drop" className="w-full border border-border bg-background p-3 font-mono text-sm outline-none focus:border-primary" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {(["clip", "full"] as const).map((l) => (
                <button key={l} onClick={() => setLength(l)} className={`border px-4 py-2 font-mono text-xs uppercase ${length === l ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
                  {l === "clip" ? "30s clip" : "Full track ~2 min"}
                </button>
              ))}
              <button onClick={generate} disabled={busy} className="ml-auto inline-flex items-center gap-2 bg-primary px-8 py-3 font-display text-2xl uppercase text-primary-foreground hover:opacity-90 disabled:opacity-60">
                {busy ? <><Loader2 className="h-5 w-5 animate-spin" /> Forging…</> : "Forge track"}
              </button>
            </div>
            {busy && <p className="font-mono text-xs text-muted-foreground">Composing your track — this can take up to a minute or two.</p>}
            {error && <p className="border border-destructive p-3 font-mono text-sm text-destructive">{error}</p>}
          </section>

          {current ? <WaveformPlayer blob={current.blob} title={`${current.styleName} · ${current.bpm} BPM`} filename={fname(current)} /> : (
            <div className="industrial-panel p-8 text-center font-mono text-sm text-muted-foreground">No track loaded. Pick a style and forge one.</div>
          )}
        </div>

        <aside className="industrial-panel h-fit p-5">
          <h2 className="mb-4 font-display text-2xl uppercase">History</h2>
          {!tracks.length && <p className="font-mono text-xs text-muted-foreground">Your forged tracks will be saved here on this device.</p>}
          <ul className="max-h-[70vh] space-y-2 overflow-y-auto">
            {tracks.map((t) => (
              <li key={t.id} className={`flex items-center gap-2 border p-3 ${current?.id === t.id ? "border-primary" : "border-border"}`}>
                <button onClick={() => setCurrent(t)} className="min-w-0 flex-1 text-left">
                  <div className="truncate font-display text-lg uppercase">{t.styleName}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{t.bpm} BPM · {t.distortion}% dist · {new Date(t.createdAt).toLocaleString()}</div>
                </button>
                <button onClick={() => remove(t.id)} aria-label="Delete track" className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        </aside>
      </main>
    </div>
  );
}

function Slider({ label, value, unit, min, max, onChange }: { label: string; value: number; unit: string; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="mb-2 flex justify-between font-mono text-xs uppercase tracking-widest">
        <span className="text-muted-foreground">{label}</span><span className="text-primary">{value} {unit}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--primary)]" />
    </div>
  );
}
