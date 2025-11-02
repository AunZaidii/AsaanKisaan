"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { ArrowLeft, Plus, Users, Lightbulb } from "lucide-react"
import { ConfirmationModal } from "@/components/confirmation-modal"
import { useToast } from "@/components/toast-provider"
import { cooperativeSuggestions } from "@/lib/cooperative-suggestions" // Import cooperativeSuggestions

interface Cooperative {
  coop_id: string
  name: string
  region: string
  purpose: string
  created_by: string
  created_at: string
}

interface CooperativeMember {
  id: string
  coop_id: string
  farmer_id: string
  role: string
  joined_at: string
}

export default function CooperativePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const { addToast } = useToast()

  const [coops, setCoops] = useState<Cooperative[]>([])
  const [myCoops, setMyCoops] = useState<Cooperative[]>([])
  const [members, setMembers] = useState<CooperativeMember[]>([])
  const [coopName, setCoopName] = useState("")
  const [region, setRegion] = useState("")
  const [purpose, setPurpose] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; coopId: string; action: string }>({
    isOpen: false,
    coopId: "",
    action: "",
  })

  useEffect(() => {
    if (!loading && !user) router.push("/login")
  }, [user, loading, router])

  useEffect(() => {
    if (user) fetchData()
  }, [user])

  const fetchData = async () => {
    const [coopsRes, membersRes] = await Promise.all([
      supabase.from("cooperatives").select("*"),
      supabase.from("cooperative_members").select("*").eq("farmer_id", user?.id),
    ])

    if (coopsRes.data) setCoops(coopsRes.data)
    if (membersRes.data) {
      setMembers(membersRes.data)
      // Filter cooperatives where user is a member
      const myCoop = coopsRes.data?.filter((c) => membersRes.data.some((m) => m.coop_id === c.coop_id))
      setMyCoops(myCoop || [])
    }
  }

  const handleCreateCoop = async () => {
    if (!coopName || !region) {
      addToast("براہ کرم تمام معلومات بھریں", "error")
      return
    }

    const { error: coopError } = await supabase.from("cooperatives").insert({
      name: coopName,
      region,
      created_by: user?.id,
      purpose: purpose || "مشترکہ کسانی",
      created_at: new Date().toISOString(),
    })

    if (coopError) {
      addToast("خرابی: " + coopError.message, "error")
      return
    }

    // Auto-join creator
    const coopsRes = await supabase.from("cooperatives").select("*").eq("name", coopName).single()
    if (coopsRes.data) {
      await supabase.from("cooperative_members").insert({
        coop_id: coopsRes.data.coop_id,
        farmer_id: user?.id,
        role: "leader",
        joined_at: new Date().toISOString(),
      })
    }

    setCoopName("")
    setRegion("")
    setPurpose("")
    addToast("گروپ کامیابی سے بنایا گیا ✓", "success")
    fetchData()
  }

  const handleJoinCoop = async (coopId: string) => {
    const { error } = await supabase.from("cooperative_members").insert({
      coop_id: coopId,
      farmer_id: user?.id,
      role: "member",
      joined_at: new Date().toISOString(),
    })

    if (error) {
      if (error.code === "23505") {
        addToast("آپ پہلے سے اس گروپ میں ہیں", "info")
      } else {
        addToast("خرابی: " + error.message, "error")
      }
      return
    }

    addToast("گروپ میں شامل ہو گئے ✓", "success")
    fetchData()
  }

  const handleLeaveCoop = async (coopId: string) => {
    const { error } = await supabase
      .from("cooperative_members")
      .delete()
      .eq("coop_id", coopId)
      .eq("farmer_id", user?.id)

    if (error) {
      addToast("خرابی: " + error.message, "error")
      return
    }

    addToast("گروپ سے نکال دیے گئے", "success")
    setConfirmModal({ isOpen: false, coopId: "", action: "" })
    fetchData()
  }

  if (loading || !user) return null

  const availableCoops = coops.filter((c) => !members.some((m) => m.coop_id === c.coop_id))

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="border-b bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-purple-700">کسان گروپ منصوبہ</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Cooperative */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-right">
                <Plus className="w-4 h-4" />
                نیا گروپ بنائیں
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>گروپ کا نام</Label>
                <Input
                  placeholder="مثال: دودھ والے کسان"
                  value={coopName}
                  onChange={(e) => setCoopName(e.target.value)}
                  className="text-right"
                />
              </div>
              <div>
                <Label>علاقہ</Label>
                <Input
                  placeholder="مثال: پنجاب"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="text-right"
                />
              </div>
              <div>
                <Label>مقصد</Label>
                <Textarea
                  placeholder="گروپ کے مقاصد بتائیں..."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="text-right min-h-20"
                />
              </div>
              <Button onClick={handleCreateCoop} className="w-full bg-purple-600 hover:bg-purple-700">
                بنائیں
              </Button>

              {/* AI Suggestions button and card */}
              <div className="pt-4 border-t">
                <Button
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  variant="outline"
                  className="w-full flex items-center gap-2 justify-center"
                >
                  <Lightbulb className="w-4 h-4" />
                  خیالات دیکھیں
                </Button>
              </div>

              {showSuggestions && (
                <Card className="border-purple-200 bg-purple-50">
                  <CardContent className="pt-4">
                    <p className="text-sm font-medium text-purple-900 mb-3">گروپ کے لیے خیالات:</p>
                    <div className="space-y-2">
                      {cooperativeSuggestions.map((suggestion, idx) => (
                        <p key={idx} className="text-sm text-purple-800 text-right leading-relaxed">
                          • {suggestion}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Active Groups */}
          <div className="lg:col-span-2 space-y-6">
            {/* My Groups */}
            {myCoops.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  میرے گروپ
                </h2>
                <div className="space-y-3">
                  {myCoops.map((coop) => (
                    <Card key={coop.coop_id} className="border-l-4 border-l-purple-600">
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                          <div className="text-right flex-1">
                            <h3 className="font-bold text-lg">{coop.name}</h3>
                            <p className="text-sm text-gray-600">{coop.region}</p>
                            <p className="text-sm text-gray-700 mt-1">{coop.purpose}</p>
                            <p className="text-xs text-purple-600 font-medium mt-2">
                              {coop.created_by === user?.id ? "رہنما" : "رکن"}
                            </p>
                          </div>
                          <Button
                            onClick={() =>
                              setConfirmModal({
                                isOpen: true,
                                coopId: coop.coop_id,
                                action: "leave",
                              })
                            }
                            variant="outline"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            نکلیں
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Available Groups to Join */}
            {availableCoops.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4">دستیاب گروپ</h2>
                <div className="space-y-3">
                  {availableCoops.map((coop) => (
                    <Card key={coop.coop_id}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                          <div className="text-right flex-1">
                            <h3 className="font-bold text-lg">{coop.name}</h3>
                            <p className="text-sm text-gray-600">{coop.region}</p>
                            <p className="text-sm text-gray-700 mt-1">{coop.purpose}</p>
                          </div>
                          <Button
                            onClick={() => handleJoinCoop(coop.coop_id)}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            شامل ہوں
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {myCoops.length === 0 && availableCoops.length === 0 && (
              <Card>
                <CardContent className="text-center py-8 text-gray-500">
                  کوئی گروپ دستیاب نہیں۔ نیا گروپ بنائیں یا موجودہ گروپ کو شامل کریں۔
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title="گروپ چھوڑیں؟"
        message="کیا آپ یقینی ہیں کہ آپ اس گروپ سے نکلنا چاہتے ہیں؟"
        confirmText="جی ہاں"
        cancelText="نہیں"
        onConfirm={() => handleLeaveCoop(confirmModal.coopId)}
        onCancel={() => setConfirmModal({ isOpen: false, coopId: "", action: "" })}
      />
    </div>
  )
}
