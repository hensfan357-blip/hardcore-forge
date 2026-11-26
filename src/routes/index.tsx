import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Trash2, Loader2, Dices, Zap } from "lucide-react";
import { STYLES, type HardcoreStyle } from "@/lib/styles-crate";
import { listTracks, saveTrack, deleteTrack, type Track } from "@/lib/track-store";
import { WaveformPlayer } from "@/components/WaveformPlayer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hardcore Forge — Hardcore Instrumental Synthesizer" },
      { name: "description", content: "Pick a Hardcore style, set tempo and distortion, and synthesize raw instrumental MP3s right in your browser." },
      { property: "og:title", content: "Hardcore Forge — Hardcore Instrumental Synthesizer" },
      { property: "og:description", content: "Gabber, Frenchcore, Uptempo, Terrorcore, Beatdown and more. Raw distorted instrumentals, instant MP3 downloads." },
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
  const [seed, setSeed] = useState(1337);
  const [length, setLength] = useState<30 | 120>(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [current, setCurrent] = useState<Track | null>(null);

  useEffect(() => { listTracks().then((t) => { setTracks(t); setCurrent(t[0] ?? null); }).catch(() => {}); }, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return STYLES.filter((x) => (x.name + x.tagline + x.era).toLowerCase().includes(s));
  }, [q]);

  const pick = (s: HardcoreStyle) => { setStyle(s); setBpm(s.defaultBpm); };

  async function generate() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const { forge } = await import("@/lib/synth");
      const blob = await forge({ styleId: style.id, bpm, distortion, seconds: length, seed });
      const t: Track = { id: crypto.randomUUID(), styleId: style.id, styleName: style.name, bpm, distortion, prompt: `seed ${seed} · ${length}s`, createdAt: Date.now(), blob };
      await saveTrack(t);
      setTracks((p) => [t, ...p]);
      setCurrent(t);
      setSeed(Math.floor(Math.random() * 99999));
    } catch (e) { setError((e as Error).message || "Rendering failed."); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    await deleteTrack(id);
    setTracks((p) => p.filter((t) => t.id !== id));
    if (current?.id === id) setCurrent(null);
  }

  const fname = (t: Track) => `${t.styleId}-${t.bpm}bpm-${new Date(t.createdAt).toISOString().slice(0, 19).replace(/[:T]/g, "")}.mp3`;

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground glow"><Zap className="h-4 w-4" /></div>
            <span className="font-display text-lg font-bold tracking-tight">Hardcore Forge</span>
          </div>
          <span className="hidden rounded-full border border-border px-3 py-1 font-mono text-xs text-muted-foreground sm:inline">Instrumental · Synthesized in-browser</span>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Pick your poison.</h1>
                <p className="mt-1 text-sm text-muted-foreground">Eight styles of hardcore, built from raw kicks and distortion.</p>
              </div>
              <label className="flex w-full max-w-xs items-center gap-2 rounded-full border border-border bg-card px-4 py-2 focus-within:border-primary">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search styles" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
              </label>
            </div>
            <div className="hide-scroll -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
              {filtered.map((s) => {
                const on = style.id === s.id;
                return (
                  <button key={s.id} onClick={() => pick(s)} className={`group w-48 shrink-0 snap-start rounded-2xl border p-4 text-left transition-all ${on ? "border-primary bg-primary/10 glow" : "border-border bg-card hover:border-muted-foreground/40 hover:bg-accent"}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-muted-foreground">{s.era}</span>
                      <span className={`h-2 w-2 rounded-full ${on ? "bg-primary" : "bg-muted"}`} />
                    </div>
                    <div className="mt-8 font-display text-base font-bold leading-tight">{s.name}</div>
                    <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.tagline}</div>
                    <div className="mt-3 font-mono text-xs text-primary">{s.bpm[0]}–{s.bpm[1]} bpm</div>
                  </button>
                );
              })}
              {!filtered.length && <p className="py-8 text-sm text-muted-foreground">No styles match.</p>}
            </div>
          </section>

          <section className="panel space-y-6 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">{style.name}</h2>
              <div className="flex rounded-full bg-muted p-1">
                {([30, 120] as const).map((l) => (
                  <button key={l} onClick={() => setLength(l)} className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${length === l ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
                    {l === 30 ? "30 sec" : "2 min"}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <Slider label="Tempo" value={bpm} unit="bpm" min={style.bpm[0] - 20} max={style.bpm[1] + 20} onChange={setBpm} />
              <Slider label="Distortion" value={distortion} unit="%" min={0} max={100} onChange={setDistortion} />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-border px-3 py-2">
                <span className="text-xs text-muted-foreground">Variation</span>
                <input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value) || 0)} className="w-16 bg-transparent font-mono text-sm outline-none" aria-label="Variation number" />
                <button onClick={() => setSeed(Math.floor(Math.random() * 99999))} aria-label="Random variation" className="text-muted-foreground hover:text-primary"><Dices className="h-4 w-4" /></button>
              </div>
              <button onClick={generate} disabled={busy} className="ml-auto inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground glow transition-opacity hover:opacity-90 disabled:opacity-60">
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Rendering…</> : <><Zap className="h-4 w-4" /> Forge track</>}
              </button>
            </div>
            {error && <p className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          </section>

          {current ? <WaveformPlayer blob={current.blob} title={current.styleName} subtitle={`${current.bpm} bpm · ${current.distortion}% distortion`} filename={fname(current)} /> : (
            <div className="panel p-10 text-center text-sm text-muted-foreground">No track yet. Pick a style and hit Forge.</div>
          )}
        </div>

        <aside className="panel h-fit p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-base font-bold">History</h2>
            <span className="font-mono text-xs text-muted-foreground">{tracks.length}</span>
          </div>
          {!tracks.length && <p className="text-sm text-muted-foreground">Tracks you forge are saved on this device.</p>}
          <ul className="max-h-[70vh] space-y-1 overflow-y-auto">
            {tracks.map((t) => (
              <li key={t.id} className={`group flex items-center gap-2 rounded-xl px-3 py-2.5 transition-colors ${current?.id === t.id ? "bg-accent" : "hover:bg-accent/60"}`}>
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${current?.id === t.id ? "bg-primary" : "bg-muted-foreground/40"}`} />
                <button onClick={() => setCurrent(t)} className="min-w-0 flex-1 text-left">
                  <div className="truncate text-sm font-medium">{t.styleName}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">{t.bpm} bpm · {new Date(t.createdAt).toLocaleDateString()}</div>
                </button>
                <button onClick={() => remove(t.id)} aria-label="Delete track" className="p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
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
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="font-mono text-sm">{value}<span className="ml-1 text-muted-foreground">{unit}</span></span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="range w-full" aria-label={label} />
    </div>
  );
}
