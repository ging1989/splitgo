import Link from "next/link";

export type TripMember = {
  user_id: string;
  role: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  } | null;
};

export type TripCardData = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  trip_members: TripMember[];
  expenses: { amount: number }[];
};

const CARD_GRADIENTS: [string, string][] = [
  ["#667eea", "#764ba2"],
  ["#f093fb", "#f5576c"],
  ["#4facfe", "#00f2fe"],
  ["#43e97b", "#38f9d7"],
  ["#fa709a", "#fee140"],
  ["#a18cd1", "#fbc2eb"],
  ["#ffecd2", "#fcb69f"],
  ["#a1c4fd", "#c2e9fb"],
];

const AVATAR_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#DDA0DD", "#F7DC6F",
];

export default function TripCard({ trip }: { trip: TripCardData }) {
  const memberCount = trip.trip_members.length;
  const totalExpense = trip.expenses.reduce((sum, e) => sum + e.amount, 0);

  const gradientIdx = trip.id.charCodeAt(0) % CARD_GRADIENTS.length;
  const [fromColor, toColor] = CARD_GRADIENTS[gradientIdx];

  const visibleMembers = trip.trip_members.slice(0, 3);

  const createdDate = new Date(trip.created_at).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Link href={`/trips/${trip.id}`} className="block">
      <article className="bg-white rounded-2xl shadow-sm overflow-hidden flex h-36">
        <div
          className="w-32 flex-shrink-0 flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${fromColor}, ${toColor})` }}
        >
          <span className="text-white text-4xl font-bold opacity-90 select-none">
            {trip.name.charAt(0).toUpperCase()}
          </span>
        </div>

        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
          <div>
            <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">
              {trip.name}
            </h3>
            <p className="text-gray-400 text-xs mt-0.5">{createdDate}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {visibleMembers.map((m, i) => {
                const name = m.profiles?.full_name ?? "?";
                return (
                  <span
                    key={m.user_id}
                    className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-semibold"
                    style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </span>
                );
              })}
            </div>
            <span className="text-gray-500 text-xs">{memberCount} คน</span>
          </div>

          <div>
            <p className="text-gray-400 text-[10px]">ค่าใช้จ่ายรวม</p>
            <p className="text-green-600 font-bold text-base leading-tight">
              ฿{totalExpense.toLocaleString()}
            </p>
          </div>

          <div>
            {totalExpense > 0 ? (
              <span className="inline-flex items-center gap-1 text-amber-500 text-xs">
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 flex-shrink-0">
                  <circle cx="8" cy="8" r="8" fill="currentColor" />
                  <path
                    d="M8 5v3M8 10v.5"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                รอเคลียร์บิล
              </span>
            ) : (
              <span className="text-gray-400 text-xs">ยังไม่มีค่าใช้จ่าย</span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
