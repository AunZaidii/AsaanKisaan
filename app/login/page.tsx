"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const result = await login(email, password)
    if (result.success) {
      router.push("/dashboard")
    } else {
      setError(result.error || "لاگ ان ناکام")
    }

    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-6">
      <Card className="w-full max-w-md border-2 border-green-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
          <CardTitle className="text-2xl">ایگری ورس</CardTitle>
          <CardDescription className="text-green-100">کسانوں کو بہتر بنانا</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">ای میل</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">پاس ورڈ</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700">
              {loading ? "لاگ ان ہو رہے ہیں..." : "لاگ ان کریں"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            کھاتہ نہیں ہے؟{" "}
            <Link href="/signup" className="text-green-600 underline hover:text-green-700">
              سائن اپ کریں
            </Link>
          </div>
          <p className="mt-4 text-xs text-gray-500">ڈیمو: ahmad@agriverse.com / password123</p>
        </CardContent>
      </Card>
    </div>
  )
}
