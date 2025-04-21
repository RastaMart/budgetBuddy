import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useContext";

export function Dashboard() {
  const { user } = useAuth();
  const [categoryCount, setCategoryCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkSupabaseConnection() {
      try {
        const { count, error } = await supabase
          .from("categories")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (error) throw error;
        setCategoryCount(count);
      } catch (err) {
        console.error("Error:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    }

    checkSupabaseConnection();
  }, [user.id]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Supabase Connection Test
        </h2>
        {error ? (
          <p className="text-red-600">Error: {error}</p>
        ) : (
          <div className="space-y-2">
            <p className="text-green-600">✓ Supabase connection successful!</p>
            <p className="text-gray-600">
              You have {categoryCount === null ? "..." : categoryCount}{" "}
              {categoryCount === 1 ? "category" : "categories"} in your account.
            </p>
            <p className="text-gray-600">User ID: {user.id}</p>
          </div>
        )}
      </div>
    </div>
  );
}
