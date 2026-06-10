"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`w-6 h-6 ${active ? "text-green-600" : "text-gray-400"}`}
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    </svg>
  );
}


function GearIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`w-6 h-6 ${active ? "text-green-600" : "text-gray-400"}`}
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
    </svg>
  );
}

const navItems = [
  { href: "/trips", label: "ทริป", Icon: HomeIcon },
  { href: "/settings", label: "ตั้งค่า", Icon: GearIcon },
];

export default function TripsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="relative min-h-screen bg-gray-50">
      {children}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50">
        <div className="flex items-end justify-around px-2 pt-2 pb-safe">
          <div className="flex items-end justify-around w-full pb-4">
            {/* ทริป */}
            {(() => {
              const { href, label, Icon } = navItems[0];
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link key={href} href={href} className="flex flex-col items-center gap-1 min-w-[56px] py-1">
                  <Icon active={active} />
                  <span className={`text-[10px] font-medium ${active ? "text-green-600" : "text-gray-400"}`}>{label}</span>
                </Link>
              );
            })()}

            {/* FAB centre — สร้างทริปใหม่ */}
            <Link
              href="/trips?new=1"
              className="flex flex-col items-center -mt-7 min-w-[56px]"
            >
              <div className="w-14 h-14 bg-green-600 rounded-full shadow-lg shadow-green-200 flex items-center justify-center active:bg-green-700 transition-colors">
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <span className="text-[10px] font-medium text-gray-400 mt-1">สร้างทริป</span>
            </Link>

            {/* ตั้งค่า */}
            {(() => {
              const { href, label, Icon } = navItems[1];
              const active = pathname === href;
              return (
                <Link key={href} href={href} className="flex flex-col items-center gap-1 min-w-[56px] py-1">
                  <Icon active={active} />
                  <span className={`text-[10px] font-medium ${active ? "text-green-600" : "text-gray-400"}`}>{label}</span>
                </Link>
              );
            })()}
          </div>
        </div>
      </nav>
    </div>
  );
}
