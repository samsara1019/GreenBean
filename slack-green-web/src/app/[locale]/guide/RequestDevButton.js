"use client";

import { useEffect, useState } from "react";

// "정식 개발 요청하기" — 클릭 시 /api/interest 에 기록되고 Slack 알림이 간다.
// 수요 검증용. 중복 스팸 방지로 한 번 요청하면 localStorage에 표시해 완료 상태로 둔다.
export default function RequestDevButton() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | done | error

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("gb_requested") === "1") {
      setState("done");
    }
  }, []);

  async function submit() {
    if (state === "sending" || state === "done") return;
    setState("sending");
    try {
      const res = await fetch("/api/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email: email.trim(), source: "guide" }),
      });
      if (!res.ok) throw new Error("failed");
      localStorage.setItem("gb_requested", "1");
      setState("done");
    } catch {
      setState("error");
    }
  }

  const box = {
    marginTop: "var(--space-md)",
    padding: "var(--space-lg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    background: "var(--surface)",
  };

  if (state === "done") {
    return (
      <div style={box}>
        <p className="t-h4" style={{ margin: "0 0 4px" }}>🎉 요청 완료! 감사합니다.</p>
        <p className="muted" style={{ margin: 0 }}>
          정식 버전이 준비되면 가장 먼저 알려드릴게요
          {email ? " (남겨주신 이메일로)" : ""}.
        </p>
      </div>
    );
  }

  return (
    <div style={box}>
      <p className="t-h4" style={{ margin: "0 0 4px" }}>
        정식 버전, 기다리고 계신가요?
      </p>
      <p className="muted" style={{ margin: "0 0 var(--space-md)" }}>
        요청이 많을수록 정식 출시가 빨라집니다. 출시 알림을 받으려면 이메일을
        남겨주세요 (선택).
      </p>
      <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap" }}>
        <input
          className="input"
          type="email"
          inputMode="email"
          placeholder="이메일 (선택)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ flex: "1 1 220px", minWidth: 0 }}
        />
        <button
          className="btn btn-lg btn-primary"
          onClick={submit}
          disabled={state === "sending"}
        >
          {state === "sending" ? "보내는 중…" : "정식 개발 요청하기 🙋"}
        </button>
      </div>
      {state === "error" && (
        <p className="error-text" style={{ marginBottom: 0 }}>
          전송에 실패했어요. 잠시 후 다시 시도해 주세요.
        </p>
      )}
    </div>
  );
}
