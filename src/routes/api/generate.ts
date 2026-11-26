import { createFileRoute } from "@tanstack/react-router";

const MODELS = { clip: "google/lyria-3-clip-preview", full: "google/lyria-3-pro-preview" } as const;

export const Route = createFileRoute("/api/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as
          | { prompt?: string; length?: "clip" | "full" }
          | null;
        const prompt = body?.prompt?.trim();
        if (!prompt || prompt.length > 4000)
          return Response.json({ error: "Prompt is required (max 4000 chars)." }, { status: 400 });
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return Response.json({ error: "AI is not configured." }, { status: 500 });
        const model = MODELS[body?.length === "full" ? "full" : "clip"];
        const res = await fetch("https://ai.gateway.lovable.dev/v1/music", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            input: [{ type: "user_input", content: [{ type: "text", text: prompt }] }],
          }),
        });
        if (!res.ok) {
          const text = await res.text();
          let msg = text;
          try {
            const j = JSON.parse(text);
            msg = j?.error?.message ?? j?.message ?? j?.error ?? text;
          } catch {}
          return Response.json({ error: String(msg).slice(0, 500) }, { status: res.status });
        }
        const buf = await res.arrayBuffer();
        return new Response(buf, { headers: { "Content-Type": "audio/mpeg" } });
      },
    },
  },
});
