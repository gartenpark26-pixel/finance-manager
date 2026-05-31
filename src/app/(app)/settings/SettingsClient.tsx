"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { Spinner } from "@/components/Spinner";
import { fetchJSON } from "@/lib/fetcher";

type Category = { id: string; name: string; icon: string; color: string };
type Portfolio = { id: string; name: string; color: string };

export function SettingsClient({
  categories,
  portfolios,
}: {
  categories: Category[];
  portfolios: Portfolio[];
}) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">설정</h1>
      <CategorySection categories={categories} />
      <PortfolioSection portfolios={portfolios} />
      <PasswordSection />
    </div>
  );
}

function CategorySection({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📦");
  const [color, setColor] = useState("#6b7280");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add() {
    setErr(null);
    if (!name.trim()) return;
    setBusy(true);
    try {
      await fetchJSON("/api/categories", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), icon, color }),
      });
      setName("");
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function update(c: Category, patch: Partial<Category>) {
    await fetchJSON(`/api/categories/${c.id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
    router.refresh();
  }

  async function remove(c: Category) {
    if (!confirm(`'${c.name}' 카테고리를 삭제할까요?`)) return;
    await fetchJSON(`/api/categories/${c.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <Card>
      <h2 className="font-semibold mb-3">카테고리</h2>
      <ul className="divide-y divide-border -mx-2">
        {categories.map((c) => (
          <li key={c.id} className="px-2 py-2 flex items-center gap-2">
            <input
              defaultValue={c.icon}
              onBlur={(e) =>
                e.target.value !== c.icon && update(c, { icon: e.target.value })
              }
              className="w-12 rounded-lg bg-bg border border-border px-2 py-1.5 text-center"
              maxLength={4}
            />
            <input
              defaultValue={c.name}
              onBlur={(e) =>
                e.target.value.trim() && e.target.value !== c.name &&
                update(c, { name: e.target.value.trim() })
              }
              className="flex-1 rounded-lg bg-bg border border-border px-2 py-1.5"
            />
            <input
              type="color"
              defaultValue={c.color}
              onBlur={(e) => e.target.value !== c.color && update(c, { color: e.target.value })}
              className="w-10 h-9 rounded-lg border border-border bg-transparent"
            />
            <button
              onClick={() => remove(c)}
              className="text-muted hover:text-red-500 px-2"
            >
              🗑️
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 pt-4 border-t border-border">
        <div className="text-sm text-muted mb-2">카테고리 추가</div>
        <div className="flex items-center gap-2">
          <input
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className="w-12 rounded-lg bg-bg border border-border px-2 py-1.5 text-center"
            maxLength={4}
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름"
            className="flex-1 rounded-lg bg-bg border border-border px-2 py-1.5"
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-10 h-9 rounded-lg border border-border bg-transparent"
          />
          <button
            onClick={add}
            disabled={busy}
            className="rounded-lg bg-accent text-white px-3 py-1.5 text-sm disabled:opacity-50"
          >
            {busy ? <Spinner size={14} /> : "추가"}
          </button>
        </div>
        {err && <p className="text-red-500 text-sm mt-2">{err}</p>}
      </div>
    </Card>
  );
}

function PortfolioSection({ portfolios }: { portfolios: Portfolio[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await fetchJSON("/api/portfolios", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), color }),
      });
      setName("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function update(p: Portfolio, patch: Partial<Portfolio>) {
    await fetchJSON(`/api/portfolios/${p.id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
    router.refresh();
  }

  async function remove(p: Portfolio) {
    if (!confirm(`'${p.name}' 포트폴리오와 해당 종목을 모두 삭제할까요?`)) return;
    await fetchJSON(`/api/portfolios/${p.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <Card>
      <h2 className="font-semibold mb-3">포트폴리오</h2>
      <ul className="divide-y divide-border -mx-2">
        {portfolios.map((p) => (
          <li key={p.id} className="px-2 py-2 flex items-center gap-2">
            <input
              defaultValue={p.name}
              onBlur={(e) =>
                e.target.value.trim() && e.target.value !== p.name &&
                update(p, { name: e.target.value.trim() })
              }
              className="flex-1 rounded-lg bg-bg border border-border px-2 py-1.5"
            />
            <input
              type="color"
              defaultValue={p.color}
              onBlur={(e) => e.target.value !== p.color && update(p, { color: e.target.value })}
              className="w-10 h-9 rounded-lg border border-border bg-transparent"
            />
            <button onClick={() => remove(p)} className="text-muted hover:text-red-500 px-2">
              🗑️
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 pt-4 border-t border-border">
        <div className="text-sm text-muted mb-2">포트폴리오 추가</div>
        <div className="flex items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름"
            className="flex-1 rounded-lg bg-bg border border-border px-2 py-1.5"
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-10 h-9 rounded-lg border border-border bg-transparent"
          />
          <button
            onClick={add}
            disabled={busy}
            className="rounded-lg bg-accent text-white px-3 py-1.5 text-sm disabled:opacity-50"
          >
            {busy ? <Spinner size={14} /> : "추가"}
          </button>
        </div>
      </div>
    </Card>
  );
}

function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    if (next.length < 4) {
      setErr("새 비밀번호는 4자 이상이어야 합니다.");
      return;
    }
    if (next !== confirm) {
      setErr("새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    setBusy(true);
    try {
      await fetchJSON("/api/password", {
        method: "POST",
        body: JSON.stringify({ current, next }),
      });
      setMsg("변경되었습니다.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="font-semibold mb-3">비밀번호 변경</h2>
      <form onSubmit={submit} className="space-y-2 max-w-sm">
        <input
          type="password"
          placeholder="현재 비밀번호"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className="w-full rounded-lg bg-bg border border-border px-3 py-2"
        />
        <input
          type="password"
          placeholder="새 비밀번호 (4자 이상)"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className="w-full rounded-lg bg-bg border border-border px-3 py-2"
        />
        <input
          type="password"
          placeholder="새 비밀번호 확인"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-lg bg-bg border border-border px-3 py-2"
        />
        {msg && <p className="text-emerald-500 text-sm">{msg}</p>}
        {err && <p className="text-red-500 text-sm">{err}</p>}
        <button
          disabled={busy || !current || !next}
          className="rounded-lg bg-accent text-white px-4 py-2 text-sm disabled:opacity-50"
        >
          {busy ? <Spinner size={14} /> : "변경"}
        </button>
      </form>
    </Card>
  );
}
