import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY!,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "AgriVerse FarmGPT",
  },
});

export async function POST(req: Request) {
  try {
    const { question } = await req.json();

    if (!question || question.trim().length === 0) {
      return NextResponse.json({ error: "Empty question" }, { status: 400 });
    }

    // Detect if Urdu characters exist
    const isUrdu = /[\u0600-\u06FF]/.test(question);

    const systemPrompt = isUrdu
      ? `آپ ایک پاکستانی زرعی مشیر ہیں۔ کسانوں کے سوالات کے جوابات مختصر، درست اور عام فہم اردو میں دیں۔`
      : `You are an experienced Pakistani agricultural advisor. Respond in short, clear, and simple English.`;

    const completion = await openai.chat.completions.create({
      model: "meta-llama/llama-3-8b-instruct",
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
    });

    const answer =
      completion.choices[0].message?.content?.trim() ||
      (isUrdu ? "کوئی جواب دستیاب نہیں۔" : "No answer available.");

    return NextResponse.json({
      answer,
      language: isUrdu ? "ur" : "en",
    });
  } catch (err) {
    console.error("FarmGPT error:", err);
    return NextResponse.json(
      { error: "FarmGPT backend failed" },
      { status: 500 }
    );
  }
}
