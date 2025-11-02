"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/app/lib/client";
import { useAuth } from "@/app/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/toast-provider";
import { MapPin, ShoppingCart, Trash2, CreditCard } from "lucide-react";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });

export default function BuyerDashboard() {
  const supabase = createClient();
  const { user, loading } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [items, setItems] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [balance, setBalance] = useState<number>(10000); // demo money
  const [markerIcon, setMarkerIcon] = useState<any>(null);
  const [mapModal, setMapModal] = useState<{ isOpen: boolean; lat?: number; lng?: number; name?: string }>({ isOpen: false });
  const [activeTab, setActiveTab] = useState<"market" | "cart">("market");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const L = require("leaflet");
      const icon = new L.Icon({
        iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });
      setMarkerIcon(icon);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user && user.role !== "buyer") router.push("/dashboard");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) fetchItems();
  }, [user]);

  // 🧾 Fetch from Supabase
  const fetchItems = async () => {
    const { data, error } = await supabase.from("marketplace_items").select("*").order("created_at", { ascending: false });
    if (error) addToast("خرابی: " + error.message, "error");
    else setItems(data || []);
  };

  // ➕ Add to cart (frontend only)
  const handleAddToCart = (item: any, quantity: number) => {
    if (quantity < 20) {
      addToast("کم از کم 20 کلوگرام خریدنا ضروری ہے۔", "error");
      return;
    }

    if (quantity > item.quantity_kg) {
      addToast("زیادہ مقدار دستیاب نہیں ہے۔", "error");
      return;
    }

    const existing = cart.find((c) => c.item_id === item.item_id);
    if (existing) {
      existing.quantity += quantity;
      setCart([...cart]);
    } else {
      setCart([...cart, { ...item, quantity }]);
    }

    // UI-only decrease
    setItems((prev) =>
      prev.map((i) =>
        i.item_id === item.item_id
          ? { ...i, quantity_kg: i.quantity_kg - quantity }
          : i
      )
    );

    addToast("پروڈکٹ کارٹ میں شامل کر دیا گیا ✓", "success");
  };

  // ❌ Remove item
  const handleRemove = (item_id: any) => {
    const item = cart.find((c) => c.item_id === item_id);
    if (!item) return;
    setItems((prev) =>
      prev.map((i) =>
        i.item_id === item_id
          ? { ...i, quantity_kg: i.quantity_kg + item.quantity }
          : i
      )
    );
    setCart(cart.filter((c) => c.item_id !== item_id));
    addToast("کارٹ سے نکال دیا گیا ✓", "info");
  };

  // 💳 Fake checkout
  const handleCheckout = () => {
    const total = cart.reduce((sum, c) => sum + c.price_per_kg * c.quantity, 0);
    if (total > balance) {
      addToast("ناکافی رقم!", "error");
      return;
    }

    setBalance(balance - total);
    setItems((prev) => prev.filter((i) => i.quantity_kg > 0));
    setCart([]);
    addToast("خریداری مکمل ✓ (Demo)", "success");
  };

  if (loading || !user) return null;

  const totalPrice = cart.reduce((sum, c) => sum + c.price_per_kg * c.quantity, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="border-b bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-700">🛍️ خریدار ڈیش بورڈ </h1>
          <div className="flex gap-4 items-center">
            <p className="text-gray-700 font-semibold">Balance: Rs. {balance.toLocaleString()}</p>
            <Button
              variant="outline"
              onClick={() => setActiveTab(activeTab === "market" ? "cart" : "market")}
            >
              {activeTab === "market" ? (
                <>
                  <ShoppingCart className="w-4 h-4 mr-2" /> View Cart ({cart.length})
                </>
              ) : (
                "← Back to Market"
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === "market" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.length === 0 ? (
              <p>Loading products...</p>
            ) : (
              items.map((item) => (
                <Card
                  key={item.item_id}
                  className={item.quantity_kg <= 0 ? "opacity-50" : ""}
                >
                  <CardHeader>
                    <CardTitle>{item.product_name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>🏙️ شہر: {item.city}</p>
                    <p>📦 مقدار: {item.quantity_kg} کلوگرام</p>
                    <p>💸 قیمت: Rs.{item.price_per_kg} /kg</p>
                    {item.quantity_kg > 0 ? (
                      <div className="flex flex-col gap-2 mt-3">
                        <input
                          type="number"
                          min="20"
                          max={item.quantity_kg}
                          placeholder="Enter quantity (kg)"
                          className="border rounded px-2 py-1 text-sm"
                          id={`qty-${item.item_id}`}
                        />
                        <Button
                          className="bg-gray-600 hover:bg-gray-700"
                          onClick={() =>
                            setMapModal({
                              isOpen: true,
                              lat: item.location_latitude,
                              lng: item.location_longitude,
                              name: item.city,
                            })
                          }
                        >
                          <MapPin className="w-4 h-4 mr-2" /> مقام دیکھیں
                        </Button>
                        <Button
                          className="bg-green-700 hover:bg-green-800"
                          onClick={() => {
                            const qty = parseFloat(
                              (document.getElementById(`qty-${item.item_id}`) as HTMLInputElement)?.value || "0"
                            );
                            handleAddToCart(item, qty);
                          }}
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" /> Add to Cart
                        </Button>
                      </div>
                    ) : (
                      <p className="text-red-600 font-semibold mt-3">SOLD OUT</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-4">🛒 میری خریداری</h2>
            {cart.length === 0 ? (
              <p>آپ کا کارٹ خالی ہے۔</p>
            ) : (
              <>
                {cart.map((c) => (
                  <Card key={c.item_id} className="mb-3">
                    <CardHeader>
                      <CardTitle>{c.product_name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>مقدار: {c.quantity} کلوگرام</p>
                      <p>قیمت: Rs.{c.price_per_kg} /kg</p>
                      <p>کل: Rs.{c.price_per_kg * c.quantity}</p>
                      <Button
                        className="bg-red-600 hover:bg-red-700 mt-2"
                        onClick={() => handleRemove(c.item_id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> ہٹائیں
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                <div className="text-right mt-6">
                  <p className="text-lg font-semibold mb-2">Total: Rs.{totalPrice.toLocaleString()}</p>
                  <Button
                    className="bg-blue-700 hover:bg-blue-800"
                    onClick={handleCheckout}
                    disabled={cart.length === 0}
                  >
                    <CreditCard className="w-4 h-4 mr-2" /> Checkout
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* Map Modal */}
      {mapModal.isOpen && mapModal.lat && markerIcon && (
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
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
              <Marker position={[mapModal.lat!, mapModal.lng!]} icon={markerIcon} />
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
}
