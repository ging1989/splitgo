"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";

type Member = {
  id: string;
  user_id: string | null;
  display_name: string | null;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
};

type Settlement = {
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
  amount: number;
};

type MemberBalance = {
  memberId: string;
  name: string;
  balance: number;
};

const AVATAR_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#DDA0DD", "#F7DC6F",
];

function displayName(m: Member) {
  return (m.profiles?.full_name ?? m.display_name ?? "?").split(" ")[0];
}

export default function SettlementSection({
  tripId,
  members,
  refreshKey,
}: {
  tripId: string;
  members: Member[];
  refreshKey: number;
}) {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [balances, setBalances] = useState<MemberBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    if (members.length > 0) calculate();
  }, [tripId, members, refreshKey]);

  async function calculate() {
    setLoading(true);

    const { data: expenses } = await supabase
      .from("expenses")
      .select("id, amount, paid_by, paid_by_member_id")
      .eq("trip_id", tripId);

    if (!expenses?.length) {
      setHasData(false);
      setLoading(false);
      return;
    }

    const expenseIds = expenses.map((e) => e.id);
    const { data: participants } = await supabase
      .from("expense_participants")
      .select("trip_member_id, user_id, share_amount")
      .in("expense_id", expenseIds);

    // Fallback map for old records that only have user_id (no trip_member_id)
    const userToMember = new Map(
      members.filter((m) => m.user_id).map((m) => [m.user_id!, m.id])
    );

    const paid = new Map<string, number>();
    const owed = new Map<string, number>();
    members.forEach((m) => { paid.set(m.id, 0); owed.set(m.id, 0); });

    // Tally who paid
    expenses.forEach((e) => {
      const payerId =
        e.paid_by_member_id ??
        (e.paid_by ? userToMember.get(e.paid_by) : undefined);
      if (payerId) {
        paid.set(payerId, (paid.get(payerId) ?? 0) + Number(e.amount));
      }
    });

    // Tally who owes — prefer trip_member_id, fallback to user_id for old records
    (participants ?? []).forEach((p) => {
      const mId = p.trip_member_id ?? userToMember.get(p.user_id);
      if (mId) {
        owed.set(mId, (owed.get(mId) ?? 0) + Number(p.share_amount));
      }
    });

    // Balance per member
    const memberBalances: MemberBalance[] = members.map((m) => ({
      memberId: m.id,
      name: displayName(m),
      balance: (paid.get(m.id) ?? 0) - (owed.get(m.id) ?? 0),
    }));

    setBalances(memberBalances);
    setHasData(true);

    // Greedy settlement algorithm
    const creds = memberBalances
      .filter((b) => b.balance > 0.5)
      .map((b) => ({ ...b }))
      .sort((a, b) => b.balance - a.balance);
    const debts = memberBalances
      .filter((b) => b.balance < -0.5)
      .map((b) => ({ ...b }))
      .sort((a, b) => a.balance - b.balance);

    const result: Settlement[] = [];
    let i = 0,
      j = 0;
    while (i < creds.length && j < debts.length) {
      const amount = Math.min(creds[i].balance, -debts[j].balance);
      if (amount > 0.5) {
        result.push({
          fromId: debts[j].memberId,
          toId: creds[i].memberId,
          fromName: debts[j].name,
          toName: creds[i].name,
          amount: Math.round(amount),
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

  if (loading || !hasData) return null;

  const isSettled = settlements.length === 0;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h2 className="font-semibold text-gray-900 text-sm mb-3">
        สรุปการชำระเงิน
      </h2>

      {isSettled ? (
        <div className="flex items-center gap-2 text-green-600 py-1">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-sm font-medium">ทุกคนเคลียร์บิลแล้ว</span>
        </div>
      ) : (
        <div className="space-y-2 mb-3">
          {settlements.map((s, idx) => {
            const fromIdx = members.findIndex((m) => m.id === s.fromId);
            const toIdx = members.findIndex((m) => m.id === s.toId);
            return (
              <div
                key={idx}
                className="flex items-center gap-3 bg-orange-50 rounded-xl px-3 py-2.5"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: AVATAR_COLORS[fromIdx % AVATAR_COLORS.length] }}
                >
                  {s.fromName.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">
                    <span className="font-semibold">{s.fromName}</span>
                    <span className="text-gray-400 text-xs mx-1.5">โอนให้</span>
                    <span
                      className="inline-flex w-5 h-5 rounded-full items-center justify-center text-white text-[9px] font-bold mx-0.5"
                      style={{ backgroundColor: AVATAR_COLORS[toIdx % AVATAR_COLORS.length] }}
                    >
                      {s.toName.charAt(0).toUpperCase()}
                    </span>
                    <span className="font-semibold ml-0.5">{s.toName}</span>
                  </p>
                </div>

                <p className="font-bold text-orange-600 text-sm flex-shrink-0">
                  ฿{s.amount.toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Balance breakdown */}
      <div
        className={`space-y-1 ${!isSettled ? "pt-3 border-t border-gray-50" : ""}`}
      >
        {balances
          .filter((b) => Math.abs(b.balance) > 0.5 || balances.some((x) => Math.abs(x.balance) > 0.5))
          .map((b) => (
            <div key={b.memberId} className="flex items-center gap-2 text-xs py-0.5">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                style={{
                  backgroundColor:
                    AVATAR_COLORS[
                      members.findIndex((m) => m.id === b.memberId) %
                        AVATAR_COLORS.length
                    ],
                }}
              >
                {b.name.charAt(0).toUpperCase()}
              </div>
              <span className="flex-1 text-gray-600">{b.name}</span>
              <span
                className={`font-semibold text-right ${
                  b.balance > 0.5
                    ? "text-green-600"
                    : b.balance < -0.5
                    ? "text-red-500"
                    : "text-gray-400"
                }`}
              >
                {b.balance > 0.5
                  ? `รอรับคืน ฿${Math.round(b.balance).toLocaleString()}`
                  : b.balance < -0.5
                  ? `ต้องโอน ฿${Math.abs(Math.round(b.balance)).toLocaleString()}`
                  : "✓ เคลียร์แล้ว"}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
