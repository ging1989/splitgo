"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";

type Props = {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export default function CreateTripModal({ userId, onClose, onSuccess }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 300);
  }

  async function handleCreate() {
    if (!name.trim() || loading) return;

    setLoading(true);
    setError("");

    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        created_by: userId,
      })
      .select("id")
      .single();

    if (tripError || !trip) {
      setError(tripError?.message ?? "ไม่สามารถสร้างทริปได้ กรุณาลองใหม่");
      setLoading(false);
      return;
    }

    const { error: memberError } = await supabase
      .from("trip_members")
      .insert({ trip_id: trip.id, user_id: userId, role: "owner" });

    if (memberError) {
      setError(memberError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    onSuccess();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Bottom sheet — flex column so button is always anchored at bottom */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl shadow-2xl
          flex flex-col transition-transform duration-300 ease-out
          ${visible ? "translate-y-0" : "translate-y-full"}`}
        style={{ maxHeight: "90dvh" }}
      >
        {/* Drag handle + header — never scrolls */}
        <div className="flex-shrink-0">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>
          <div className="flex items-center justify-between px-5 pt-3 pb-2">
            <h2 className="font-bold text-gray-900 text-lg">สร้างทริปใหม่</h2>
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

        {/* Scrollable inputs */}
        <div className="flex-1 overflow-y-auto px-5 py-2 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">
              ชื่อทริป <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น Tokyo 2026, Phuket ปีใหม่"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm
                focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              autoFocus
              maxLength={100}
              disabled={loading}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">
              รายละเอียด{" "}
              <span className="text-gray-400 font-normal">(ไม่บังคับ)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="บอกเล่าคร่าวๆ เกี่ยวกับทริปนี้"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm
                focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                resize-none"
              rows={2}
              maxLength={500}
              disabled={loading}
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        {/* Submit button — always visible at bottom */}
        <div
          className="flex-shrink-0 px-5 pt-3 border-t border-gray-100"
          style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={handleCreate}
            disabled={!name.trim() || loading}
            className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800
              disabled:bg-gray-200 disabled:text-gray-400
              text-white py-3.5 rounded-xl font-semibold text-sm transition-colors"
          >
            {loading ? "กำลังสร้าง..." : "สร้างทริป"}
          </button>
        </div>
      </div>
    </>
  );
}
