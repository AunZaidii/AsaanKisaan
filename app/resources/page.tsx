"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Wrench, Truck } from "lucide-react";

export default function ResourcesHubPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="border-b bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-blue-700 text-right">وسائل کا مرکز</h1>
          <p className="text-right text-gray-600">یہاں سے اوزار یا ٹرک شیئرنگ منتخب کریں</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">اوزار شیئرنگ</CardTitle>
              <Wrench className="w-6 h-6 text-blue-600" />
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 text-right">
                اوزار دیکھیں، بک کریں، یا اپنا اوزار لسٹ کریں۔
              </p>
              <div className="flex justify-end">
                <Link href="/resources/tools">
                  <Button className="bg-blue-600 hover:bg-blue-700">جائیں</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">ٹرک شیئرنگ</CardTitle>
              <Truck className="w-6 h-6 text-emerald-600" />
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 text-right">
                ٹرک دیکھیں، بک کریں، یا اپنا ٹرک لسٹ کریں۔
              </p>
              <div className="flex justify-end">
                <Link href="/resources/trucks">
                  <Button className="bg-emerald-600 hover:bg-emerald-700">جائیں</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
