/**
 * Generate og-default.png for dansfera.com
 * Pure Node.js — no external dependencies (uses built-in zlib)
 * Creates a 1200x630 PNG with dark biotech theme
 * Output: pdufa/public/og-default.png
 */

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const W = 1200;
const H = 630;

// Colors (RGB)
const BG        = [13,  17,  28];   // #0D111C dark navy
const ACCENT    = [0,  210, 167];   // #00D2A7 teal accent
const TEXT_W    = [255, 255, 255];  // white
const TEXT_G    = [148, 163, 184];  // muted gray
const LINE      = [30,  41,  59];   // divider

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  const table = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c;
    }
    return t;
  })();
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.concat([typeBytes, data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc32(crcBuf), 0);
  return Buffer.concat([len, typeBytes, data, c]);
}

// Build IHDR
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 2;  // color type: RGB
ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

// Build pixel data
// Each row: filter byte (0) + W * 3 bytes RGB
const rowSize = 1 + W * 3;
const imgData = Buffer.alloc(H * rowSize);

// Helper: set pixel (x, y) to color [r, g, b]
function setPixel(x, y, col) {
  const offset = y * rowSize + 1 + x * 3;
  imgData[offset]     = col[0];
  imgData[offset + 1] = col[1];
  imgData[offset + 2] = col[2];
}

// Fill background
for (let y = 0; y < H; y++) {
  imgData[y * rowSize] = 0; // filter type None
  for (let x = 0; x < W; x++) setPixel(x, y, BG);
}

// Draw teal accent bar at top (height: 6px)
for (let y = 0; y < 6; y++)
  for (let x = 0; x < W; x++) setPixel(x, y, ACCENT);

// Draw teal accent bar at bottom (height: 6px)
for (let y = H - 6; y < H; y++)
  for (let x = 0; x < W; x++) setPixel(x, y, ACCENT);

// Draw horizontal divider (1px) at y=500
for (let x = 80; x < W - 80; x++) setPixel(x, 500, LINE);

// Draw teal left border accent (80px wide at left edge, tapered)
for (let y = 6; y < H - 6; y++)
  for (let x = 0; x < 6; x++) setPixel(x, y, ACCENT);

