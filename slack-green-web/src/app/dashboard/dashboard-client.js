"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Groble 결제 페이지. 구독 버튼이 ?ref=<userId> 를 붙여 이 링크로 보낸다.
// 활성화는 Groble 웹훅(/api/webhooks/groble)이 sellerReference 로 처리한다.
const PAYMENT_URL = process.env.NEXT_PUBLIC_PAYMENT_URL;

// 정기결제 해지 페이지(Groble 구매내역 등). 미설정이면 결제 페이지로 보낸다.
// 정기결제는 사용자가 스스로 해지할 수단 제공이 필수다.
const CANCEL_URL = process.env.NEXT_PUBLIC_CANCEL_URL;

const DAYS = [
  { v: 1, l: "월" },
  { v: 2, l: "화" },
  { v: 3, l: "수" },
  { v: 4, l: "목" },
  { v: 5, l: "금" },
  { v: 6, l: "토" },
  { v: 0, l: "일" },
];

const STATUS_LABEL = {
  active: "활성 · 초록불 유지 중",
  paused: "일시정지",
  error: "오류",
  pending: "연결 대기",
  needs_reauth: "재인증 필요",
};

// 상태 → Verdana Health 상태 칩 (DESIGN.md > Chips)
const STATUS_CHIP = {
  active: "chip-success",
  paused: "chip-filter",
  error: "chip-error",
  pending: "chip-warning",
  needs_reauth: "chip-error",
};

