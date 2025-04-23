import React, { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  timezone: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  createOrFetchProfile: (user: User) => Promise<void>;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  signIn: async () => {},
  signInWithGoogle: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  createOrFetchProfile: async () => {},
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  console.log("AuthProvider initialized");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    console.log("AuthProvider useEffect triggered");
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        createOrFetchProfile(session.user);
      }
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function createOrFetchProfile(user: User) {
    try {
      console.log("Creating or fetching profile for user:", user);
      // First try to fetch existing profile
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      console.log("Existing profile data:", existingProfile);
      if (existingProfile) {
        setProfile(existingProfile);
      } else {
        console.log("Profile not found, creating a new one...");
        // Profile doesn't exist, create it
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert([
            {
              id: user.id,
              user_id: user.id,
              email: user.email,
              name: user.user_metadata.full_name || user.email,
              avatar_url: user.user_metadata.avatar_url,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
          ])
          .select()
          .single();

        if (insertError) throw insertError;
        setProfile(newProfile);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error handling profile:", error);
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message === "Invalid login credentials") {
          throw new Error("Invalid email or password");
        }
        throw error;
      }

      navigate("/", { replace: true });
    } catch (error: any) {
      console.error("Sign in error:", error);
      throw error;
    }
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  async function signUp(email: string, password: string) {
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!data.user) throw new Error("User creation failed");
    } catch (error: any) {
      console.error("Signup error:", error);
      throw new Error(error.message || "Failed to create account");
    }
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/auth/login", { replace: true });
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  }

  const value = {
    user,
    profile,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    createOrFetchProfile,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