// Simple 5x7 bitmap font for basic text rendering
const FONT_5x7 = {
  ' ': [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],
  'A': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  'B': [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0]],
  'C': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,1],[0,1,1,1,0]],
  'D': [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0]],
  'E': [[1,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
  'F': [[1,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]],
  'G': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,0],[1,0,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  'H': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  'I': [[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,1,1,1]],
  'J': [[1,1,1,1,1],[0,0,0,1,0],[0,0,0,1,0],[0,0,0,1,0],[0,0,0,1,0],[1,0,0,1,0],[0,1,1,0,0]],
  'K': [[1,0,0,0,1],[1,0,0,1,0],[1,0,1,0,0],[1,1,0,0,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],
  'L': [[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
  'M': [[1,0,0,0,1],[1,1,0,1,1],[1,0,1,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  'N': [[1,0,0,0,1],[1,1,0,0,1],[1,0,1,0,1],[1,0,0,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  'O': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  'P': [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]],
  'Q': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,1,0,1],[1,0,0,1,0],[0,1,1,0,1]],
  'R': [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],
  'S': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,0],[0,1,1,1,0],[0,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  'T': [[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
  'U': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  'V': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0]],
  'W': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,1,0,1],[1,0,1,0,1],[1,1,0,1,1],[1,0,0,0,1]],
  'X': [[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,1,0,1,0],[1,0,0,0,1]],
  'Y': [[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
  'Z': [[1,1,1,1,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[0,1,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
  '0': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,1,1],[1,0,1,0,1],[1,1,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  '1': [[0,0,1,0,0],[0,1,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,1,1,1,0]],
  '2': [[0,1,1,1,0],[1,0,0,0,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,1,1,1,1]],
  '3': [[1,1,1,1,1],[0,0,0,1,0],[0,0,1,0,0],[0,0,0,1,0],[0,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  '4': [[0,0,0,1,0],[0,0,1,1,0],[0,1,0,1,0],[1,0,0,1,0],[1,1,1,1,1],[0,0,0,1,0],[0,0,0,1,0]],
  '5': [[1,1,1,1,1],[1,0,0,0,0],[1,1,1,1,0],[0,0,0,0,1],[0,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  '6': [[0,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  '7': [[1,1,1,1,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0]],
  '8': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  '9': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,1],[0,0,0,0,1],[0,0,0,0,1],[0,1,1,1,0]],
  '.': [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,1,1,0,0],[0,1,1,0,0]],
  '|': [[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
  '-': [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[1,1,1,1,1],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],
  '&': [[0,1,1,0,0],[1,0,0,1,0],[1,0,0,1,0],[0,1,1,0,0],[1,0,1,1,0],[1,0,0,1,0],[0,1,1,0,1]],
};

function drawText(text, startX, startY, color, scale) {
  const s = scale || 1;
  let cx = startX;
  for (const ch of text.toUpperCase()) {
    const glyph = FONT_5x7[ch] || FONT_5x7[' '];
    for (let gy = 0; gy < 7; gy++) {
      for (let gx = 0; gx < 5; gx++) {
        if (glyph[gy][gx]) {
          for (let sy = 0; sy < s; sy++)
            for (let sx = 0; sx < s; sx++) {
              const px = cx + gx * s + sx;
              const py = startY + gy * s + sy;
              if (px >= 0 && px < W && py >= 0 && py < H)
                setPixel(px, py, color);
            }
        }
      }
    }
    cx += (5 + 1) * s; // char width + gap
  }
}

// ---- DRAW CONTENT ----

// Title: "DAN SFERA" in large teal text (scale 6)
drawText('DAN SFERA', 100, 80, ACCENT, 6);

// Subtitle bar line
for (let x = 100; x < 650; x++) setPixel(x, 175, ACCENT);

// Subtitle: "BIOTECH CATALYST CALENDAR" (scale 3)
drawText('BIOTECH CATALYST CALENDAR', 100, 200, TEXT_W, 3);

// Year "2026" (scale 5)
drawText('2026', 100, 265, TEXT_G, 5);

// Description line (scale 2)
drawText('FDA PDUFA DATES  &  TRIAL READOUTS', 100, 370, TEXT_G, 2);

// Bottom tagline (scale 2)
drawText('DANSFERA.COM', 100, 530, ACCENT, 2);

// Right side — decorative elements
// Large teal circle outline (right side decoration)
const cx2 = 950, cy2 = 315, r = 180;
for (let angle = 0; angle < 360; angle += 0.5) {
  const rad = angle * Math.PI / 180;
  for (let t = 0; t <= 3; t++) {
    const px = Math.round(cx2 + (r + t) * Math.cos(rad));
    const py = Math.round(cy2 + (r + t) * Math.sin(rad));
    if (px >= 0 && px < W && py >= 0 && py < H) {
      const alpha = t === 0 || t === 3 ? 0.3 : 0.15;
      const blendR = Math.round(BG[0] + (ACCENT[0] - BG[0]) * alpha);
      const blendG = Math.round(BG[1] + (ACCENT[1] - BG[1]) * alpha);
      const blendB = Math.round(BG[2] + (ACCENT[2] - BG[2]) * alpha);
      setPixel(px, py, [blendR, blendG, blendB]);
    }
  }
}

// Inner text in circle
drawText('56+', 893, 260, ACCENT, 5);
drawText('CATALYSTS', 882, 365, TEXT_G, 2);

// ---- ENCODE PNG ----
const compressed = zlib.deflateSync(imgData, { level: 6 });

const pngBuf = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // PNG signature
  chunk('IHDR', ihdr),
  chunk('IDAT', compressed),
  chunk('IEND', Buffer.alloc(0))
]);

const outPath = path.join(__dirname, '..', 'pdufa', 'public', 'og-default.png');
fs.writeFileSync(outPath, pngBuf);
console.log(`✅ OG image generated: ${outPath} (${Math.round(pngBuf.length / 1024)}KB)`);
