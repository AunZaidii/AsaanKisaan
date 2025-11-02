"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Truck, Trash2, Brain, Users, ShoppingCart } from "lucide-react"
import { ConfirmationModal } from "@/components/confirmation-modal"
import { useToast } from "@/components/toast-provider"

export default function DashboardPage() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const { addToast } = useToast()
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">لوڈ ہو رہا ہے...</div>
  }

  if (!user) return null

  const handleLogout = () => {
    logout()
    setShowLogoutModal(false)
    addToast("خدا حافظ!", "success")
    router.push("/login")
  }

  const modules = [
    {
      id: "farmgpt",
      titleUrdu: "فارم جی پی ٹی",
      titleEn: "FarmGPT AI",
      descUrdu: "کسانی سوالات کا جواب پائیں",
      icon: Brain,
      href: "/farmgpt",
      color: "from-green-400 to-green-600",
    },
    {
      id: "resources",
      titleUrdu: "اوزار و ٹرک شیئرنگ",
      titleEn: "Resources & Truck Pooling",
      descUrdu: "اوزار اور ٹرک کرائے پر لیں یا دیں",
      icon: Truck,
      href: "/resources",
      color: "from-blue-400 to-blue-600",
    },
    {
      id: "waste",
      titleUrdu: "فضلہ مینجمنٹ",
      titleEn: "Waste Converter",
      descUrdu: "فضلے کو دوبارہ استعمال کریں",
      icon: Trash2,
      href: "/waste",
      color: "from-orange-400 to-red-600",
    },
    {
      id: "cooperative",
      titleUrdu: "کسان گروپ منصوبہ",
      titleEn: "Cooperative Planner",
      descUrdu: "کسانوں کے ساتھ مل کر کام کریں",
      icon: Users,
      href: "/cooperative",
      color: "from-purple-400 to-purple-600",
    },
    {
      id: "warechain",
      titleUrdu: "ایگری لنک مارکیٹ",
      titleEn: "WareChain Marketplace",
      descUrdu: "اپنی پیداوار اسٹور اور بیچیں",
      icon: ShoppingCart,
      href: "/storage",
      color: "from-pink-400 to-pink-600",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-green-700">ایگری ورس</h1>
            <p className="text-gray-600">خوش آمدید، {user.full_name}</p>
          </div>
          <Button
            onClick={() => setShowLogoutModal(true)}
            variant="outline"
            className="border-red-600 text-red-600 hover:bg-red-50"
          >
            لاگ آؤٹ کریں
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">کسان کا ڈیش بورڈ</h2>
          <p className="text-gray-600">اپنی زراعت کو بہتر بنانے کے لیے ابھی شروع کریں</p>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => {
            const Icon = module.icon
            return (
              <Link key={module.id} href={module.href}>
                <Card className="h-full cursor-pointer hover:shadow-lg transition-shadow border-0">
                  <CardHeader className={`bg-gradient-to-r ${module.color} text-white`}>
                    <div className="flex items-center gap-3">
                      <Icon className="w-8 h-8" />
                      <CardTitle>{module.titleUrdu}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-gray-600">{module.descUrdu}</p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        isOpen={showLogoutModal}
        title="لاگ آؤٹ کریں؟"
        message="کیا آپ واقعی لاگ آؤٹ کرنا چاہتے ہیں؟"
        confirmText="جی ہاں"
        cancelText="نہیں"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
        isDangerous
      />
    </div>
  )
}
