"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/lib/auth-context"
import { createClient } from "@/app/lib/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { ConfirmationModal } from "@/components/confirmation-modal"
import { useToast } from "@/components/toast-provider"

export default function SettingsPage() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const { addToast } = useToast()

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [language, setLanguage] = useState("urdu")
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "")
      setEmail(user.email || "")
      setLanguage(user.language_preference || "urdu")
    }
  }, [user])

  const handleSaveProfile = async () => {
    if (!fullName || !email) {
      addToast("براہ کرم تمام معلومات بھریں", "error")
      return
    }

    setIsSaving(true)

    const { error } = await supabase
      .from("users")
      .update({
        full_name: fullName,
        email: email,
        language_preference: language,
      })
      .eq("id", user?.id)

    if (error) {
      addToast("خرابی: " + error.message, "error")
      setIsSaving(false)
      return
    }

    addToast("پروفائل محفوظ ہو گیا ✓", "success")
    setIsEditing(false)
    setIsSaving(false)
  }

  const handleLogout = () => {
    localStorage.removeItem("user")
    logout()
    router.push("/login")
    addToast("لاگ آؤٹ ہو گئے", "success")
  }

  if (loading || !user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="border-b bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">سیٹنگز</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle>پروفائل کی معلومات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <Label>مکمل نام</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="text-right" />
                  </div>
                  <div>
                    <Label>ای میل</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="text-right"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {isSaving ? "محفوظ ہو رہا ہے..." : "محفوظ کریں"}
                    </Button>
                    <Button onClick={() => setIsEditing(false)} variant="outline" className="flex-1">
                      منسوخ کریں
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label className="text-gray-600">مکمل نام</Label>
                    <p className="text-lg font-medium">{fullName}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">ای میل</Label>
                    <p className="text-lg font-medium">{email}</p>
                  </div>
                  <Button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700">
                    ترمیم کریں
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Language Settings */}
          <Card>
            <CardHeader>
              <CardTitle>ترجیحات</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label>زبان منتخب کریں</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urdu">اردو</SelectItem>
                    <SelectItem value="english">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Logout Button */}
          <Card>
            <CardHeader>
              <CardTitle>سیشن</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowLogoutModal(true)} className="w-full bg-red-600 hover:bg-red-700">
                لاگ آؤٹ کریں
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        isOpen={showLogoutModal}
        title="لاگ آؤٹ ہوں؟"
        message="کیا آپ واقعی لاگ آؤٹ کرنا چاہتے ہیں؟"
        confirmText="جی ہاں"
        cancelText="نہیں"
        onConfirm={() => {
          setShowLogoutModal(false)
          handleLogout()
        }}
        onCancel={() => setShowLogoutModal(false)}
      />
    </div>
  )
}
