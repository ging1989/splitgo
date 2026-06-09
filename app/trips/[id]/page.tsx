"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/src/lib/supabase";
import AddExpenseModal from "@/src/components/expenses/AddExpenseModal";
import AddMemberModal from "@/src/components/trips/AddMemberModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
};

type TripMember = {
  id: string;
  user_id: string | null;
  display_name: string | null;
  role: "owner" | "member";
  joined_at: string;
  profiles: Profile | null;
};

type ExpenseCategory = {
  name: string;
};

type Expense = {
  id: string;
  title: string;
  amount: number;
  expense_date: string;
  note: string | null;
  paid_by: string | null;
  paid_by_member_id: string | null;
  expense_categories: ExpenseCategory | null;
  payer: { full_name: string | null; avatar_url: string | null } | null;
};

type TripDetail = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  trip_members: TripMember[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#DDA0DD", "#F7DC6F",
];

const CATEGORY_COLORS: Record<string, string> = {
  Accommodation: "#4ECDC4",
  Transportation: "#45B7D1",
  Food: "#FF6B6B",
  Shopping: "#96CEB4",
  Activities: "#F7DC6F",
  Other: "#DDA0DD",
};

function categoryColor(name: string | undefined) {
  if (!name) return "#CBD5E1";
  return CATEGORY_COLORS[name] ?? "#CBD5E1";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="w-5 h-5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  );
}

function MemberAvatar({
  member,
  index,
}: {
  member: TripMember;
  index: number;
}) {
  const name = member.profiles?.full_name ?? member.display_name ?? "?";
  const initial = name.charAt(0).toUpperCase();
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-base"
        style={{ backgroundColor: color }}
      >
        {initial}
      </div>
      <span className="text-[10px] text-gray-500 max-w-[48px] truncate text-center">
        {name.split(" ")[0]}
      </span>
    </div>
  );
}

