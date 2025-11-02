"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ArrowLeft, Volume2, Mic, Loader2 } from "lucide-react";
import { useToast } from "@/components/toast-provider";

interface HistoryItem {
  q: string;
  answer: string;
  lang: string;
}

export default function FarmGPTPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [language, setLanguage] = useState<"ur" | "en">("en");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    const saved = localStorage.getItem("farmgpt_history");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  // 🎙 Speech input
  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addToast("متأسفانہ: آپ کے براؤزر میں آواز کی سہولت نہیں ہے", "error");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ur-PK";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      addToast("سنا جا رہا ہے...", "info");
    };
    recognition.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) setQuestion(transcript);
      }
    };
    recognition.onerror = () => {
      addToast("خرابی: براہ کرم دوبارہ کوشش کریں", "error");
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

// 🔊 Improved Urdu+English speech with chunked playback
const handleSpeak = async (text: string, lang: "ur" | "en") => {
  try {
    // Break Urdu into smaller safe chunks (max 150 chars)
    const chunks =
      lang === "ur"
        ? text.match(/.{1,150}(?:\s|$)/g) || [text]
        : [text];

    for (const chunk of chunks) {
      const safeText = chunk.trim();
      if (!safeText) continue;

      const audioUrl =
        lang === "ur"
          ? `/api/tts?q=${encodeURIComponent(safeText)}&lang=ur`
          : `/api/tts?q=${encodeURIComponent(safeText)}&lang=en`;

      const audio = new Audio(audioUrl);

      // Wait for one chunk to finish before next
      await new Promise((resolve, reject) => {
        audio.onended = resolve;
        audio.onerror = reject;
        audio.play().catch(reject);
      });
    }
  } catch (err) {
    console.error("TTS playback error:", err);
    addToast("آواز چلانے میں مسئلہ پیش آیا", "error");
  }
};


  // 🤖 Ask AI
  const handleAsk = async () => {
    if (!question.trim()) {
      addToast("براہ کرم کوئی سوال لکھیں", "error");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/farmgpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      setResponse(data.answer);
      setLanguage(data.language);
      const newHistory = [...history, { q: question, answer: data.answer, lang: data.language }].slice(-5);
      setHistory(newHistory);
      localStorage.setItem("farmgpt_history", JSON.stringify(newHistory));

      setQuestion("");
      addToast("جواب تیار ہے ✓", "success");
    } catch (err) {
      console.error("FarmGPT error:", err);
      addToast("خرابی: دوبارہ کوشش کریں", "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="border-b bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-green-700">فارم جی پی ٹی</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Area */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>کسانی مشیر - AI کی مدد سے</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">اپنا سوال پوچھیں</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="سوال لکھیں یا مائیک دبائیں..."
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                      className="text-right"
                    />
                    <Button onClick={startListening} disabled={isListening || isLoading} variant="outline" size="sm">
                      <Mic className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={handleAsk}
                      disabled={isLoading || !question.trim()}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "پوچھیں"}
                    </Button>
                  </div>
                </div>

                {response && (
                  <div className="bg-green-50 border border-green-200 rounded p-4">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium text-green-900">جواب:</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSpeak(response, language)}
                        className="text-green-600"
                      >
                        <Volume2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-green-800 text-right leading-relaxed">{response}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* History Sidebar */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">تاریخ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {history.length === 0 ? (
                    <p className="text-gray-500 text-sm">ابھی کوئی سوال نہیں</p>
                  ) : (
                    history.map((item, idx) => (
                      <div key={idx} className="text-sm border-b pb-2 text-right">
                        <p className="font-medium text-gray-700">{item.q}</p>
                        <p className="text-gray-500 text-xs mt-1">
                          {(item.answer || "").substring(0, 40)}...
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
