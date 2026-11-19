"use client";

import { useAuth } from "@/components/auth-provider";
import { Countdown } from "@/components/readouts";

export function RadiationMark({ className = "" }: { className?: string }) {
  const blades = [0, 120, 240];
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.35" />
      <g fill="currentColor">
        {blades.map((a) => (
          <path
            key={a}
            d="M50 50 L89.8 27 A46 46 0 0 1 89.8 73 Z"
            transform={`rotate(${a} 50 50)`}
          />
        ))}
      </g>
      <circle cx="50" cy="50" r="9" fill="currentColor" />
    </svg>
  );
}

export default function TopBar({ nextDropAt }: { nextDropAt: string }) {
  const { user, openAuth, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-hair bg-carbon/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-4 py-2.5 md:px-8">
        <a href="#" className="flex items-center gap-2.5">
          <RadiationMark className="h-7 w-7 shrink-0 text-hazard" />
          <span className="flex flex-col leading-none">
            <span className="font-display text-lg text-ink">الفهرس الإشعاعي</span>
            <span className="mono-label mt-1 hidden sm:block">
              radiological physics · resource index
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-5 text-sm text-muted md:flex">
          <a href="#index" className="transition hover:text-phos">
            الفهرس
          </a>
          <a href="#method" className="transition hover:text-phos">
            كيف نتحقق
          </a>
          <span className="mono-label hidden items-center gap-2 lg:flex">
            إضافة تالية
            <Countdown to={nextDropAt} />
          </span>
        </nav>

        <div className="ms-auto flex shrink-0 items-center gap-2">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden border-r border-hair pr-3 text-sm sm:block">
                <span className="text-muted">أهلًا، </span>
                <span className="text-phos">{user.name}</span>
              </span>
              <button
                onClick={() => void logout()}
                className="border border-hair px-3 py-1.5 text-xs text-muted transition hover:border-hazard hover:text-hazard"
              >
                خروج
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => openAuth("login")}
                className="px-3 py-1.5 text-sm text-muted transition hover:text-ink"
              >
                دخول
              </button>
              <button
                onClick={() => openAuth("register")}
                className="border border-phos bg-phos px-3.5 py-1.5 text-sm font-medium text-[#06110f] transition hover:bg-film"
              >
                إنشاء حساب
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
