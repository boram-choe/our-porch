// 로고 원본(public/brand/logo.svg)에서 PNG 파일들을 만든다.  사용: node scripts/make-brand-assets.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sharp = require("sharp");

const root = path.resolve(import.meta.dirname, "..");
const brand = path.join(root, "public", "brand");
const svg = fs.readFileSync(path.join(brand, "logo.svg"));

const render = (size, out) => sharp(svg, { density: Math.ceil((72 * size) / 64) }).resize(size, size).png().toFile(out);

for (const s of [180, 192, 512, 1024]) await render(s, path.join(brand, `logo-${s}.png`));
fs.copyFileSync(path.join(brand, "logo-180.png"), path.join(root, "src", "app", "apple-icon.png"));
fs.copyFileSync(path.join(brand, "logo-512.png"), path.join(root, "public", "images", "logo.png"));

// 링크 공유용 이미지 1200x630
const mark = await sharp(svg, { density: 400 }).resize(300, 300).png().toBuffer();
const og = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#020617"/>
  <text x="470" y="320" font-family="Malgun Gothic, Pretendard, sans-serif" font-size="120" font-weight="700" fill="#FBBF24">여긴뭐가</text>
  <text x="474" y="395" font-family="Malgun Gothic, Pretendard, sans-serif" font-size="34" fill="#CBD5E1">우리 동네 빈 가게, 뭐가 생기면 좋을까요?</text>
</svg>`);
await sharp({ create: { width: 1200, height: 630, channels: 4, background: "#020617" } })
  .composite([{ input: og }, { input: mark, left: 120, top: 165 }])
  .png().toFile(path.join(root, "public", "og-image.png"));
console.log("done");
