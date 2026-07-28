// 의존성 없이 확장 아이콘(PNG)을 생성한다. Node 내장 zlib만 사용.
// 네이비 라운드 사각형 배경 + 초록 원(초록불) — 브랜드와 일치.
// 실행: node tools/generate-icons.mjs  → icons/icon{16,48,128}.png

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "..", "icons");
mkdirSync(outDir, { recursive: true });

const NAVY = [15, 23, 42]; // #0F172A
const GREEN = [34, 197, 94]; // #22C55E

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // rows with filter byte 0 prefix
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// 부드러운 가장자리를 위한 커버리지(0~1). d<r-1 →1, d>r →0, 사이는 선형.
function coverage(d, r) {
  if (d <= r - 1) return 1;
  if (d >= r) return 0;
  return r - d;
}

function makeIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const radius = size * 0.22; // 라운드 코너
  const cx = size / 2;
  const cy = size / 2;
  const dotR = size * 0.28;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const px = x + 0.5;
      const py = y + 0.5;

      // 라운드 사각형 배경 알파
      const rx = Math.max(radius - px, px - (size - radius), 0);
      const ry = Math.max(radius - py, py - (size - radius), 0);
      const cornerDist = Math.hypot(rx, ry);
      const bgA = radius > 0 ? coverage(cornerDist, radius) : 1;

      // 초록 원
      const dotDist = Math.hypot(px - cx, py - cy);
      const dotA = coverage(dotDist, dotR);

      // 합성: 초록 원을 네이비 위에
      const baseA = bgA;
      const [br, bg, bb] = NAVY;
      const [dr, dg, db] = GREEN;
      const r = Math.round(br * (1 - dotA) + dr * dotA);
      const g = Math.round(bg * (1 - dotA) + dg * dotA);
      const b = Math.round(bb * (1 - dotA) + db * dotA);
      const a = Math.round(255 * Math.max(baseA, dotA));

      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = a;
    }
  }
  return encodePNG(size, rgba);
}

for (const size of [16, 48, 128]) {
  const png = makeIcon(size);
  writeFileSync(resolve(outDir, `icon${size}.png`), png);
  console.log(`wrote icons/icon${size}.png (${png.length} bytes)`);
}
