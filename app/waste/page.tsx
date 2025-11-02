"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { ArrowLeft, Trash2 } from "lucide-react"
import { ConfirmationModal } from "@/components/confirmation-modal"
import { useToast } from "@/components/toast-provider"

interface Waste {
  waste_id: string
  farmer_id: string
  waste_type: string
  quantity_kg: number
  reused_as: string
  suggested_use: string
  is_sold: boolean
  created_at: string
}

export default function WastePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const { addToast } = useToast()

  const [wastes, setWastes] = useState<Waste[]>([])
  const [marketplaceWastes, setMarketplaceWastes] = useState<Waste[]>([])
  const [wasteType, setWasteType] = useState("dung")
  const [quantity, setQuantity] = useState("")
  const [description, setDescription] = useState("")
  const [recommendations, setRecommendations] = useState<string[]>([])
  const [selectedAction, setSelectedAction] = useState("")
  const [showModal, setShowModal] = useState<{ isOpen: boolean; action: string }>({
    isOpen: false,
    action: "",
  })
  const [activeTab, setActiveTab] = useState("record")

  useEffect(() => {
    if (!loading && !user) router.push("/login")
  }, [user, loading, router])

  useEffect(() => {
    if (user) fetchWastes()
  }, [user])

  const fetchWastes = async () => {
    const [myWastesRes, marketplaceRes] = await Promise.all([
      supabase.from("wastes").select("*").eq("farmer_id", user?.id),
      supabase.from("wastes").select("*").eq("is_sold", true),
    ])

    if (myWastesRes.data) setWastes(myWastesRes.data)
    if (marketplaceRes.data) {
      // Filter out user's own marketplace items
      setMarketplaceWastes(marketplaceRes.data.filter((w) => w.farmer_id !== user?.id))
    }
  }

  const getRecommendations = (type: string): string[] => {
    const recs: Record<string, string[]> = {
      dung: ["کھاد بنانے کے لیے (کمپوسٹ)", "بائیو گیس پلانٹ میں ڈالیں", "سبزیوں کی کھیتی میں استعمال"],
      crop: ["کھاد بنانے کے لیے استعمال", "جانوروں کی خوراک کے طور پر", "باغ میں گھاس کے طور پر"],
      spoiled: ["کمپوسٹ پلانٹ میں ڈالیں", "جانوروں کی خوراک کے طور پر بیچیں", "بائیو گیس میں تبدیل کریں"],
    }
    return recs[type] || []
  }

  const handleGetRecommendations = () => {
    if (!quantity) {
      addToast("براہ کرم مقدار درج کریں", "error")
      return
    }
    const recs = getRecommendations(wasteType)
    setRecommendations(recs)
  }

  const handleSaveWaste = async () => {
    if (!selectedAction) {
      addToast("براہ کرم کوئی عمل منتخب کریں", "error")
      return
    }

    const { error } = await supabase.from("wastes").insert({
      farmer_id: user?.id,
      waste_type: wasteType,
      quantity_kg: Number.parseFloat(quantity),
      reused_as: selectedAction,
      suggested_use: selectedAction,
      is_sold: false,
      created_at: new Date().toISOString(),
    })

    if (error) {
      addToast("خرابی: " + error.message, "error")
      return
    }

    addToast("فضلہ محفوظ کر لیا گیا ✓", "success")
    resetForm()
    fetchWastes()
  }

  const handleSendToMarketplace = async () => {
    if (!selectedAction) {
      addToast("براہ کرم کوئی عمل منتخب کریں", "error")
      return
    }

    const { error } = await supabase.from("wastes").insert({
      farmer_id: user?.id,
      waste_type: wasteType,
      quantity_kg: Number.parseFloat(quantity),
      reused_as: selectedAction,
      suggested_use: selectedAction,
      is_sold: true,
      created_at: new Date().toISOString(),
    })

    if (error) {
      addToast("خرابی: " + error.message, "error")
      return
    }

    addToast("فضلہ مارکیٹ میں بھیج دیا گیا 🏪", "success")
    resetForm()
    setShowModal({ isOpen: false, action: "" })
    fetchWastes()
  }

  const handleDeleteWaste = async (wasteId: string) => {
    const { error } = await supabase.from("wastes").delete().eq("waste_id", wasteId)
    if (error) {
      addToast("خرابی: " + error.message, "error")
      return
    }
    addToast("فضلہ ہٹایا گیا", "success")
    fetchWastes()
  }

  const resetForm = () => {
    setWasteType("dung")
    setQuantity("")
    setDescription("")
    setRecommendations([])
    setSelectedAction("")
  }

  if (loading || !user) return null

  const wasteOptions = [
    { value: "dung", labelUrdu: "گوبر", labelEn: "Dung" },
    { value: "crop", labelUrdu: "فصل کا کچرا", labelEn: "Crop Waste" },
    { value: "spoiled", labelUrdu: "خراب سبزیاں", labelEn: "Spoiled Produce" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="border-b bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-orange-700">فضلہ منیجمنٹ</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="record">ریکارڈ کریں</TabsTrigger>
            <TabsTrigger value="my-list">میرے ریکارڈ</TabsTrigger>
            <TabsTrigger value="marketplace">میری مارکیٹ</TabsTrigger>
          </TabsList>

          {/* Record Waste Tab */}
          <TabsContent value="record">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input Form */}
              <Card>
                <CardHeader>
                  <CardTitle>فضلہ کی معلومات</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>فضلہ کی قسم</Label>
                    <Select value={wasteType} onValueChange={setWasteType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {wasteOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.labelUrdu}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>مقدار (کلوگرام)</Label>
                    <Input
                      type="number"
                      placeholder="100"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>تفصیل (اختیاری)</Label>
                    <Textarea
                      placeholder="کوئی اضافی معلومات..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="min-h-20"
                    />
                  </div>

                  <Button onClick={handleGetRecommendations} className="w-full bg-orange-600 hover:bg-orange-700">
                    مشورہ لیں
                  </Button>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle>تجاویز اور سفارشات</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recommendations.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600 mb-2">
                        {wasteType === "dung"
                          ? "گوبر کو دوبارہ استعمال کرنے کے طریقے:"
                          : wasteType === "crop"
                            ? "فصل کے کچرے کو دوبارہ استعمال کریں:"
                            : "خراب سبزیوں کو دوبارہ استعمال کریں:"}
                      </p>
                      {recommendations.map((rec, idx) => (
                        <div
                          key={idx}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            selectedAction === rec
                              ? "bg-orange-100 border-orange-500"
                              : "bg-orange-50 border-orange-200 hover:bg-orange-100"
                          }`}
                          onClick={() => setSelectedAction(selectedAction === rec ? "" : rec)}
                        >
                          <p className="text-sm font-medium text-orange-900">{rec}</p>
                        </div>
                      ))}

                      {selectedAction && (
                        <div className="pt-4 space-y-2 border-t">
                          <p className="text-sm font-medium text-gray-700">منتخب شدہ عمل:</p>
                          <p className="text-orange-700 font-bold">{selectedAction}</p>

                          <div className="flex gap-2 pt-4">
                            <Button
                              onClick={() => handleSaveWaste()}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                              بعد میں محفوظ کریں
                            </Button>
                            <Button
                              onClick={() => setShowModal({ isOpen: true, action: "marketplace" })}
                              className="flex-1 bg-blue-600 hover:bg-blue-700"
                            >
                              مارکیٹ میں بھیجیں
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">مشورہ لینے کے لیے اوپر "مشورہ لیں" بٹن دبائیں</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* My Records Tab */}
          <TabsContent value="my-list">
            {wastes.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8 text-gray-500">کوئی ریکارڈ نہیں</CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>آپ کے فضلہ کے ریکارڈ</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {wastes.map((waste) => (
                      <div key={waste.waste_id} className="border-b pb-3 flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-800">
                            {wasteOptions.find((o) => o.value === waste.waste_type)?.labelUrdu}
                          </p>
                          <p className="text-sm text-gray-600">{waste.quantity_kg} کلوگرام</p>
                          <p className="text-xs text-orange-600 font-medium mt-1">{waste.reused_as}</p>
                        </div>
                        <div className="flex gap-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              waste.is_sold ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                            }`}
                          >
                            {waste.is_sold ? "مارکیٹ میں" : "محفوظ"}
                          </span>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteWaste(waste.waste_id)}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Marketplace Tab */}
          <TabsContent value="marketplace">
            <div>
              <h2 className="text-xl font-bold mb-4">دستیاب فضلہ (مارکیٹ میں)</h2>
              {marketplaceWastes.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8 text-gray-500">کوئی فضلہ دستیاب نہیں</CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {marketplaceWastes.map((waste) => (
                    <Card key={waste.waste_id}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-bold text-lg">
                              {wasteOptions.find((o) => o.value === waste.waste_type)?.labelUrdu}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">{waste.suggested_use}</p>
                          </div>
                          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            مارکیٹ میں دستیاب ✓
                          </span>
                        </div>
                        <div className="space-y-2 mt-4">
                          <div className="flex justify-between">
                            <span className="text-gray-600">مقدار:</span>
                            <span className="font-medium">{waste.quantity_kg} کلوگرام</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">تاریخ:</span>
                            <span className="font-medium">
                              {new Date(waste.created_at).toLocaleDateString("ur-PK")}
                            </span>
                          </div>
                        </div>
                        <Button className="w-full mt-4 bg-orange-600 hover:bg-orange-700">خریدیں</Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Marketplace Confirmation Modal */}
      <ConfirmationModal
        isOpen={showModal.isOpen}
        title="مارکیٹ میں بھیجیں؟"
        message="کیا آپ یہ فضلہ مارکیٹ میں بھیجنا چاہتے ہیں تاکہ دوسرے اسے خرید سکیں؟"
        confirmText="جی ہاں"
        cancelText="نہیں"
        onConfirm={() => handleSendToMarketplace()}
        onCancel={() => setShowModal({ isOpen: false, action: "" })}
      />
    </div>
  )
}
