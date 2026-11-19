"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  createdAt?: string;
};

type AuthCtx = {
  user: SessionUser | null;
  ready: boolean;
  authOpen: boolean;
  authMode: "register" | "login";
  openAuth: (mode?: "register" | "login") => void;
  closeAuth: () => void;
  setUser: (u: SessionUser | null) => void;
  logout: () => Promise<void>;
  requireAuth: (mode?: "register" | "login") => boolean;
};

const Ctx = createContext<AuthCtx | null>(null);

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside provider");
  return v;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"register" | "login">("register");

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (alive) setUser(d.user ?? null);
      })
      .catch(() => {})
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const openAuth = useCallback((mode: "register" | "login" = "register") => {
    setAuthMode(mode);
    setAuthOpen(true);
  }, []);

  const closeAuth = useCallback(() => setAuthOpen(false), []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    window.dispatchEvent(new CustomEvent("rp:user"));
  }, []);

  const requireAuth = useCallback(
    (mode: "register" | "login" = "login") => {
      if (user) return true;
      openAuth(mode);
      return false;
    },
    [user, openAuth],
  );

  return (
    <Ctx.Provider
      value={{ user, ready, authOpen, authMode, openAuth, closeAuth, setUser, logout, requireAuth }}
    >
      {children}
      {authOpen ? <AuthModal /> : null}
    </Ctx.Provider>
  );
}

function AuthModal() {
  const { authMode, closeAuth, setUser, openAuth } = useAuth();
  const [mode, setMode] = useState<"register" | "login">(authMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode === "register" ? "register" : "login"}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "تعذّر إتمام العملية.");
      setUser(data.user);
      window.dispatchEvent(new CustomEvent("rp:user"));
      closeAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ غير متوقع.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-carbon/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md border border-hair bg-panel shadow-[0_30px_80px_-30px_#000]">
        <div className="flex items-center justify-between border-b border-hair px-5 py-3">
          <span className="mono-label">§ حساب — /auth/{mode === "register" ? "new" : "in"}</span>
          <button
            onClick={closeAuth}
            aria-label="إغلاق"
            className="num text-lg leading-none text-muted transition hover:text-hazard"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 border-b border-hair">
          {(["register", "login"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-3 text-sm transition ${
                mode === m
                  ? "bg-carbon-2 text-phos shadow-[inset_0_-2px_0_0_var(--color-phos)]"
                  : "text-muted hover:text-ink"
              }`}
            >
              {m === "register" ? "إنشاء حساب" : "تسجيل الدخول"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4 p-5">
          {mode === "register" && (
            <Field label="الاسم">
              <input
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: ليلى بن عمر"
                className="input"
              />
            </Field>
          )}
          <Field label="البريد الإلكتروني">
            <input
              required
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input text-left"
            />
          </Field>
          <Field label="كلمة المرور">
            <input
              required
              type="password"
              dir="ltr"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input text-left"
            />
          </Field>

          {error ? (
            <p className="border-r-2 border-hazard bg-hazard/10 px-3 py-2 text-sm text-hazard">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-phos px-4 py-3 font-medium text-[#06110f] transition hover:bg-film disabled:opacity-50"
          >
            {busy ? "جارٍ المعالجة…" : mode === "register" ? "إنشاء الحساب وحفظ مراجعاتي" : "دخول"}
          </button>

          <p className="text-xs leading-relaxed text-muted">
            الحساب مجاني ويُخزَّن على خادم هذا الموقع فقط — كلمة المرور مُجزّأة بخوارزمية scrypt ولا
            تُحفظ نصًّا. لديك حساب؟{" "}
            <button
              type="button"
              onClick={() => openAuth(mode === "register" ? "login" : "register")}
              className="text-phos underline underline-offset-2"
            >
              بدّل الوضع
            </button>
          </p>
        </form>
      </div>

      <style>{`
        .input {
          width: 100%;
          background: var(--color-carbon);
          border: 1px solid var(--color-hair);
          padding: 0.65rem 0.75rem;
          color: var(--color-ink);
          font-family: var(--font-sans);
          font-size: 0.9rem;
          outline: none;
          transition: border-color .15s ease;
        }
        .input:focus { border-color: var(--color-phos); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mono-label mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