function ExpenseItem({ expense }: { expense: Expense }) {
  const color = categoryColor(expense.expense_categories?.name);
  const payerName = expense.payer?.full_name?.split(" ")[0] ?? "—";
  const date = new Date(expense.expense_date).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
  });

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
        style={{ backgroundColor: color }}
      >
        {(expense.expense_categories?.name ?? "?").charAt(0)}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm truncate">{expense.title}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          จ่ายโดย {payerName} · {date}
        </p>
      </div>

      <p className="font-bold text-gray-900 text-sm flex-shrink-0">
        ฿{expense.amount.toLocaleString()}
      </p>
    </div>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  async function loadData(tripId: string) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      router.push("/");
      return;
    }

    setCurrentUserId(session.user.id);

    const { data: tripData, error } = await supabase
      .from("trips")
      .select(
        `id, name, description, created_at,
         trip_members(id, user_id, display_name, role, joined_at, profiles(id, full_name, avatar_url))`
      )
      .eq("id", tripId)
      .single();

    if (error || !tripData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setTrip(tripData as unknown as TripDetail);
    await fetchExpenses(tripId);
    setLoading(false);
  }

  async function fetchExpenses(tripId: string) {
    const { data: expenseRows } = await supabase
      .from("expenses")
      .select(`id, title, amount, expense_date, note, paid_by, paid_by_member_id, expense_categories(name)`)
      .eq("trip_id", tripId)
      .order("expense_date", { ascending: false });

    if (!expenseRows?.length) { setExpenses([]); return; }

    const memberIds: string[] = [...new Set(
      expenseRows
        .filter((e) => e.paid_by_member_id != null)
        .map((e) => e.paid_by_member_id as string)
    )];
    const legacyUserIds: string[] = [...new Set(
      expenseRows
        .filter((e) => !e.paid_by_member_id && e.paid_by != null)
        .map((e) => e.paid_by as string)
    )];

    const [{ data: memberRows }, { data: profileRows }] = await Promise.all([
      memberIds.length > 0
        ? supabase.from("trip_members")
            .select("id, display_name, profiles(full_name, avatar_url)")
            .in("id", memberIds)
        : Promise.resolve({ data: [] as unknown[] }),
      legacyUserIds.length > 0
        ? supabase.from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", legacyUserIds)
        : Promise.resolve({ data: [] as unknown[] }),
    ]);

    type PayerInfo = { full_name: string | null; avatar_url: string | null };
    const memberPayerMap: Record<string, PayerInfo> = Object.fromEntries(
      ((memberRows ?? []) as { id: string; display_name: string | null; profiles: PayerInfo | null }[]).map((m) => [
        m.id,
        { full_name: (m.profiles?.full_name ?? m.display_name) ?? null, avatar_url: m.profiles?.avatar_url ?? null },
      ])
    );
    const profilePayerMap: Record<string, PayerInfo> = Object.fromEntries(
      ((profileRows ?? []) as Profile[]).map((p) => [p.id, p])
    );

    setExpenses(
      (expenseRows as unknown as Expense[]).map((e) => ({
        ...e,
        payer: e.paid_by_member_id
          ? memberPayerMap[e.paid_by_member_id] ?? null
          : e.paid_by ? profilePayerMap[e.paid_by] ?? null : null,
      }))
    );
  }

  async function handleExpenseAdded() {
    setShowExpenseModal(false);
    if (id) await fetchExpenses(id);
  }

  async function handleMemberAdded() {
    setShowAddMemberModal(false);
    if (!id) return;
    const { data: tripData } = await supabase
      .from("trips")
      .select(
        `id, name, description, created_at,
         trip_members(id, user_id, display_name, role, joined_at, profiles(id, full_name, avatar_url))`
      )
      .eq("id", id)
      .single();
    if (tripData) setTrip(tripData as unknown as TripDetail);
  }

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const memberCount = trip?.trip_members.length ?? 0;
  const avgPerPerson = memberCount > 0 ? totalExpense / memberCount : 0;

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-gray-400">
        <p className="text-5xl">🗺️</p>
        <p className="font-medium text-gray-500">ไม่พบทริปนี้</p>
        <Link href="/trips" className="text-green-600 text-sm font-medium">
          กลับหน้าหลัก
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white px-5 pt-14 pb-4 flex items-center gap-3">
        <Link
          href="/trips"
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0"
          aria-label="กลับ"
        >
          <BackIcon />
        </Link>
        {loading ? (
          <SkeletonBlock className="h-6 w-40" />
        ) : (
          <h1 className="font-bold text-gray-900 text-lg truncate">{trip?.name}</h1>
        )}
      </header>

      <main className="px-5 pt-4 pb-32 space-y-4">
        {/* Summary card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          {loading ? (
            <div className="space-y-2">
              <SkeletonBlock className="h-8 w-36" />
              <SkeletonBlock className="h-4 w-48" />
            </div>
          ) : (
            <>
              <p className="text-gray-400 text-xs">ค่าใช้จ่ายรวมทั้งหมด</p>
              <p className="text-green-600 font-bold text-3xl mt-0.5">
                ฿{totalExpense.toLocaleString()}
              </p>
              {memberCount > 0 && totalExpense > 0 && (
                <p className="text-gray-400 text-xs mt-1">
                  เฉลี่ยคนละ ฿{Math.round(avgPerPerson).toLocaleString()} ·{" "}
                  {memberCount} คน
                </p>
              )}
              {trip?.description && (
                <p className="text-gray-500 text-sm mt-2 border-t border-gray-50 pt-2">
                  {trip.description}
                </p>
              )}
            </>
          )}
        </div>

        {/* Members */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 text-sm">
              สมาชิก{!loading && memberCount > 0 ? ` (${memberCount})` : ""}
            </h2>
            {!loading && (
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="flex items-center gap-1 text-green-600 text-xs font-medium"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M10 5a1 1 0 0 1 1 1v3h3a1 1 0 1 1 0 2h-3v3a1 1 0 1 1-2 0v-3H6a1 1 0 1 1 0-2h3V6a1 1 0 0 1 1-1Z" />
                </svg>
                เพิ่มสมาชิก
              </button>
            )}
          </div>
          {loading ? (
            <div className="flex gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <SkeletonBlock className="w-11 h-11 rounded-full" />
                  <SkeletonBlock className="h-2.5 w-10" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-1">
              {trip?.trip_members.map((m, i) => (
                <MemberAvatar key={m.id} member={m} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* Expenses */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-gray-900 text-sm">
              ค่าใช้จ่าย{!loading && expenses.length > 0 ? ` (${expenses.length})` : ""}
            </h2>
          </div>

          {loading ? (
            <div className="space-y-4 mt-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <SkeletonBlock className="w-10 h-10 rounded-xl" />
                  <div className="flex-1 space-y-1.5">
                    <SkeletonBlock className="h-4 w-3/4" />
                    <SkeletonBlock className="h-3 w-1/2" />
                  </div>
                  <SkeletonBlock className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-3xl mb-2">🧾</p>
              <p className="text-sm">ยังไม่มีค่าใช้จ่าย</p>
            </div>
          ) : (
            <div>
              {expenses.map((e) => (
                <ExpenseItem key={e.id} expense={e} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add expense FAB */}
      <div className="fixed bottom-24 right-5 z-40">
        <button
          onClick={() => setShowExpenseModal(true)}
          className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-5 py-3 rounded-full shadow-lg shadow-green-200 flex items-center gap-2 font-semibold text-sm transition-colors"
          aria-label="เพิ่มค่าใช้จ่าย"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          เพิ่มค่าใช้จ่าย
        </button>
      </div>

      {showExpenseModal && trip && currentUserId && (
        <AddExpenseModal
          tripId={trip.id}
          members={trip.trip_members}
          currentUserId={currentUserId}
          onClose={() => setShowExpenseModal(false)}
          onSuccess={handleExpenseAdded}
        />
      )}

      {showAddMemberModal && trip && (
        <AddMemberModal
          tripId={trip.id}
          existingUserIds={trip.trip_members
            .map((m) => m.user_id)
            .filter((id): id is string => id !== null)}
          onClose={() => setShowAddMemberModal(false)}
          onSuccess={handleMemberAdded}
        />
      )}
    </div>
  );
}
