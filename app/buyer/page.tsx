
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/auth-context";
import { createClient } from "@/app/lib/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MapPin, ShoppingCart, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/toast-provider";
import "leaflet/dist/leaflet.css";

// ✅ Leaflet dynamic imports (for map)
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });

import { useMapEvents, useMap } from "react-leaflet";

// ✅ Fix leaflet icons (Next.js issue)
let L: any;
if (typeof window !== "undefined") {
  const L = require("leaflet");
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "/leaflet/marker-icon-2x.png",
    iconUrl: "/leaflet/marker-icon.png",
    shadowUrl: "/leaflet/marker-shadow.png",
  });
}
export default function BuyerDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState("market");
  const [products, setProducts] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [mapModal, setMapModal] = useState<{ isOpen: boolean; lat?: number; lng?: number; name?: string }>({ isOpen: false });

  // ✅ Redirect non-buyers
  useEffect(() => {
    if (!loading && user?.role !== "buyer") router.push("/dashboard");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchPurchases();
    }
  }, [user]);

  // ✅ Fetch listed products from godowns
  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("storage_requests")
      .select("*, godowns(name, city, address, phone, location_latitude, location_longitude)")
      .eq("status", "approved")
      .eq("is_sold", false)
      .order("created_at", { ascending: false });

    if (error) addToast("خرابی: " + error.message, "error");
    else setProducts(data || []);
  };

  // ✅ Fetch buyer’s purchased products
  const fetchPurchases = async () => {
    const { data, error } = await supabase
      .from("storage_requests")
      .select("*, godowns(name, city, address, phone)")
      .eq("buyer_id", user?.id)
      .order("created_at", { ascending: false });

    if (error) addToast("خرابی: " + error.message, "error");
    else setPurchases(data || []);
  };

  // ✅ Handle buying a product
  const handleBuy = async (p: any) => {
    const { error } = await supabase
      .from("storage_requests")
      .update({ is_sold: true, buyer_id: user?.id, status: "sold" })
      .eq("request_id", p.request_id);

    if (error) addToast("خرابی: " + error.message, "error");
    else {
      addToast("خریداری کامیاب رہی ✓", "success");
      fetchProducts();
      fetchPurchases();
    }
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50">
      <header className="border-b bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-green-700">خریدار ڈیش بورڈ (Buyer Dashboard)</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="market">مارکیٹ پلیس</TabsTrigger>
            <TabsTrigger value="purchases">میری خریداری</TabsTrigger>
          </TabsList>

          {/* 🛒 Market Tab */}
          <TabsContent value="market">
            <div className="flex gap-3 mb-4">
              <Input
                placeholder="شہر یا پروڈکٹ تلاش کریں..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button onClick={fetchProducts}>تازہ کریں</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products
                .filter(
                  (p) =>
                    p.godowns.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.product_name.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((p) => (
                  <Card key={p.request_id} className="shadow-md border border-green-100">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-green-700 flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-green-600" /> {p.product_name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <p>شہر: {p.godowns.city}</p>
                      <p>گودام: {p.godowns.name}</p>
                      <p>مقدار: {p.quantity_kg} کلوگرام</p>
                      <p>قیمت: {p.price_per_kg} روپے / کلو</p>
                      <p>فون نمبر: {p.godowns.phone || "نامعلوم"}</p>
                      <p>پتہ: {p.godowns.address}</p>

                      <div className="flex gap-2 mt-2">
                        <Button
                          onClick={() =>
                            setMapModal({
                              isOpen: true,
                              lat: p.godowns.location_latitude,
                              lng: p.godowns.location_longitude,
                              name: p.godowns.name,
                            })
                          }
                          className="bg-gray-600 hover:bg-gray-700"
                        >
                          <MapPin className="w-4 h-4 mr-2" /> مقام دیکھیں
                        </Button>
                        <Button
                          onClick={() => handleBuy(p)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          خریدیں
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>

          {/* 🧾 Purchases Tab */}
          <TabsContent value="purchases">
            <h2 className="text-xl font-bold mb-4 text-green-700">میری خریداری</h2>
            {purchases.length === 0 ? (
              <p>آپ نے ابھی تک کوئی خریداری نہیں کی۔</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {purchases.map((p) => (
                  <Card key={p.request_id} className="border border-green-100 shadow-sm">
                    <CardHeader>
                      <CardTitle>{p.product_name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>شہر: {p.godowns.city}</p>
                      <p>گودام: {p.godowns.name}</p>
                      <p>مقدار: {p.quantity_kg} کلوگرام</p>
                      <p>قیمت: {p.price_per_kg} روپے / کلو</p>
                      <p>فون نمبر: {p.godowns.phone}</p>
                      <p>اسٹیٹس: {p.status}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* 🌍 Map Modal */}
      {mapModal.isOpen && mapModal.lat && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[2000]">
          <div className="bg-white rounded-lg p-4 w-[90%] md:w-[600px] h-[500px] relative">
            <Button
              className="absolute top-2 right-2 z-[2001]"
              variant="outline"
              onClick={() => setMapModal({ isOpen: false })}
            >
              بند کریں
            </Button>
            <h2 className="text-lg font-bold mb-2">{mapModal.name}</h2>
            <MapContainer center={[mapModal.lat!, mapModal.lng!]} zoom={13} className="h-full w-full rounded-lg">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="© OpenStreetMap"
              />
              <Marker position={[mapModal.lat!, mapModal.lng!]} />
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
}
