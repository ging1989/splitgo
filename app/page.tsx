"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      router.push("/trips");
    }
  };

  const login = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "http://localhost:3000",
      },
    });
  };

  return (
    <main className="min-h-screen flex items-center justify-center">
      <button
        onClick={login}
        className="bg-green-600 text-white px-6 py-3 rounded-lg"
      >
        Login with Google
      </button>
    </main>
  );
}