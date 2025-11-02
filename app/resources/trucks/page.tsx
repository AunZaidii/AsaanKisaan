"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { ArrowLeft, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/components/toast-provider";

interface Truck {
  truck_id: string;
  driver_name: string;
  owner_id: string;
  route_from: string;
  route_to: string;
  available_capacity_kg: number;
  cost_per_km: number;
  availability: "available" | "on_trip" | "unavailable";
}

interface TruckBooking {
  booking_id: string;
  truck_id: string;
  renter_id: string;
  start_date: string;
  end_date: string;
  estimated_km: number;
  total_cost: number;
  payment_status: string;
  truck_route?: string;
}

export default function TrucksPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useToast();

  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [bookings, setBookings] = useState<TruckBooking[]>([]);
  const [activeTab, setActiveTab] = useState("list");

  // Add Truck form
  const [driverName, setDriverName] = useState("");
  const [routeFrom, setRouteFrom] = useState("");
  const [routeTo, setRouteTo] = useState("");
  const [capacity, setCapacity] = useState("");
  const [costPerKm, setCostPerKm] = useState("");

  // Edit modal
  const [editModal, setEditModal] = useState<{ isOpen: boolean; item: Truck | null }>({
    isOpen: false,
    item: null,
  });

  // Booking modal
  const [bookingModal, setBookingModal] = useState<{
    isOpen: boolean;
    item: Truck | null;
    startDate: string;
    endDate: string;
    estimatedKm: string;
  }>({
    isOpen: false,
    item: null,
    startDate: "",
    endDate: "",
    estimatedKm: "",
  });

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    const [trucksRes, bookingsRes] = await Promise.all([
      supabase.from("trucks").select("*"),
      supabase
        .from("truck_bookings")
        .select("*")
        .eq("renter_id", user?.id)
        .neq("payment_status", "cancelled"),
    ]);

    if (trucksRes.data) setTrucks(trucksRes.data);

    if (bookingsRes.data && trucksRes.data) {
      const enriched = bookingsRes.data.map((b: TruckBooking) => ({
        ...b,
        truck_route: (() => {
          const t = trucksRes.data!.find((x: Truck) => x.truck_id === b.truck_id);
          return t ? `${t.route_from} → ${t.route_to}` : "";
        })(),
      }));
      setBookings(enriched);
    }
  };

  const handleAddTruck = async () => {
    if (!driverName || !routeFrom || !routeTo || !capacity || !costPerKm) {
      addToast("براہ کرم تمام معلومات بھریں", "error");
      return;
    }

    const { error } = await supabase.from("trucks").insert({
      driver_name: driverName,
      owner_id: user?.id,
      route_from: routeFrom,
      route_to: routeTo,
      available_capacity_kg: Number(capacity),
      cost_per_km: Number(costPerKm),
      availability: "available",
    });

    if (error) {
      addToast("خرابی: " + error.message, "error");
      return;
    }

    setDriverName("");
    setRouteFrom("");
    setRouteTo("");
    setCapacity("");
    setCostPerKm("");
    addToast("ٹرک کامیابی سے شامل ہو گیا ✓", "success");
    setActiveTab("list");
    fetchData();
  };

  const handleEditSave = async () => {
    if (!editModal.item) return;
    const t = editModal.item;

    const { error } = await supabase
      .from("trucks")
      .update({
        driver_name: t.driver_name,
        route_from: t.route_from,
        route_to: t.route_to,
        available_capacity_kg: t.available_capacity_kg,
        cost_per_km: t.cost_per_km,
        availability: t.availability,
      })
      .eq("truck_id", t.truck_id);

    if (error) {
      addToast("خرابی: " + error.message, "error");
      return;
    }

    addToast("تفصیلات محفوظ ہو گئیں ✓", "success");
    setEditModal({ isOpen: false, item: null });
    fetchData();
  };

  const handleDeleteTruck = async (truckId: string) => {
    const { error } = await supabase.from("trucks").delete().eq("truck_id", truckId);
    if (error) {
      addToast("خرابی: " + error.message, "error");
      return;
    }
    addToast("ٹرک ہٹا دیا گیا ✓", "success");
    fetchData();
  };

  const handleOpenBooking = (truck: Truck) => {
    setBookingModal({
      isOpen: true,
      item: truck,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      estimatedKm: "",
    });
  };

  const handleConfirmBooking = async () => {
    const { item, startDate, endDate, estimatedKm } = bookingModal;
    if (!item || !startDate || !endDate || !estimatedKm) {
      addToast("براہ کرم تمام معلومات درج کریں", "error");
      return;
    }
    const totalCost = Number(estimatedKm) * Number(item.cost_per_km);

    const { error } = await supabase.from("truck_bookings").insert({
      truck_id: item.truck_id,
      renter_id: user?.id,
      start_date: new Date(startDate).toISOString(),
      end_date: new Date(endDate).toISOString(),
      estimated_km: Number(estimatedKm),
      total_cost: totalCost,
      payment_status: "pending",
    });

    if (error) {
      addToast("خرابی: " + error.message, "error");
      return;
    }

    await supabase.from("trucks").update({ availability: "on_trip" }).eq("truck_id", item.truck_id);

    addToast("ٹرک بک ہو گیا ✓", "success");
    setBookingModal({ isOpen: false, item: null, startDate: "", endDate: "", estimatedKm: "" });
    fetchData();
  };

  const handleCancelBooking = async (bk: TruckBooking) => {
    const { error } = await supabase
      .from("truck_bookings")
      .update({ payment_status: "cancelled" })
      .eq("booking_id", bk.booking_id);

    if (error) {
      addToast("خرابی: " + error.message, "error");
      return;
    }

    await supabase.from("trucks").update({ availability: "available" }).eq("truck_id", bk.truck_id);
    addToast("بکنگ منسوخ کر دی گئی ✓", "success");
    fetchData();
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="border-b bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/resources">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-emerald-700">ٹرک شیئرنگ</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="list">ٹرک</TabsTrigger>
            <TabsTrigger value="add">ٹرک شامل کریں</TabsTrigger>
            <TabsTrigger value="bookings">میری بکنگز</TabsTrigger>
          </TabsList>

          {/* LIST */}
          <TabsContent value="list">
            <h2 className="text-xl font-bold mb-4">دستیاب ٹرک</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trucks.map((truck) => (
                <Card key={truck.truck_id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">
                        {truck.route_from} → {truck.route_to}
                      </CardTitle>
                      {truck.owner_id === user?.id && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setEditModal({ isOpen: true, item: truck })}>
                            <Pencil className="w-4 h-4 text-emerald-600" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteTruck(truck.truck_id)}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-gray-700">ڈرائیور: {truck.driver_name}</p>
                    <p className="text-sm text-gray-500">
                      گنجائش: {truck.available_capacity_kg} کلوگرام | فی کلومیٹر: {truck.cost_per_km} روپے
                    </p>
                    <Button
                      disabled={truck.owner_id === user?.id || truck.availability !== "available"}
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleOpenBooking(truck)}
                    >
                      بک کریں
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ADD */}
          <TabsContent value="add">
            <Card>
              <CardHeader>
                <CardTitle>نیا ٹرک شامل کریں</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>ڈرائیور کا نام</Label>
                    <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} />
                  </div>
                  <div>
                    <Label>کہاں سے؟</Label>
                    <Input value={routeFrom} onChange={(e) => setRouteFrom(e.target.value)} />
                  </div>
                  <div>
                    <Label>کہاں تک؟</Label>
                    <Input value={routeTo} onChange={(e) => setRouteTo(e.target.value)} />
                  </div>
                  <div>
                    <Label>گنجائش (کلوگرام)</Label>
                    <Input
                      type="number"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>فی کلومیٹر لاگت (روپے)</Label>
                    <Input
                      type="number"
                      value={costPerKm}
                      onChange={(e) => setCostPerKm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddTruck} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                    شامل کریں
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setActiveTab("list")}>
                    منسوخ کریں
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BOOKINGS */}
          <TabsContent value="bookings">
            <h2 className="text-xl font-bold mb-4">میری ٹرک بکنگز</h2>
            {bookings.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">کوئی بکنگ نہیں ملی</CardContent>
              </Card>
            ) : (
              bookings.map((b) => (
                <Card key={b.booking_id} className="mb-3">
                  <CardHeader>
                    <CardTitle>{b.truck_route}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>آغاز: {new Date(b.start_date).toLocaleDateString("ur-PK")}</p>
                    <p>اختتام: {new Date(b.end_date).toLocaleDateString("ur-PK")}</p>
                    <p>فاصلہ: {b.estimated_km} کلومیٹر</p>
                    <p>کل لاگت: {b.total_cost} روپے</p>
                    <p>ادائیگی: {b.payment_status}</p>
                    <Button
                      className="mt-3"
                      variant="outline"
                      onClick={() => handleCancelBooking(b)}
                    >
                      منسوخ کریں
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* EDIT MODAL */}
      {editModal.isOpen && editModal.item && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000]">
          <div className="bg-white rounded-lg w-[95%] max-w-2xl p-4 space-y-4">
            <h3 className="text-lg font-semibold">ٹرک میں ترمیم</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>ڈرائیور کا نام</Label>
                <Input
                  value={editModal.item.driver_name}
                  onChange={(e) =>
                    setEditModal((m) => m && ({ ...m, item: { ...m.item!, driver_name: e.target.value } }))
                  }
                />
              </div>
              <div>
                <Label>کہاں سے؟</Label>
                <Input
                  value={editModal.item.route_from}
                  onChange={(e) =>
                    setEditModal((m) => m && ({ ...m, item: { ...m.item!, route_from: e.target.value } }))
                  }
                />
              </div>
              <div>
                <Label>کہاں تک؟</Label>
                <Input
                  value={editModal.item.route_to}
                  onChange={(e) =>
                    setEditModal((m) => m && ({ ...m, item: { ...m.item!, route_to: e.target.value } }))
                  }
                />
              </div>
              <div>
                <Label>گنجائش</Label>
                <Input
                  type="number"
                  value={editModal.item.available_capacity_kg}
                  onChange={(e) =>
                    setEditModal((m) => m && ({
                      ...m,
                      item: { ...m.item!, available_capacity_kg: Number(e.target.value) },
                    }))
                  }
                />
              </div>
              <div>
                <Label>فی کلومیٹر لاگت</Label>
                <Input
                  type="number"
                  value={editModal.item.cost_per_km}
                  onChange={(e) =>
                    setEditModal((m) => m && ({
                      ...m,
                      item: { ...m.item!, cost_per_km: Number(e.target.value) },
                    }))
                  }
                />
              </div>
              <div>
                <Label>حالت</Label>
                <select
                  className="border rounded px-3 py-2 w-full"
                  value={editModal.item.availability}
                  onChange={(e) =>
                    setEditModal((m) => m && ({
                      ...m,
                      item: { ...m.item!, availability: e.target.value as Truck["availability"] },
                    }))
                  }
                >
                  <option value="available">دستیاب</option>
                  <option value="on_trip">سفر پر</option>
                  <option value="unavailable">غیر دستیاب</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditModal({ isOpen: false, item: null })}>
                منسوخ کریں
              </Button>
              <Button onClick={handleEditSave} className="bg-emerald-600 hover:bg-emerald-700">
                محفوظ کریں
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* BOOKING MODAL */}
      {bookingModal.isOpen && bookingModal.item && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000]">
          <div className="bg-white rounded-lg w-[95%] max-w-md p-4 space-y-4">
            <h3 className="text-lg font-semibold">ٹرک بک کریں</h3>
            <p className="text-sm text-gray-700">
              {bookingModal.item.route_from} → {bookingModal.item.route_to}
            </p>
            <div className="grid gap-3">
              <div>
                <Label>آغاز</Label>
                <Input
                  type="date"
                  value={bookingModal.startDate}
                  onChange={(e) => setBookingModal((m) => ({ ...m, startDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>اختتام</Label>
                <Input
                  type="date"
                  value={bookingModal.endDate}
                  onChange={(e) => setBookingModal((m) => ({ ...m, endDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>اندازاً فاصلے (کلومیٹر)</Label>
                <Input
                  type="number"
                  placeholder="مثلاً 120"
                  value={bookingModal.estimatedKm}
                  onChange={(e) => setBookingModal((m) => ({ ...m, estimatedKm: e.target.value }))}
                />
                {bookingModal.item && bookingModal.estimatedKm && (
                  <p className="text-xs text-gray-600 mt-1">
                    متوقع قیمت:{" "}
                    {Number(bookingModal.estimatedKm) * Number(bookingModal.item.cost_per_km)} روپے
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() =>
                  setBookingModal({ isOpen: false, item: null, startDate: "", endDate: "", estimatedKm: "" })
                }
              >
                منسوخ کریں
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleConfirmBooking}>
                تصدیق کریں
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
