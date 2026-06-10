"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/src/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

type Member = {
  id: string;
  user_id: string | null;
  display_name: string | null;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
};

type CategoryStat = {
  name: string;
  amount: number;
  color: string;
};

type Settlement = {
  fromName: string;
  toName: string;
  amount: number;
  fromColor: string;
  toColor: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#DDA0DD", "#F7DC6F",
];

const CATEGORY_COLORS: Record<string, string> = {
  Food:           "#4ECDC4",
  Accommodation:  "#45B7D1",
  Transportation: "#F7DC6F",
  Shopping:       "#96CEB4",
  Activities:     "#FF6B6B",
  Other:          "#DDA0DD",
};

const CATEGORY_NAMES_TH: Record<string, string> = {
  Food:           "อาหาร",
  Accommodation:  "โรงแรม",
  Transportation: "เดินทาง",
  Shopping:       "ช้อปปิ้ง",
  Activities:     "กิจกรรม",
  Other:          "อื่นๆ",
};

// ─── SVG Donut Chart ─────────────────────────────────────────────────────────

function DonutChart({ data, total }: { data: CategoryStat[]; total: number }) {
  const R = 56;
  const C = 2 * Math.PI * R;
  const cx = 90;
  const cy = 90;
  const strokeWidth = 28;

  let cumulative = 0;
  const segments = data.map((d) => {
    const fraction = total > 0 ? d.amount / total : 0;
    const dashArray = `${fraction * C} ${C}`;
    const dashOffset = -cumulative * C;
    cumulative += fraction;
    return { ...d, dashArray, dashOffset };
  });

  return (
    <div className="flex items-center gap-5">
      <div className="relative flex-shrink-0">
        <svg width="180" height="180" viewBox="0 0 180 180">
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={R}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={seg.dashArray}
              strokeDashoffset={seg.dashOffset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          ))}
          {/* Center hole */}
          <circle cx={cx} cy={cy} r={R - strokeWidth / 2 - 2} fill="white" />
          {/* Center text */}
          <text x={cx} y={cy - 6} textAnchor="middle" className="fill-gray-900" fontSize="13" fontWeight="bold">
            ฿{Math.round(total / 1000) >= 1 ? `${(total / 1000).toFixed(0)}K` : total.toLocaleString()}
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" className="fill-gray-400" fontSize="9">
            ทั้งหมด
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-xs text-gray-600 flex-1">
              {CATEGORY_NAMES_TH[d.name] ?? d.name}
            </span>
            <span className="text-xs font-semibold text-gray-800">
              {total > 0 ? Math.round((d.amount / total) * 100) : 0}%
            </span>
            <span className="text-xs text-gray-400 w-16 text-right">
              ฿{d.amount.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TripSummaryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [tripName, setTripName] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  async function loadData(tripId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/"); return; }

    // Fetch trip + members
    const { data: tripData } = await supabase
      .from("trips")
      .select(`id, name, trip_members(id, user_id, display_name, profiles(id, full_name, avatar_url))`)
      .eq("id", tripId)
      .single();

    if (!tripData) { setLoading(false); return; }
    setTripName(tripData.name);

    // Enrich members (same pattern as trip detail)
    const rawMembers = tripData.trip_members as unknown as Member[];
    const registeredIds = rawMembers.filter((m) => m.user_id).map((m) => m.user_id as string);
    let enrichedMembers: Member[] = rawMembers;
    if (registeredIds.length > 0) {
      const { data: profileRows } = await supabase
        .from("profiles").select("id, full_name, avatar_url").in("id", registeredIds);
      if (profileRows?.length) {
        type ProfileRow = { id: string; full_name: string | null; avatar_url: string | null };
        const profileMap = new Map((profileRows as unknown as ProfileRow[]).map((p) => [p.id, p]));
        enrichedMembers = rawMembers.map((m) =>
          m.user_id && profileMap.has(m.user_id)
            ? { ...m, profiles: profileMap.get(m.user_id)! }
            : m
        );
      }
    }
    setMembers(enrichedMembers);

    // Fetch expenses (without nested category — fetch separately to avoid RLS issues)
    const { data: expenseRows } = await supabase
      .from("expenses")
      .select(`id, amount, paid_by, paid_by_member_id, category_id`)
      .eq("trip_id", tripId);

    if (!expenseRows?.length) { setLoading(false); return; }

    // Fetch category names separately
    const categoryIds = [...new Set(expenseRows.filter((e) => e.category_id).map((e) => e.category_id as string))];
    const { data: categoryRows } = categoryIds.length > 0
      ? await supabase.from("expense_categories").select("id, name").in("id", categoryIds)
      : { data: [] as { id: string; name: string }[] };
    const categoryMap = new Map((categoryRows ?? []).map((c) => [c.id, c.name]));

    const expenses = expenseRows.map((e) => ({
      ...e,
      categoryName: (e.category_id ? categoryMap.get(e.category_id) : null) ?? "Other",
    }));

    const totalAmount = expenses.reduce((s, e) => s + Number(e.amount), 0);
    setTotal(totalAmount);

    // Category breakdown
    const catMap = new Map<string, number>();
    expenses.forEach((e) => {
      catMap.set(e.categoryName, (catMap.get(e.categoryName) ?? 0) + Number(e.amount));
    });
    const stats: CategoryStat[] = [...catMap.entries()]
      .map(([name, amount]) => ({ name, amount, color: CATEGORY_COLORS[name] ?? "#CBD5E1" }))
      .sort((a, b) => b.amount - a.amount);
    setCategoryStats(stats);

    // Settlement calculation
    const expenseIds = expenses.map((e) => e.id);
    const { data: participants } = await supabase
      .from("expense_participants")
      .select("trip_member_id, user_id, share_amount")
      .in("expense_id", expenseIds);

    const userToMember = new Map(
      enrichedMembers.filter((m) => m.user_id).map((m) => [m.user_id!, m.id])
    );
    const paid = new Map<string, number>();
    const owed = new Map<string, number>();
    enrichedMembers.forEach((m) => { paid.set(m.id, 0); owed.set(m.id, 0); });

    expenses.forEach((e) => {
      const payerId = e.paid_by_member_id ?? (e.paid_by ? userToMember.get(e.paid_by) : undefined);
      if (payerId) paid.set(payerId, (paid.get(payerId) ?? 0) + Number(e.amount));
    });
    (participants ?? []).forEach((p) => {
      const mId = p.trip_member_id ?? userToMember.get(p.user_id);
      if (mId) owed.set(mId, (owed.get(mId) ?? 0) + Number(p.share_amount));
    });

    function memberName(m: Member) {
      return (m.profiles?.full_name ?? m.display_name ?? "?").split(" ")[0];
    }
    function memberColor(m: Member) {
      return AVATAR_COLORS[enrichedMembers.indexOf(m) % AVATAR_COLORS.length];
    }

    const balances = enrichedMembers.map((m) => ({
      memberId: m.id,
      name: memberName(m),
      color: memberColor(m),
      balance: (paid.get(m.id) ?? 0) - (owed.get(m.id) ?? 0),
    }));

    const creds = balances.filter((b) => b.balance > 0.5).map((b) => ({ ...b })).sort((a, b) => b.balance - a.balance);
    const debts = balances.filter((b) => b.balance < -0.5).map((b) => ({ ...b })).sort((a, b) => a.balance - b.balance);
    const result: Settlement[] = [];
    let i = 0, j = 0;
    while (i < creds.length && j < debts.length) {
      const amount = Math.min(creds[i].balance, -debts[j].balance);
      if (amount > 0.5) {
        result.push({
          fromName: debts[j].name,
          toName: creds[i].name,
          amount: Math.round(amount),
          fromColor: debts[j].color,
          toColor: creds[i].color,
        });
      }
      creds[i].balance -= amount;
      debts[j].balance += amount;
      if (creds[i].balance < 0.5) i++;
      if (debts[j].balance > -0.5) j++;
    }
    setSettlements(result);
    setLoading(false);
  }

  async function handleShare() {
    const text = `สรุปทริป: ${tripName}\nค่าใช้จ่ายรวม: ฿${total.toLocaleString()}\n\nการชำระเงิน:\n${
      settlements.map((s) => `${s.fromName} → ${s.toName}: ฿${s.amount.toLocaleString()}`).join("\n")
    }`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `สรุปทริป ${tripName}`, text });
      } else {
        await navigator.clipboard.writeText(text);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {}
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white px-5 pt-14 pb-4 flex items-center gap-3">
        <Link
          href={`/trips/${id}`}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0"
          aria-label="กลับ"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <h1 className="font-bold text-gray-900 text-lg flex-1">สรุปทริป</h1>
        <button
          onClick={handleShare}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600"
          aria-label="แชร์"
        >
          {shared ? (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-600">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
            </svg>
          )}
        </button>
      </header>

      <main className="px-5 pt-4 pb-12 space-y-4">
        {/* Total */}
        <div className="bg-green-600 rounded-2xl p-5 text-white shadow-sm shadow-green-200">
          <p className="text-green-100 text-xs font-medium">ค่าใช้จ่ายรวมทั้งหมด</p>
          <p className="text-4xl font-bold mt-1">฿{total.toLocaleString()}</p>
          {members.length > 0 && total > 0 && (
            <p className="text-green-200 text-xs mt-1">
              เฉลี่ยคนละ ฿{Math.round(total / members.length).toLocaleString()} · {members.length} คน
            </p>
          )}
        </div>

        {/* Donut chart */}
        {categoryStats.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 text-sm mb-4">สัดส่วนค่าใช้จ่าย</h2>
            <DonutChart data={categoryStats} total={total} />
          </div>
        )}

        {/* Settlement */}
        {settlements.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 text-sm mb-3">การชำระเงินที่แนะนำ</h2>
            <div className="space-y-2.5">
              {settlements.map((s, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: s.fromColor }}
                  >
                    {s.fromName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">
                      <span className="font-semibold">{s.fromName}</span>
                      <span className="text-gray-400 text-xs mx-1.5">→</span>
                      <span className="font-semibold">{s.toName}</span>
                    </p>
                  </div>
                  <p className="font-bold text-green-600 text-sm flex-shrink-0">
                    ฿{s.amount.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {settlements.length === 0 && total > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-2 text-green-600">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">ทุกคนเคลียร์บิลแล้ว</span>
          </div>
        )}

        {/* Share button */}
        <button
          onClick={handleShare}
          className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 py-3.5 rounded-xl font-semibold text-sm shadow-sm active:bg-gray-50 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
          </svg>
          {shared ? "คัดลอกแล้ว!" : "แชร์สรุป"}
        </button>
      </main>
    </div>
  );
}
