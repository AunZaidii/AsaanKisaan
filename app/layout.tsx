import type React from "react"
import { AuthProvider } from "@/lib/auth-context"
import { ToastProvider } from "@/components/toast-provider"
import "./globals.css"

export const metadata = {
  title: "ایگری ورس - کسان ایپ",
  description: "کسانوں کو ذہین ٹیکنالوجی سے بہتر بنانا",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ur" dir="rtl">
      <body className="font-urdu">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
