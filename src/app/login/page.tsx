"use client";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

export const dynamic = "force-dynamic";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const res = await signIn("credentials", { redirect: false, password });
    setLoading(false);
    if (res?.ok) {
      const cb = search.get("callbackUrl") || "/";
      router.replace(cb);
    } else {
      setErr("비밀번호가 올바르지 않습니다.");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-sm"
    >
      <h1 className="text-xl font-semibold">Family Finance</h1>
      <p className="text-muted text-sm mt-1">비밀번호를 입력해주세요.</p>
      <input
        type="password"
        autoFocus
        inputMode="text"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mt-4 w-full rounded-xl border bg-bg px-3 py-3 outline-none focus:border-accent"
        placeholder="비밀번호"
      />
      {err && <p className="text-red-500 text-sm mt-2">{err}</p>}
      <button
        type="submit"
        disabled={loading || password.length === 0}
        className="mt-4 w-full rounded-xl bg-accent text-white py-3 font-medium disabled:opacity-50"
      >
        {loading ? "확인 중…" : "로그인"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen grid place-items-center px-6">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
