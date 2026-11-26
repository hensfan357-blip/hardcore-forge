export type HardcoreStyle = {
  id: string;
  name: string;
  bpm: [number, number];
  defaultBpm: number;
  era: string;
  tagline: string;
  prompt: string;
};

export const STYLES: HardcoreStyle[] = [
  { id: "early-gabber", name: "Early Gabber", bpm: [160, 200], defaultBpm: 180, era: "Rotterdam '92", tagline: "Overdriven 909 kicks, warehouse rave stabs", prompt: "early 90s Rotterdam gabber, overdriven distorted Roland TR-909 kick drums, hoover synth stabs, dark warehouse rave energy, raw analog grit" },
  { id: "frenchcore", name: "Frenchcore", bpm: [190, 220], defaultBpm: 200, era: "Paris '00s", tagline: "Pounding kicks, offbeat bass, dramatic leads", prompt: "frenchcore, punchy pitched distorted kicks, rolling offbeat bassline, dramatic dark orchestral leads and strings, relentless pace" },
  { id: "uptempo", name: "Uptempo", bpm: [200, 250], defaultBpm: 220, era: "NL modern", tagline: "Screeching kicks at breakneck speed", prompt: "uptempo hardcore, screeching heavily distorted kick drums, ultra fast relentless rhythm, harsh noise textures, dark aggressive atmosphere" },
  { id: "industrial", name: "Industrial Hardcore", bpm: [140, 175], defaultBpm: 160, era: "Underground", tagline: "Cold, mechanical, crushing", prompt: "industrial hardcore, cold mechanical rumbling distorted kicks, metallic percussion, factory noise, bleak dystopian drones, slow crushing groove" },
  { id: "terrorcore", name: "Terrorcore", bpm: [200, 300], defaultBpm: 240, era: "Extreme", tagline: "Chaotic horror-tinged brutality", prompt: "terrorcore, chaotic extremely fast distorted kicks, horror atmosphere, dissonant noise bursts, frantic breakbeat chops, brutal and unhinged" },
  { id: "hardcore-punk", name: "Hardcore Punk", bpm: [160, 220], defaultBpm: 190, era: "DC / NYC '80s", tagline: "Fast, loud, raw guitars and d-beats", prompt: "hardcore punk instrumental, fast raw distorted electric guitars, d-beat drums, punchy bass, loud garage-recorded energy" },
  { id: "beatdown", name: "Beatdown", bpm: [80, 130], defaultBpm: 100, era: "NYHC", tagline: "Heavy breakdowns built for the pit", prompt: "beatdown hardcore instrumental, slow crushing breakdowns, chugging palm-muted downtuned guitars, heavy groove drums, menacing and heavy" },
  { id: "metalcore", name: "Metalcore", bpm: [120, 200], defaultBpm: 160, era: "2000s", tagline: "Riffs, double kicks and breakdowns", prompt: "metalcore instrumental, downtuned heavy guitar riffs, double bass drum blasts, crushing breakdowns, tight aggressive modern production" },
];

export function buildPrompt(style: HardcoreStyle, opts: { bpm: number; distortion: number; extra: string; length: "clip" | "full" }) {
  const dist = opts.distortion > 80 ? "maximum saturated clipping distortion, brutally loud" : opts.distortion > 50 ? "heavy distortion and grit" : opts.distortion > 25 ? "moderate distortion" : "cleaner, controlled distortion";
  return [
    `Instrumental only, no vocals, no singing, no spoken words.`,
    `${style.prompt}.`,
    `Tempo ${opts.bpm} BPM. ${dist}.`,
    opts.extra.trim() ? `Additional direction: ${opts.extra.trim()}.` : "",
    `Aggressive, raw and heavy. Absolutely no chiptune, no 8-bit sounds, no cheesy or happy melodies.`,
    opts.length === "full" ? "Full track around 2 minutes with intro, build, drop and outro." : "",
  ].filter(Boolean).join(" ");
}
