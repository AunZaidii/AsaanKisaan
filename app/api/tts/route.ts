import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let text = searchParams.get("q") || "";
    const lang = searchParams.get("lang") || "ur";

    // Clean text for TTS (remove emojis & unsupported punctuation)
    text = text.replace(/[^\p{L}\p{N}\s.,؟?!،]/gu, "");

    if (!text) {
      return NextResponse.json({ error: "Missing text query" }, { status: 400 });
    }

    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(
      text
    )}`;

    const resp = await fetch(ttsUrl);
    if (!resp.ok) throw new Error(`TTS request failed: ${resp.status}`);

    const buffer = await resp.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("TTS proxy error:", err);
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }
}
