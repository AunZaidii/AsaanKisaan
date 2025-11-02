"use client";

import "./globals.css";
import { AuthProvider } from "@/app/lib/auth-context";
import { ToastProvider } from "@/components/toast-provider";
import RoleRedirector from "@/app/lib/role-redirector";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>
            {/* ✅ Role redirector only once, globally */}
            <RoleRedirector />
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
