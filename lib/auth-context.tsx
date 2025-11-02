"use client";

import type React from "react";
import { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "./supabase/client";

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  language_preference: string;
  location_lat?: number;
  location_long?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (fullName: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("agriverse_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // 🔑 LOGIN
  const login = async (email: string, password: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .eq("password", password)
        .maybeSingle();

      if (error || !data) {
        return { success: false, error: "Invalid email or password" };
      }

      const userData: User = {
        id: data.id,
        full_name: data.full_name,
        email: data.email,
        role: data.role,
        language_preference: data.language_preference,
        location_lat: data.location_lat,
        location_long: data.location_long,
      };

      setUser(userData);
      localStorage.setItem("agriverse_user", JSON.stringify(userData));
      return { success: true };
    } catch (err) {
      console.error("Login error:", err);
      return { success: false, error: "An error occurred during login" };
    }
  };

  // 📝 SIGNUP
  const signup = async (fullName: string, email: string, password: string) => {
    try {
      const supabase = createClient();

      // 👇 Insert user record
      const { data, error } = await supabase
        .from("users")
        .insert([
          {
            full_name: fullName,
            email,
            password,
            role: "farmer",
            language_preference: "ur",
          },
        ])
        .select("*");

      if (error || !data || data.length === 0) {
        console.error("Signup error:", error);
        return { success: false, error: error?.message || "Failed to create account" };
      }

      const userData: User = {
        id: data[0].id,
        full_name: data[0].full_name,
        email: data[0].email,
        role: data[0].role,
        language_preference: data[0].language_preference,
      };

      setUser(userData);
      localStorage.setItem("agriverse_user", JSON.stringify(userData));

      return { success: true };
    } catch (err) {
      console.error("Signup exception:", err);
      return { success: false, error: "An error occurred during signup" };
    }
  };

  // 🚪 LOGOUT
  const logout = () => {
    setUser(null);
    localStorage.removeItem("agriverse_user");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
