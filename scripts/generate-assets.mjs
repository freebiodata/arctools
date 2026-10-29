import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    crc32.table = table;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function makePng(width, height, getPixel) {
  const rowLen = 1 + width * 4;
  const rawData = Buffer.alloc(rowLen * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLen;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData, { level: 9 });

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdr = makeChunk('IHDR', ihdrData);
  const idat = makeChunk('IDAT', deflated);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

function makeIcoFromPng(pngBuf, width, height) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(1, 4); // 1 image

  const entry = Buffer.alloc(16);
  entry[0] = width >= 256 ? 0 : width;
  entry[1] = height >= 256 ? 0 : height;
  entry[2] = 0; // palette
  entry[3] = 0; // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(pngBuf.length, 8); // image size
  entry.writeUInt32LE(22, 12); // image offset

  return Buffer.concat([header, entry, pngBuf]);
}

// 1. Generate 32x32 Favicon PNG & ICO
const favPng = makePng(32, 32, (x, y) => {
  // background dark teal #0f3d3e
  const bg = [0x0f, 0x3d, 0x3e, 255];
  const gold = [0xd9, 0xa4, 0x41, 255];
  // border / rounded rect
  if (x === 0 || x === 31 || y === 0 || y === 31) {
    if ((x <= 2 && y <= 2) || (x >= 29 && y <= 2) || (x <= 2 && y >= 29) || (x >= 29 && y >= 29)) {
      return [0, 0, 0, 0];
    }
  }
  // draw paw claw motif in gold
  const dx = x - 16;
  const dy = y - 16;
  // center circle / pad
  if (dx * dx + (dy - 4) * (dy - 4) <= 25) return gold;
  // claw 1 (left)
  if ((x - 10) * (x - 10) + (y - 10) * (y - 10) <= 9) return gold;
  // claw 2 (center)
  if ((x - 16) * (x - 16) + (y - 8) * (y - 8) <= 10) return gold;
  // claw 3 (right)
  if ((x - 22) * (x - 22) + (y - 10) * (y - 10) <= 9) return gold;
  return bg;
});

const favIco = makeIcoFromPng(favPng, 32, 32);
fs.writeFileSync('public/favicon.ico', favIco);

// 2. Generate 180x180 Apple Touch Icon
const touchPng = makePng(180, 180, (x, y) => {
  const bg = [0x0f, 0x3d, 0x3e, 255];
  const gold = [0xd9, 0xa4, 0x41, 255];
  const amber = [0xf5, 0x9e, 0x0b, 255];

  // rounded corner mask
  const r = 36;
  if (x < r && y < r && (x - r) ** 2 + (y - r) ** 2 > r ** 2) return [0, 0, 0, 0];
  if (x > 180 - r && y < r && (x - (180 - r)) ** 2 + (y - r) ** 2 > r ** 2) return [0, 0, 0, 0];
  if (x < r && y > 180 - r && (x - r) ** 2 + (y - (180 - r)) ** 2 > r ** 2) return [0, 0, 0, 0];
  if (x > 180 - r && y > 180 - r && (x - (180 - r)) ** 2 + (y - (180 - r)) ** 2 > r ** 2) return [0, 0, 0, 0];

  // paw claw center pad
  const cx = 90;
  const cy = 110;
  if ((x - cx) ** 2 + (y - cy) ** 2 <= 34 ** 2) return gold;

  // claws
  if ((x - 55) ** 2 + (y - 65) ** 2 <= 17 ** 2) return amber;
  if ((x - 90) ** 2 + (y - 52) ** 2 <= 19 ** 2) return amber;
  if ((x - 125) ** 2 + (y - 65) ** 2 <= 17 ** 2) return amber;

  return bg;
});
fs.writeFileSync('public/apple-touch-icon.png', touchPng);

// 3. Generate 1200x630 OG Default Image
const ogPng = makePng(1200, 630, (x, y) => {
  // Dark teal to deep slate gradient
  const t = (x + y * 0.5) / (1200 + 315);
  const r = Math.round(15 * (1 - t) + 10 * t);
  const g = Math.round(61 * (1 - t) + 25 * t);
  const b = Math.round(62 * (1 - t) + 40 * t);

  // Border frame
  if (x < 16 || x > 1183 || y < 16 || y > 613) {
    return [217, 164, 65, 255]; // Gold border accent
  }

  // Large center emblem accent
  const cx = 600;
  const cy = 300;
  const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
  if (dist > 180 && dist < 188) {
    return [217, 164, 65, 120];
  }

  // Center paw motif
  if ((x - cx) ** 2 + (y - (cy + 25)) ** 2 <= 65 ** 2) {
    return [217, 164, 65, 255];
  }
  if ((x - (cx - 75)) ** 2 + (y - (cy - 65)) ** 2 <= 32 ** 2) {
    return [245, 158, 11, 255];
  }
  if ((x - cx) ** 2 + (y - (cy - 95)) ** 2 <= 36 ** 2) {
    return [245, 158, 11, 255];
  }
  if ((x - (cx + 75)) ** 2 + (y - (cy - 65)) ** 2 <= 32 ** 2) {
    return [245, 158, 11, 255];
  }

  return [r, g, b, 255];
});
fs.writeFileSync('public/og-default.png', ogPng);

// 4. Generate site.webmanifest
const manifest = {
  name: "ARKTools - ARK Survival Evolved Calculators",
  short_name: "ARKTools",
  description: "Taming, breeding, stat projection, and kibble calculators for ARK: Survival Evolved.",
  start_url: "/",
  display: "standalone",
  background_color: "#0f3d3e",
  theme_color: "#0f3d3e",
  icons: [
    {
      src: "/favicon.svg",
      sizes: "any",
      type: "image/svg+xml"
    },
    {
      src: "/apple-touch-icon.png",
      sizes: "180x180",
      type: "image/png"
    }
  ]
};
fs.writeFileSync('public/site.webmanifest', JSON.stringify(manifest, null, 2));

// 5. Generate _redirects
fs.writeFileSync('public/_redirects', '/sitemap.xml /sitemap-index.xml 301\n');

// 6. Generate IndexNow Key
fs.writeFileSync('public/a1e4b89d6f3c47e2a905183b7492cda5.txt', 'a1e4b89d6f3c47e2a905183b7492cda5\n');

console.log('All static assets generated successfully!');
