"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import { ConfirmationModal } from "@/components/confirmation-modal"
import { useToast } from "@/components/toast-provider"

interface StorageItem {
  item_id: string
  product_name: string
  quantity_kg: number
  price_per_kg: number
  city: string
  farmer_id: string
  created_at: string
}

interface SalesOrder {
  order_id: string
  buyer_id: string
  item_id: string
  quantity_kg: number
  total_price: number
  payment_status: string
  order_date: string
}

export default function WareChainPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const { addToast } = useToast()

  const [items, setItems] = useState<StorageItem[]>([])
  const [allItems, setAllItems] = useState<StorageItem[]>([])
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [productName, setProductName] = useState("")
  const [quantity, setQuantity] = useState("")
  const [price, setPrice] = useState("")
  const [city, setCity] = useState("")
  const [totalSales, setTotalSales] = useState(0)
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; itemId: string }>({
    isOpen: false,
    itemId: "",
  })

  useEffect(() => {
    if (!loading && !user) router.push("/login")
  }, [user, loading, router])

  useEffect(() => {
    if (user) fetchData()
  }, [user])

  const fetchData = async () => {
    const [itemsRes, allItemsRes, ordersRes] = await Promise.all([
      supabase.from("storage_items").select("*").eq("farmer_id", user?.id),
      supabase.from("storage_items").select("*"),
      supabase.from("sales_orders").select("*").eq("buyer_id", user?.id),
    ])

    if (itemsRes.data) {
      setItems(itemsRes.data)
      const total = itemsRes.data.reduce(
        (sum: number, item: StorageItem) => sum + item.quantity_kg * item.price_per_kg,
        0,
      )
      setTotalSales(total)
    }

    if (allItemsRes.data) {
      // Filter out user's own items from marketplace view
      setAllItems(allItemsRes.data.filter((item: StorageItem) => item.farmer_id !== user?.id))
    }

    if (ordersRes.data) setOrders(ordersRes.data)
  }

  const handleAddItem = async () => {
    if (!productName || !quantity || !price || !city) {
      addToast("براہ کرم تمام معلومات بھریں", "error")
      return
    }

    const { error } = await supabase.from("storage_items").insert({
      farmer_id: user?.id,
      product_name: productName,
      quantity_kg: Number.parseFloat(quantity),
      price_per_kg: Number.parseFloat(price),
      city,
      created_at: new Date().toISOString(),
    })

    if (error) {
      addToast("خرابی: " + error.message, "error")
      return
    }

    setProductName("")
    setQuantity("")
    setPrice("")
    setCity("")
    addToast("مال اسٹور میں شامل ہو گیا ✓", "success")
    fetchData()
  }

  const handleDeleteItem = async (itemId: string) => {
    const { error } = await supabase.from("storage_items").delete().eq("item_id", itemId)

    if (error) {
      addToast("خرابی: " + error.message, "error")
      return
    }

    addToast("مال ہٹایا گیا", "success")
    setConfirmModal({ isOpen: false, itemId: "" })
    fetchData()
  }

  const handleBuyItem = async (item: StorageItem) => {
    const { error } = await supabase.from("sales_orders").insert({
      buyer_id: user?.id,
      item_id: item.item_id,
      quantity_kg: item.quantity_kg,
      total_price: item.quantity_kg * item.price_per_kg,
      payment_status: "pending",
      order_date: new Date().toISOString(),
    })

    if (error) {
      addToast("خرابی: " + error.message, "error")
      return
    }

    addToast("خریداری کی درخواست بھیج دی گئی ✓", "success")
    fetchData()
  }

  if (loading || !user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="border-b bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-pink-700">ایگری لنک مارکیٹ</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Tabs defaultValue="store" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 text-right">
            <TabsTrigger value="store">میرا مال</TabsTrigger>
            <TabsTrigger value="market">خرید و فروخت</TabsTrigger>
            <TabsTrigger value="account">میرا حساب</TabsTrigger>
          </TabsList>

          {/* Store Produce Tab */}
          <TabsContent value="store">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-right">
                    <Plus className="w-4 h-4" />
                    نیا مال اسٹور میں شامل کریں
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>مصنوع کا نام</Label>
                      <Input
                        placeholder="مثال: گندم"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        className="text-right"
                      />
                    </div>
                    <div>
                      <Label>مقدار (کلوگرام)</Label>
                      <Input
                        type="number"
                        placeholder="1000"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="text-right"
                      />
                    </div>
                    <div>
                      <Label>فی کلوگرام قیمت (روپے)</Label>
                      <Input
                        type="number"
                        placeholder="50"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="text-right"
                      />
                    </div>
                    <div>
                      <Label>شہر</Label>
                      <Input
                        placeholder="مثال: لاہور"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="text-right"
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddItem} className="w-full bg-pink-600 hover:bg-pink-700">
                    اسٹور میں شامل کریں
                  </Button>
                </CardContent>
              </Card>

              {/* My Storage Items */}
              {items.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold mb-4">میرا ذخیرہ</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {items.map((item) => (
                      <Card key={item.item_id}>
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 text-right">
                              <h3 className="font-bold text-lg">{item.product_name}</h3>
                              <p className="text-sm text-gray-600 mt-1">{item.city}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setConfirmModal({ isOpen: true, itemId: item.item_id })}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-600">مقدار:</span>
                              <span className="font-medium">{item.quantity_kg} کلوگرام</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">قیمت:</span>
                              <span className="font-bold">{item.price_per_kg} روپے/کلوگرام</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t">
                              <span className="text-gray-600">کل قیمت:</span>
                              <span className="font-bold text-pink-600">
                                {(item.quantity_kg * item.price_per_kg).toFixed(0)} روپے
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Marketplace Tab */}
          <TabsContent value="market">
            <h2 className="text-xl font-bold mb-4">دستیاب مصنوعات</h2>
            {allItems.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8 text-gray-500">ابھی کوئی مصنوع دستیاب نہیں۔</CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allItems.map((item) => (
                  <Card key={item.item_id}>
                    <CardContent className="pt-6">
                      <h3 className="font-bold text-lg text-right">{item.product_name}</h3>
                      <p className="text-sm text-gray-600 text-right mt-1">{item.city}</p>
                      <div className="mt-3 space-y-2 text-right">
                        <div className="flex justify-between">
                          <span className="text-gray-600">مقدار:</span>
                          <span className="font-medium">{item.quantity_kg} کلوگرام</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">قیمت:</span>
                          <span className="font-bold">{item.price_per_kg} روپے/کلوگرام</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <span className="text-gray-600">کل:</span>
                          <span className="font-bold text-pink-600">
                            {(item.quantity_kg * item.price_per_kg).toFixed(0)} روپے
                          </span>
                        </div>
                      </div>
                      <Button onClick={() => handleBuyItem(item)} className="w-full mt-4 bg-pink-600 hover:bg-pink-700">
                        خریدیں
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Account Summary Tab */}
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle className="text-right">حساب کا خلاصہ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-pink-50 p-4 rounded border-2 border-pink-200 text-right">
                    <p className="text-sm text-gray-600">کل مصنوعات</p>
                    <p className="text-3xl font-bold text-pink-600">{items.length}</p>
                  </div>
                  <div className="bg-pink-50 p-4 rounded border-2 border-pink-200 text-right">
                    <p className="text-sm text-gray-600">کل مقدار</p>
                    <p className="text-3xl font-bold text-pink-600">
                      {items.reduce((sum, item) => sum + item.quantity_kg, 0).toFixed(0)} کلوگرام
                    </p>
                  </div>
                  <div className="bg-pink-50 p-4 rounded border-2 border-pink-200 text-right">
                    <p className="text-sm text-gray-600">کل قیمت</p>
                    <p className="text-3xl font-bold text-pink-600">{totalSales.toFixed(0)} روپے</p>
                  </div>
                </div>

                {/* Recent Orders */}
                {orders.length > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="text-lg font-bold mb-4 text-right">حالیہ خریداریاں</h3>
                    <div className="space-y-3">
                      {orders.map((order) => (
                        <Card key={order.order_id} className="bg-gray-50">
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-start">
                              <div className="text-right flex-1">
                                <p className="font-medium">{order.quantity_kg} کلوگرام</p>
                                <p className="text-sm text-gray-600">
                                  {new Date(order.order_date).toLocaleDateString("ur-PK")}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-pink-600">{order.total_price} روپے</p>
                                <span
                                  className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${
                                    order.payment_status === "paid"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-yellow-100 text-yellow-800"
                                  }`}
                                >
                                  {order.payment_status === "paid" ? "ادا شدہ" : "زیر التوا"}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title="مال ہٹائیں؟"
        message="کیا آپ یقینی ہیں کہ آپ یہ مال ہٹانا چاہتے ہیں؟"
        confirmText="جی ہاں"
        cancelText="نہیں"
        onConfirm={() => handleDeleteItem(confirmModal.itemId)}
        onCancel={() => setConfirmModal({ isOpen: false, itemId: "" })}
      />
    </div>
  )
}
