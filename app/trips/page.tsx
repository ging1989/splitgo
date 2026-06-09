"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import TripCard, { type TripCardData } from "@/src/components/trips/TripCard";
import CreateTripModal from "@/src/components/trips/CreateTripModal";

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="w-5 h-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
      />
    </svg>
  );
}

function TripCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex h-36 animate-pulse">
      <div className="w-32 flex-shrink-0 bg-gray-200" />
      <div className="flex-1 p-3 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
        <div className="h-3 bg-gray-100 rounded w-1/3" />
        <div className="h-5 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
      </div>
    </div>
  );
}

export default function TripsPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<TripCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [avatarInitial, setAvatarInitial] = useState("?");
  const [userId, setUserId] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/");
      return;
    }

    const user = session.user;
    setUserId(user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const fullName: string =
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "";

    if (fullName) {
      const firstName = fullName.split(" ")[0];
      setDisplayName(firstName);
      setAvatarInitial(firstName.charAt(0).toUpperCase());
    }

    await fetchTrips(user.id);
  }

  async function fetchTrips(uid: string) {
    const [{ data: memberRows }, { data: createdRows }] = await Promise.all([
      supabase.from("trip_members").select("trip_id").eq("user_id", uid),
      supabase.from("trips").select("id").eq("created_by", uid),
    ]);

    const memberIds = memberRows?.map((r) => r.trip_id) ?? [];
    const createdIds = createdRows?.map((r) => r.id) ?? [];
    const tripIds = [...new Set([...memberIds, ...createdIds])];

    if (!tripIds.length) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("trips")
      .select(
        `id, name, description, created_at,
         trip_members(user_id, role, profiles(full_name, avatar_url)),
         expenses(amount)`
      )
      .in("id", tripIds)
      .order("created_at", { ascending: false });

    setTrips((data as unknown as TripCardData[]) ?? []);
    setLoading(false);
  }

  async function handleTripCreated() {
    setShowModal(false);
    setLoading(true);
    await fetchTrips(userId);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white px-5 pt-14 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              สวัสดี {displayName || "..."}{" "}
              <span role="img" aria-label="wave">
                👋
              </span>
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              จัดการค่าใช้จ่ายทริปของคุณ
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600"
              aria-label="การแจ้งเตือน"
            >
              <BellIcon />
            </button>
            <div className="w-10 h-10 rounded-full bg-orange-400 flex items-center justify-center text-white font-bold text-sm select-none">
              {avatarInitial}
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="mt-4 w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors text-sm"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          สร้างทริปใหม่
        </button>
      </header>

      <main className="px-5 pt-5 pb-28">
        <h2 className="font-semibold text-gray-900 mb-3">ทริปของฉัน</h2>

        {loading ? (
          <div className="flex flex-col gap-3">
            <TripCardSkeleton />
            <TripCardSkeleton />
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">✈️</p>
            <p className="font-medium text-gray-500">ยังไม่มีทริป</p>
            <p className="text-sm mt-1">กดสร้างทริปใหม่เพื่อเริ่มต้น</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </main>

      {showModal && userId && (
        <CreateTripModal
          userId={userId}
          onClose={() => setShowModal(false)}
          onSuccess={handleTripCreated}
        />
      )}
    </div>
  );
}
