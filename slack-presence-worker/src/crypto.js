import crypto from "node:crypto";

// 웹앱(slack-green-web)의 lib/crypto.js와 동일한 방식(AES-256-GCM).
// 웹앱이 암호화해 DB에 넣은 토큰을 워커가 복호화해서 쓴다.
// 반드시 웹앱과 "같은" APP_ENCRYPTION_KEY를 공유해야 한다.

function getKey() {
  const hex = process.env.APP_ENCRYPTION_KEY;
  if (hex && hex.length === 64) return Buffer.from(hex, "hex");
  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_ENCRYPTION_KEY (hex 64자)가 설정되지 않았습니다.");
  }
  return crypto.createHash("sha256").update("dev-only-insecure-key").digest();
}

export function decrypt(payload) {
  const key = getKey();
  const [ivB64, tagB64, dataB64] = String(payload).split(".");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivB64, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
