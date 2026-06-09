"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/src/lib/supabase";

type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
};

type Props = {
  tripId: string;
  existingUserIds: string[];
  onClose: () => void;
  onSuccess: () => void;
};

const AVATAR_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#DDA0DD", "#F7DC6F",
];

export default function AddMemberModal({
  tripId,
  existingUserIds,
  onClose,
  onSuccess,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [tab, setTab] = useState<"search" | "local">("search");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);

  const [localName, setLocalName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 300);
  }

  function handleQueryChange(val: string) {
    setQuery(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (val.trim().length < 2) {
      setResults([]);
      return;
    }
    searchTimer.current = setTimeout(() => performSearch(val), 350);
  }

  async function performSearch(val: string) {
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .ilike("full_name", `%${val.trim()}%`)
      .limit(20);

    const filtered = (data ?? []).filter(
      (p) => !existingUserIds.includes(p.id)
    );
    setResults(filtered);
    setSearching(false);
  }

  async function handleAddUser(profile: Profile) {
    setLoading(true);
    setError("");
    const { error: err } = await supabase.from("trip_members").insert({
      trip_id: tripId,
      user_id: profile.id,
      role: "member",
    });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setLoading(false);
    onSuccess();
  }

  async function handleAddLocal() {
    if (!localName.trim() || loading) return;
    setLoading(true);
    setError("");
    const { error: err } = await supabase.from("trip_members").insert({
      trip_id: tripId,
      user_id: null,
      display_name: localName.trim(),
      role: "member",
    });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setLoading(false);
    onSuccess();
  }

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
        style={{ maxHeight: "85dvh" }}
      >
        {/* Header */}
        <div className="flex-shrink-0">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>
          <div className="flex items-center justify-between px-5 pt-3 pb-3">
            <h2 className="font-bold text-gray-900 text-lg">เพิ่มสมาชิก</h2>
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm"
              aria-label="ปิด"
            >
              ✕
            </button>
          </div>

          {/* Segmented tabs */}
          <div className="flex mx-5 mb-4 bg-gray-100 rounded-xl p-1">
            <button
              type="button"
              onClick={() => { setTab("search"); setError(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
                ${tab === "search" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
            >
              ค้นหาผู้ใช้
            </button>
            <button
              type="button"
              onClick={() => { setTab("local"); setError(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
                ${tab === "local" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
            >
              เพิ่มชื่อเอง
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-8">
          {tab === "search" ? (
            <div className="space-y-3">
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="พิมพ์ชื่อเพื่อค้นหา..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm
                  focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                autoFocus
              />

              {searching && (
                <p className="text-xs text-gray-400 text-center py-3">กำลังค้นหา...</p>
              )}

              {!searching && query.trim().length >= 2 && results.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">ไม่พบผู้ใช้</p>
              )}

              {!searching && query.trim().length < 2 && (
                <p className="text-xs text-gray-400 text-center py-3">พิมพ์อย่างน้อย 2 ตัวอักษร</p>
              )}

              <div className="space-y-2">
                {results.map((profile, i) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => handleAddUser(profile)}
                    disabled={loading}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200
                      hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
                      style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                    >
                      {profile.full_name.charAt(0).toUpperCase()}
                    </div>
                    <p className="flex-1 text-left text-sm font-medium text-gray-900">
                      {profile.full_name}
                    </p>
                    <span className="text-green-600 text-sm font-semibold flex-shrink-0">
                      + เพิ่ม
                    </span>
                  </button>
                ))}
              </div>

              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                สำหรับคนที่ไม่มีบัญชี เช่น เพื่อนที่ไม่ได้ใช้แอป
              </p>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  ชื่อสมาชิก <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  placeholder="เช่น สมชาย, น้องแนน"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm
                    focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  autoFocus
                  maxLength={50}
                  onKeyDown={(e) => e.key === "Enter" && handleAddLocal()}
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="button"
                onClick={handleAddLocal}
                disabled={!localName.trim() || loading}
                className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800
                  disabled:bg-gray-200 disabled:text-gray-400
                  text-white py-3.5 rounded-xl font-semibold text-sm transition-colors"
              >
                {loading ? "กำลังเพิ่ม..." : "เพิ่มสมาชิก"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
