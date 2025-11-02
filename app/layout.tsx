"use client";

import "./globals.css";
import { AuthProvider } from "@/app/lib/auth-context";
import RoleRedirector from "@/app/lib/role-redirector";
import { ToastProvider } from "@/components/toast-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>
            <RoleRedirector />
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
