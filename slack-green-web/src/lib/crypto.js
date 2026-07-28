import crypto from "node:crypto";

// AES-256-GCM. Slack 자격증명(xoxc/xoxd)은 사실상 계정 전체 접근 권한이므로
// 평문 저장 절대 금지 — 반드시 이 모듈을 거쳐 암호화한 뒤 DB에 넣는다.
//
// APP_ENCRYPTION_KEY: 32바이트를 hex(64자)로. 없으면 개발 편의를 위해 임시
// 키를 쓰되, 프로덕션에서는 반드시 설정할 것(아래 경고 출력).

function getKey() {
  const hex = process.env.APP_ENCRYPTION_KEY;
  if (hex && hex.length === 64) return Buffer.from(hex, "hex");
  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_ENCRYPTION_KEY (hex 64자)가 프로덕션에 설정되지 않았습니다.");
  }
  // 개발용 고정 키 (경고). 실제 데이터에 쓰지 말 것.
  console.warn("[crypto] APP_ENCRYPTION_KEY 미설정 — 개발용 임시 키 사용 중.");
  return crypto.createHash("sha256").update("dev-only-insecure-key").digest();
}

export function encrypt(plain) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // iv.tag.cipher 를 base64로 이어붙여 한 문자열로 저장
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(".");
}

export function decrypt(payload) {
  const key = getKey();
  const [ivB64, tagB64, dataB64] = String(payload).split(".");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

// 대시보드에 토큰 원문을 절대 돌려보내지 않기 위한 마스킹.
export function mask(token) {
  if (!token) return "";
  const s = String(token);
  if (s.length <= 12) return "••••";
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}
