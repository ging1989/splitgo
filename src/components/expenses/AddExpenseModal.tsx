"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";

type Category = {
  id: string;
  name: string;
};

type Member = {
  id: string;
  user_id: string | null;
  display_name: string | null;
  role: string;
  profiles: { id: string; full_name: string; avatar_url: string | null } | null;
};

type Props = {
  tripId: string;
  members: Member[];
  currentUserId: string;
  onClose: () => void;
  onSuccess: () => void;
};

const CATEGORY_ICONS: Record<string, string> = {
  Accommodation: "🏨",
  Transportation: "🚌",
  Food: "🍜",
  Shopping: "🛍️",
  Activities: "🎡",
  Other: "📦",
};

const CATEGORY_NAMES_TH: Record<string, string> = {
  Accommodation: "ที่พัก",
  Transportation: "เดินทาง",
  Food: "อาหาร",
  Shopping: "ช้อปปิ้ง",
  Activities: "กิจกรรม",
  Other: "อื่นๆ",
};

const AVATAR_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#DDA0DD", "#F7DC6F",
];

function memberName(m: Member) {
  return m.profiles?.full_name ?? m.display_name ?? "?";
}

export default function AddExpenseModal({
  tripId,
  members,
  currentUserId,
  onClose,
  onSuccess,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");

  // paidBy uses trip_member.id — default to current user, fallback to first member
  const defaultPayer =
    members.find((m) => m.user_id === currentUserId) ?? members[0];
  const [paidBy, setPaidBy] = useState<string>(defaultPayer?.id ?? "");
  const [participantIds, setParticipantIds] = useState<string[]>(
    members.map((m) => m.id)
  );

  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    fetchCategories();
    return () => clearTimeout(t);
  }, []);

  async function fetchCategories() {
    const { data } = await supabase
      .from("expense_categories")
      .select("id, name")
      .order("name");
    if (data?.length) {
      setCategories(data);
      setCategoryId(data[0].id);
    }
  }

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 300);
  }

  function toggleParticipant(memberId: string) {
    setParticipantIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  }

  async function handleSave() {
    const numAmount = parseFloat(amount);
    if (!title.trim()) { setError("กรุณาระบุชื่อรายการ"); return; }
    if (!amount || isNaN(numAmount) || numAmount <= 0) { setError("กรุณาระบุจำนวนเงิน"); return; }
    if (!categoryId) { setError("กรุณาเลือกหมวดหมู่"); return; }
    if (!paidBy) { setError("กรุณาเลือกผู้จ่าย"); return; }
    if (participantIds.length === 0) { setError("กรุณาเลือกผู้แบ่งจ่ายอย่างน้อย 1 คน"); return; }
    if (loading) return;

    const payerMember = members.find((m) => m.id === paidBy);
    if (!payerMember) {
      setError("กรุณาเลือกผู้จ่าย");
      return;
    }

    setLoading(true);
    setError("");

    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        trip_id: tripId,
        category_id: categoryId,
        title: title.trim(),
        amount: numAmount,
        paid_by: payerMember.user_id ?? null,
        paid_by_member_id: payerMember.id,
        expense_date: expenseDate,
        note: note.trim() || null,
      })
      .select("id")
      .single();

    if (expenseError || !expense) {
      setError(expenseError?.message ?? "ไม่สามารถบันทึกค่าใช้จ่ายได้");
      setLoading(false);
      return;
    }

    // expense_participants: only registered users (user_id not null)
    // share_amount divides by ALL selected participants (including local members)
    const shareAmount = numAmount / participantIds.length;
    const registeredParticipants = participantIds
      .map((id) => members.find((m) => m.id === id))
      .filter((m): m is Member => m !== undefined && m.user_id !== null);

    if (registeredParticipants.length > 0) {
      const { error: participantError } = await supabase
        .from("expense_participants")
        .insert(
          registeredParticipants.map((m) => ({
            expense_id: expense.id,
            user_id: m.user_id,
            share_amount: shareAmount,
          }))
        );

      if (participantError) {
        setError(participantError.message);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    onSuccess();
  }

  const numAmount = parseFloat(amount);
  const splitAmount =
    !isNaN(numAmount) && numAmount > 0 && participantIds.length > 0
      ? numAmount / participantIds.length
      : null;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      <div
        className={`fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl shadow-2xl
          flex flex-col transition-transform duration-300 ease-out
          ${visible ? "translate-y-0" : "translate-y-full"}`}
        style={{ maxHeight: "92dvh" }}
      >
        {/* Header */}
        <div className="flex-shrink-0">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>
          <div className="flex items-center justify-between px-5 pt-3 pb-2">
            <h2 className="font-bold text-gray-900 text-lg">เพิ่มค่าใช้จ่าย</h2>
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm"
              aria-label="ปิด"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto px-5 py-2 space-y-5">
          {/* Title */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">
              รายการ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น ข้าวเที่ยง, ตั๋วรถไฟ"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm
                focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              autoFocus
              maxLength={100}
              disabled={loading}
            />
          </div>

          {/* Amount */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">
              จำนวนเงิน <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">
                ฿
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 text-sm
                  focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                min="0"
                step="0.01"
                inputMode="decimal"
                disabled={loading}
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              หมวดหมู่
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border transition-colors
                    ${
                      categoryId === cat.id
                        ? "bg-green-50 border-green-500 text-green-700"
                        : "border-gray-200 text-gray-600"
                    }`}
                  disabled={loading}
                >
                  <span className="text-xl leading-none">
                    {CATEGORY_ICONS[cat.name] ?? "📦"}
                  </span>
                  <span className="text-[10px] font-medium whitespace-nowrap">
                    {CATEGORY_NAMES_TH[cat.name] ?? cat.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Payer — all members */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              ใครจ่าย
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {members.map((m, i) => {
                const name = memberName(m).split(" ")[0];
                const selected = paidBy === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaidBy(m.id)}
                    className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border transition-colors
                      ${selected ? "bg-green-50 border-green-500" : "border-gray-200"}`}
                    disabled={loading}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                      style={{
                        backgroundColor:
                          AVATAR_COLORS[i % AVATAR_COLORS.length],
                      }}
                    >
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <span
                      className={`text-[10px] font-medium ${
                        selected ? "text-green-700" : "text-gray-600"
                      }`}
                    >
                      {name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Participants — all members */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              แบ่งจ่ายกับ
              {participantIds.length > 0 ? ` (${participantIds.length} คน)` : ""}
            </label>
            <div className="space-y-2">
              {members.map((m, i) => {
                const name = memberName(m);
                const checked = participantIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleParticipant(m.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors
                      ${checked ? "bg-green-50 border-green-200" : "border-gray-200 bg-white"}`}
                    disabled={loading}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                      style={{
                        backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
                      }}
                    >
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <span className="text-sm text-gray-900">{name}</span>
                      {m.user_id === null && (
                        <span className="ml-1.5 text-[10px] text-gray-400">
                          (ไม่มีบัญชี)
                        </span>
                      )}
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                        ${checked ? "bg-green-500 border-green-500" : "border-gray-300"}`}
                    >
                      {checked && (
                        <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none">
                          <path
                            d="M2 6l3 3 5-5"
                            stroke="white"
                            strokeWidth={1.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">
              วันที่
            </label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm
                focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          {/* Note */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">
              หมายเหตุ{" "}
              <span className="text-gray-400 font-normal">(ไม่บังคับ)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="รายละเอียดเพิ่มเติม"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm
                focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              rows={2}
              maxLength={300}
              disabled={loading}
            />
          </div>

          {/* Split preview */}
          {splitAmount !== null && (
            <div className="bg-green-50 rounded-xl px-4 py-3">
              <p className="text-xs text-green-700 font-medium">
                แบ่งเท่ากัน: คนละ ฿
                {splitAmount.toLocaleString("th-TH", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          )}

        </div>

        {/* Submit button */}
        <div
          className="flex-shrink-0 px-5 pt-3 border-t border-gray-100"
          style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        >
          {error && (
            <p className="text-red-500 text-sm mb-2 text-center">{error}</p>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!title.trim() || !amount || !categoryId || participantIds.length === 0 || loading}
            className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800
              disabled:bg-gray-200 disabled:text-gray-400
              text-white py-3.5 rounded-xl font-semibold text-sm transition-colors"
          >
            {loading ? "กำลังบันทึก..." : "บันทึกค่าใช้จ่าย"}
          </button>
        </div>
      </div>
    </>
  );
}