export default function DashboardClient({ email, devFallback }) {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sub, setSub] = useState(null);
  const [subBusy, setSubBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // 플랜별 워크스페이스 한도 (구독 로드 후 확정). Free 1 / Pro 3.
  const maxConn = sub?.maxConnections;
  const atLimit = maxConn != null && items.length >= maxConn;

  // 세션이 만료되면 API가 401을 준다 → 로그인으로 돌려보낸다.
  async function getJson(url, init) {
    const res = await fetch(url, init);
    if (res.status === 401) {
      router.push("/login?next=/dashboard");
      return null;
    }
    return res;
  }

  async function refresh() {
    const [c, s] = await Promise.all([
      getJson("/api/connections"),
      getJson("/api/subscription"),
    ]);
    if (!c || !s) return;
    const conns = await c.json();
    const subs = await s.json();
    setItems(conns.items || []);
    setSub(subs);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 결제는 Groble 결제 페이지에서 진행한다. 앱 안에는 상태를 바꾸는 결제 API가 없고
  // (있으면 무인증으로 Pro를 켤 수 있다), Groble 웹훅이 구독을 활성화한다.
  //
  // ?ref=<userId> 가 핵심이다: 이 값이 웹훅의 sellerReference 로 돌아오므로 결제
  // 이메일이 가입 이메일과 달라도 정확히 이 계정에 적용된다.
  function subscribe() {
    if (!PAYMENT_URL) {
      alert("결제 페이지가 아직 설정되지 않았습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    let href = PAYMENT_URL;
    if (sub?.userId) {
      try {
        const u = new URL(PAYMENT_URL);
        u.searchParams.set("ref", sub.userId);
        href = u.toString();
      } catch {
        /* PAYMENT_URL 형식이 이상하면 ref 없이라도 결제는 되게 둔다 */
      }
    }
    window.open(href, "_blank", "noopener,noreferrer");
  }

  async function toggle(item) {
    await getJson(`/api/connections/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !item.enabled }),
    });
    refresh();
  }

  async function remove(item) {
    if (!confirm(`"${item.teamName}" 연결을 삭제할까요?`)) return;
    await getJson(`/api/connections/${item.id}`, { method: "DELETE" });
    refresh();
  }

  // EditForm이 호출. 성공하면 Response(ok), 실패하면 !ok Response, 401이면 null.
  async function saveEdit(id, body) {
    return getJson(`/api/connections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  return (
    <div className="dash container">
      <div className="dash-head">
        <Link className="brand" href="/">
          <span className="dot" /> Green Bean
        </Link>
        <div className="dash-actions">
          <span className="account" title={email}>
            {email}
          </span>
          {devFallback ? (
            <span className="chip chip-warning">개발 모드</span>
          ) : (
            <form action="/auth/signout" method="post">
              <button className="btn btn-sm btn-ghost" type="submit">
                로그아웃
              </button>
            </form>
          )}
          <button
            className="btn btn-primary"
            onClick={() => setShowForm((s) => !s)}
            disabled={!showForm && atLimit}
            title={
              atLimit
                ? `현재 플랜 한도(${maxConn}개)에 도달했습니다`
                : undefined
            }
          >
            {showForm ? "닫기" : "+ 워크스페이스 연결"}
          </button>
        </div>
      </div>

      <div className="dash-title">
        <h1>연결된 워크스페이스</h1>
        <p className="muted">
          근무시간에 맞춰 Slack 상태를 자동으로 유지합니다.
          {!loading && maxConn != null && ` · ${items.length}/${maxConn}`}
          {atLimit && " (최대)"}
        </p>
      </div>

      {sub && <SubBanner sub={sub} busy={subBusy} onSubscribe={subscribe} />}

      {/* 결제 안내. 결제 전에 읽혀야 하는 내용이라 상시 노출한다. */}
      {PAYMENT_URL && sub && sub.status !== "active" && (
        <div className="notice" style={{ marginTop: 12 }}>
          <span aria-hidden="true">💳</span>
          <p style={{ margin: 0 }}>
            결제는 결제대행 서비스(Groble)에서 진행됩니다. 이 버튼으로 결제하면
            계정이 자동으로 연결되어, 결제 확인 후 <strong>몇 분 안에</strong> Pro가
            켜집니다(화면을 새로고침해 주세요). 월 단위 자동 갱신이며 언제든 해지할
            수 있습니다.
          </p>
        </div>
      )}

      {showForm && (
        <AddForm
          onCreated={() => {
            setShowForm(false);
            refresh();
          }}
        />
      )}

      {loading ? (
        <p className="muted" style={{ marginTop: 24 }}>
          불러오는 중…
        </p>
      ) : items.length === 0 ? (
        <div className="empty">
          아직 연결된 워크스페이스가 없습니다.
          <br />
          <strong>브라우저 확장</strong>을 설치하면 클릭 한 번에 연결됩니다.
          <div style={{ marginTop: 16 }}>
            <a className="btn btn-primary btn-sm" href="/guide">
              설치 가이드 보기
            </a>
          </div>
        </div>
      ) : (
        <div className="conn-list">
          {items.map((item) => (
            <div key={item.id}>
            <div className="conn"><div className="meta">
                <span className="name">{item.teamName}</span>
                <span className="sub">
                  {formatSchedule(item.schedule)} · 토큰{" "}
                  <span className="mono">{item.xoxcMasked}</span>
                </span>
                {item.status === "needs_reauth" ? (
                  <span className="sub err">
                    ⚠ 토큰이 만료됐습니다. <a href="/guide">확장으로 다시 연결</a>하면
                    복구됩니다.
                  </span>
                ) : (
                  item.error && <span className="sub err">⚠ {item.error}</span>
                )}
              </div>
              <div className="actions">
                <span
                  className={`chip ${STATUS_CHIP[item.status] || "chip-filter"}`}
                >
                  {STATUS_LABEL[item.status] || item.status}
                </span>
                <button
                  type="button"
                  className={`toggle ${item.enabled ? "on" : ""}`}
                  role="switch"
                  aria-checked={item.enabled}
                  aria-label={`${item.teamName} 초록불 유지`}
                  onClick={() => toggle(item)}
                  title={
                    item.enabled
                      ? "켜짐 — 클릭해서 끄기"
                      : "꺼짐 — 클릭해서 켜기"
                  }
                />
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() =>
                    setEditingId((id) => (id === item.id ? null : item.id))
                  }
                >
                  {editingId === item.id ? "취소" : "수정"}
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => remove(item)}
                >
                  삭제
                </button>
              </div>
            </div>
            {editingId === item.id && (
              <EditForm
                connection={item}
                onSave={saveEdit}
                onSaved={() => {
                  setEditingId(null);
                  refresh();
                }}
                onCancel={() => setEditingId(null)}
              />
            )}
            </div>
          ))}
        </div>
      )}

      <p className="muted" style={{ marginTop: 24, fontSize: 12 }}>
        상태는 워커가 실제로 Slack에 연결되면 갱신됩니다. 토큰은 암호화되어
        저장되며 화면에는 일부만 표시됩니다.
      </p>
    </div>
  );
}

function SubBanner({ sub, busy, onSubscribe }) {
  // 유료 구독 중
  if (sub.status === "active" && sub.entitled) {
    return (
      <div className="banner active">
        <div>
          <div className="b-title">
            <span className="dot" /> Pro 구독 중
          </div>
          <div className="b-sub">
            다음 결제일{" "}
            <span className="mono">{fmtDate(sub.currentPeriodEnd)}</span> · 월 ₩
            {sub.priceKrw.toLocaleString()} 자동 갱신
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="chip chip-success">구독중</span>
          {/* 정기결제는 사용자가 스스로 해지할 수단이 있어야 한다. 결제·해지는
              Groble이 관리하므로 그쪽으로 보낸다. */}
          <a
            className="btn btn-ghost"
            href={CANCEL_URL || PAYMENT_URL || "#"}
            target="_blank"
            rel="noopener noreferrer"
          >
            해지
          </a>
        </div>
      </div>
    );
  }
  // 체험 중
  if (sub.status === "trialing" && sub.entitled) {
    return (
      <div className="banner trial">
        <div>
          <div className="b-title">
            무료 체험 <span className="dday">D-{sub.daysLeft}</span>
          </div>
          <div className="b-sub">
            <span className="mono">{fmtDate(sub.trialEndsAt)}</span>에
            종료됩니다. 이후에도 초록불을 유지하려면 구독하세요.
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={onSubscribe}
          disabled={busy}
        >
          {busy ? "처리 중…" : `Pro 구독 (₩${sub.priceKrw.toLocaleString()}/월)`}
        </button>
      </div>
    );
  }
  // 만료 / 결제필요
  return (
    <div className="banner expired">
      <div>
        <div className="b-title">
          {sub.status === "past_due"
            ? "결제가 필요합니다"
            : "체험이 종료되었습니다"}
        </div>
        <div className="b-sub">
          구독하기 전까지 모든 워크스페이스의 상태 유지가 중지됩니다.
        </div>
      </div>
      <button className="btn btn-primary" onClick={onSubscribe} disabled={busy}>
        {busy
          ? "처리 중…"
          : `구독하고 다시 켜기 (₩${sub.priceKrw.toLocaleString()}/월)`}
      </button>
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function AddForm({ onCreated }) {
  const [teamName, setTeamName] = useState("");
  const [xoxc, setXoxc] = useState("");
  const [xoxd, setXoxd] = useState("");
  const [tz, setTz] = useState("Asia/Seoul");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");
  const [days, setDays] = useState([1, 2, 3, 4, 5]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function toggleDay(v) {
    setDays((d) => (d.includes(v) ? d.filter((x) => x !== v) : [...d, v]));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await fetch("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamName,
        xoxc: xoxc.trim(),
        xoxd: xoxd.trim(),
        schedule: { timezone: tz, days, start, end },
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErr(d.error || "연결에 실패했습니다.");
      return;
    }
    onCreated();
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-head">
        <h3>워크스페이스 연결</h3>
        <p className="muted" style={{ margin: 0 }}>
          자격증명은 암호화되어 저장되고, 메시지 내용에는 접근하지 않습니다.
        </p>
      </div>

      <div className="field">
        <label htmlFor="teamName">워크스페이스 이름</label>
        <input
          id="teamName"
          className="input"
          type="text"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="예: 우리회사"
        />
      </div>

      <div className="field">
        <label htmlFor="xoxc">xoxc 토큰</label>
        <input
          id="xoxc"
          className="input mono"
          type="text"
          value={xoxc}
          onChange={(e) => setXoxc(e.target.value)}
          placeholder="xoxc-..."
        />
        <div className="helper">
          Phase 2 브라우저 확장이 자동으로 입력할 예정입니다.
        </div>
      </div>

      <div className="field">
        <label htmlFor="xoxd">xoxd 쿠키 값</label>
        <input
          id="xoxd"
          className="input mono"
          type="text"
          value={xoxd}
          onChange={(e) => setXoxd(e.target.value)}
          placeholder="xoxd-..."
        />
      </div>

      <ScheduleFields
        tz={tz}
        setTz={setTz}
        days={days}
        toggleDay={toggleDay}
        start={start}
        setStart={setStart}
        end={end}
        setEnd={setEnd}
      />

      {err && <div className="error-text">{err}</div>}

      <div>
        <button className="btn btn-primary" disabled={busy} type="submit">
          {busy ? "연결 중…" : "연결하기"}
        </button>
      </div>
    </form>
  );
}

// 타임존 / 요일 / 시작·종료 시간 편집 UI (연결 추가·수정에서 공용).
function ScheduleFields({ tz, setTz, days, toggleDay, start, setStart, end, setEnd }) {
  return (
    <>
      <div className="row">
        <div className="field">
          <label htmlFor="tz">타임존</label>
          <select id="tz" value={tz} onChange={(e) => setTz(e.target.value)}>
            <option value="Asia/Seoul">Asia/Seoul</option>
            <option value="America/Los_Angeles">America/Los_Angeles</option>
            <option value="America/New_York">America/New_York</option>
            <option value="UTC">UTC</option>
          </select>
        </div>
        <div className="field">
          <label>근무 요일</label>
          <div className="days">
            {DAYS.map((d) => (
              <button
                type="button"
                key={d.v}
                className={`day-chip ${days.includes(d.v) ? "on" : ""}`}
                aria-pressed={days.includes(d.v)}
                onClick={() => toggleDay(d.v)}
              >
                {d.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="row">
        <div className="field">
          <label htmlFor="start">시작</label>
          <input
            id="start"
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="end">종료</label>
          <input
            id="end"
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
      </div>
    </>
  );
}

// 기존 연결의 이름·근무시간 수정. 토큰은 여기서 안 바꾼다(확장으로 재연결).
function EditForm({ connection, onSave, onSaved, onCancel }) {
  const sch = connection.schedule || {};
  const [teamName, setTeamName] = useState(connection.teamName || "");
  const [tz, setTz] = useState(sch.timezone || "Asia/Seoul");
  const [start, setStart] = useState(sch.start || "09:00");
  const [end, setEnd] = useState(sch.end || "18:00");
  const [days, setDays] = useState(sch.days || [1, 2, 3, 4, 5]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function toggleDay(v) {
    setDays((d) => (d.includes(v) ? d.filter((x) => x !== v) : [...d, v]));
  }

  async function submit(e) {
    e.preventDefault();
    if (days.length === 0) {
      setErr("근무 요일을 하나 이상 선택하세요.");
      return;
    }
    setBusy(true);
    setErr("");
    const res = await onSave(connection.id, {
      teamName: teamName.trim() || connection.teamName,
      schedule: { timezone: tz, days, start, end },
    });
    setBusy(false);
    if (!res) return; // 401 → 로그인으로 이동됨
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErr(d.error || "저장에 실패했습니다.");
      return;
    }
    onSaved();
  }

  return (
    <form className="form" onSubmit={submit} style={{ marginTop: 8 }}>
      <div className="form-head">
        <h3>워크스페이스 수정</h3>
        <p className="muted" style={{ margin: 0 }}>
          이름과 근무시간을 변경합니다. 토큰을 다시 연결하려면{" "}
          <a href="/guide">확장</a>을 사용하세요.
        </p>
      </div>

      <div className="field">
        <label htmlFor={`name-${connection.id}`}>워크스페이스 이름</label>
        <input
          id={`name-${connection.id}`}
          className="input"
          type="text"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="예: 우리회사"
        />
      </div>

      <ScheduleFields
        tz={tz}
        setTz={setTz}
        days={days}
        toggleDay={toggleDay}
        start={start}
        setStart={setStart}
        end={end}
        setEnd={setEnd}
      />

      {err && <div className="error-text">{err}</div>}

      <div style={{ display: "flex", gap: "var(--space-sm)" }}>
        <button className="btn btn-primary" disabled={busy} type="submit">
          {busy ? "저장 중…" : "저장"}
        </button>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={onCancel}
          disabled={busy}
        >
          취소
        </button>
      </div>
    </form>
  );
}

function formatSchedule(s) {
  if (!s) return "상시";
  const map = { 0: "일", 1: "월", 2: "화", 3: "수", 4: "목", 5: "금", 6: "토" };
  const days = (s.days || []).map((d) => map[d]).join("");
  return `${days || "매일"} ${s.start}–${s.end} (${s.timezone})`;
}
