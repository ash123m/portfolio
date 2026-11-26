/* ==========================================================================
   Pure JavaScript ISO/IEC 18004 QR Code Encoder (Model 2, Byte Mode, V1-V10)
   Zero external APIs or dependencies.
   ========================================================================== */
(function (global) {
  'use strict';

  const EC_LEVEL_M = 0; // ~15% recovery (clean, high-density scan reliability)
  const EC_LEVEL_H = 2; // ~30% recovery (ideal for printed posters)

  // Version capacities (total codewords, ec codewords per block, [numBlocksG1, dataPerG1, numBlocksG2, dataPerG2])
  // Index = version (1..10)
  const VERSION_TABLE = {
    // Format: [ecPerBlock, blocksG1, dataG1, blocksG2, dataG2]
    M: [
      null,
      [10, 1, 16, 0, 0],
      [16, 1, 28, 0, 0],
      [26, 1, 44, 0, 0],
      [18, 2, 32, 0, 0],
      [24, 2, 43, 0, 0],
      [16, 4, 27, 0, 0],
      [18, 4, 31, 0, 0],
      [22, 2, 38, 2, 39],
      [22, 3, 36, 2, 37],
      [26, 4, 43, 1, 44]
    ],
    H: [
      null,
      [17, 1, 9, 0, 0],
      [28, 1, 16, 0, 0],
      [22, 2, 13, 0, 0],
      [16, 4, 9, 0, 0],
      [22, 2, 11, 2, 12],
      [28, 4, 15, 0, 0],
      [26, 4, 13, 1, 14],
      [26, 4, 14, 2, 15],
      [24, 4, 12, 4, 13],
      [28, 6, 15, 2, 16]
    ]
  };

  const ALIGNMENT_PATTERNS = [
    null,
    [],
    [6, 18],
    [6, 22],
    [6, 26],
    [6, 30],
    [6, 34],
    [6, 22, 38],
    [6, 24, 42],
    [6, 26, 46],
    [6, 28, 50]
  ];

  // GF(256) log / exp tables with primitive polynomial 0x11D
  const GF_EXP = new Uint8Array(512);
  const GF_LOG = new Uint8Array(256);
  (() => {
    let x = 1;
    for (let i = 0; i < 255; i += 1) {
      GF_EXP[i] = x;
      GF_LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i += 1) {
      GF_EXP[i] = GF_EXP[i - 255];
    }
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return GF_EXP[GF_LOG[a] + GF_LOG[b]];
  }

  function rsGeneratorPoly(degree) {
    let poly = [1];
    for (let i = 0; i < degree; i += 1) {
      const next = new Array(poly.length + 1).fill(0);
      const factor = GF_EXP[i];
      for (let j = 0; j < poly.length; j += 1) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], factor);
      }
      poly = next;
    }
    return poly;
  }

  function rsEncode(data, ecCount) {
    const gen = rsGeneratorPoly(ecCount);
    const res = new Uint8Array(data.length + ecCount);
    res.set(data, 0);
    for (let i = 0; i < data.length; i += 1) {
      const coef = res[i];
      if (coef !== 0) {
        for (let j = 0; j < gen.length; j += 1) {
          res[i + j] ^= gfMul(gen[j], coef);
        }
      }
    }
    return res.slice(data.length);
  }

  function toUtf8Bytes(str) {
    if (typeof TextEncoder !== 'undefined') {
      return Array.from(new TextEncoder().encode(str));
    }
    const bytes = [];
    for (let i = 0; i < str.length; i += 1) {
      bytes.push(str.charCodeAt(i) & 0xff);
    }
    return bytes;
  }

  function pickVersion(byteLen, ecKey) {
    const table = VERSION_TABLE[ecKey];
    for (let v = 1; v <= 10; v += 1) {
      const [, b1, d1, b2, d2] = table[v];
      const totalDataBytes = b1 * d1 + b2 * d2;
      const headerBits = 4 + (v <= 9 ? 8 : 16);
      const maxBytes = Math.floor((totalDataBytes * 8 - headerBits) / 8);
      if (byteLen <= maxBytes) return v;
    }
    return null;
  }

  function buildCodewords(bytes, version, ecKey) {
    const [ecPerBlock, b1, d1, b2, d2] = VERSION_TABLE[ecKey][version];
    const totalDataBytes = b1 * d1 + b2 * d2;
    const bits = [];

    const pushBits = (val, len) => {
      for (let i = len - 1; i >= 0; i -= 1) {
        bits.push((val >>> i) & 1);
      }
    };

    // Mode 0100 (Byte)
    pushBits(0b0100, 4);
    pushBits(bytes.length, version <= 9 ? 8 : 16);
    bytes.forEach((b) => pushBits(b, 8));

    // Terminator
    const capacityBits = totalDataBytes * 8;
    const terminatorLen = Math.min(4, capacityBits - bits.length);
    pushBits(0, terminatorLen);

    // Byte align
    while (bits.length % 8 !== 0) bits.push(0);

    // Pad bytes 0xEC, 0x11
    const padBytes = [0xec, 0x11];
    let padIdx = 0;
    while (bits.length < capacityBits) {
      pushBits(padBytes[padIdx % 2], 8);
      padIdx += 1;
    }

    const dataBytes = new Uint8Array(totalDataBytes);
    for (let i = 0; i < totalDataBytes; i += 1) {
      let b = 0;
      for (let bit = 0; bit < 8; bit += 1) {
        b = (b << 1) | bits[i * 8 + bit];
      }
      dataBytes[i] = b;
    }

    // Split into blocks & compute Reed-Solomon EC
    const dataBlocks = [];
    const ecBlocks = [];
    let offset = 0;
    for (let i = 0; i < b1; i += 1) {
      const slice = dataBytes.slice(offset, offset + d1);
      offset += d1;
      dataBlocks.push(slice);
      ecBlocks.push(rsEncode(slice, ecPerBlock));
    }
    for (let i = 0; i < b2; i += 1) {
      const slice = dataBytes.slice(offset, offset + d2);
      offset += d2;
      dataBlocks.push(slice);
      ecBlocks.push(rsEncode(slice, ecPerBlock));
    }

    // Interleave
    const result = [];
    const maxDataLen = Math.max(d1, d2);
    for (let i = 0; i < maxDataLen; i += 1) {
      dataBlocks.forEach((blk) => {
        if (i < blk.length) result.push(blk[i]);
      });
    }
    for (let i = 0; i < ecPerBlock; i += 1) {
      ecBlocks.forEach((blk) => {
        result.push(blk[i]);
      });
    }
    return result;
  }

  function createMatrix(version) {
    const size = version * 4 + 17;
    const modules = Array.from({ length: size }, () => new Int8Array(size).fill(-1));
    const isFunction = Array.from({ length: size }, () => new Uint8Array(size));

    const setFunc = (r, c, val) => {
      if (r >= 0 && r < size && c >= 0 && c < size) {
        modules[r][c] = val ? 1 : 0;
        isFunction[r][c] = 1;
      }
    };

    const drawFinder = (top, left) => {
      for (let r = -1; r <= 7; r += 1) {
        for (let c = -1; c <= 7; c += 1) {
          const rr = top + r;
          const cc = left + c;
          if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
          const inOuter = r >= 0 && r <= 6 && c >= 0 && c <= 6 && (r === 0 || r === 6 || c === 0 || c === 6);
          const inCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          setFunc(rr, cc, inOuter || inCenter);
        }
      }
    };

    const drawAlignment = (centerR, centerC) => {
      for (let r = -2; r <= 2; r += 1) {
        for (let c = -2; c <= 2; c += 1) {
          const onBorder = Math.abs(r) === 2 || Math.abs(c) === 2;
          const isCenter = r === 0 && c === 0;
          setFunc(centerR + r, centerC + c, onBorder || isCenter);
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    // Alignment patterns
    const coords = ALIGNMENT_PATTERNS[version];
    for (let i = 0; i < coords.length; i += 1) {
      for (let j = 0; j < coords.length; j += 1) {
        const r = coords[i];
        const c = coords[j];
        if ((r <= 8 && c <= 8) || (r <= 8 && c >= size - 9) || (r >= size - 9 && c <= 8)) {
          continue;
        }
        drawAlignment(r, c);
      }
    }

    // Timing patterns
    for (let i = 8; i < size - 8; i += 1) {
      if (!isFunction[6][i]) setFunc(6, i, i % 2 === 0);
      if (!isFunction[i][6]) setFunc(i, 6, i % 2 === 0);
    }

    // Dark module
    setFunc(size - 8, 8, true);

    // Reserve format info cells
    for (let i = 0; i < 9; i += 1) {
      if (i !== 6) {
        isFunction[8][i] = 1;
        isFunction[i][8] = 1;
      }
    }
    for (let i = size - 8; i < size; i += 1) {
      isFunction[8][i] = 1;
      isFunction[i][8] = 1;
    }

    // Reserve version info cells (v >= 7)
    if (version >= 7) {
      for (let i = 0; i < 6; i += 1) {
        for (let j = 0; j < 3; j += 1) {
          isFunction[i][size - 11 + j] = 1;
          isFunction[size - 11 + j][i] = 1;
        }
      }
    }

    return { size, modules, isFunction };
  }

  function placeData(matrix, codewords) {
    const { size, modules, isFunction } = matrix;
    let bitIdx = 0;
    const totalBits = codewords.length * 8;
    let dir = -1;

    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right -= 1;
      for (let vert = 0; vert < size; vert += 1) {
        const r = dir === -1 ? size - 1 - vert : vert;
        for (let lr = 0; lr < 2; lr += 1) {
          const c = right - lr;
          if (!isFunction[r][c]) {
            let bit = 0;
            if (bitIdx < totalBits) {
              const byte = codewords[bitIdx >>> 3];
              bit = (byte >>> (7 - (bitIdx & 7))) & 1;
              bitIdx += 1;
            }
            modules[r][c] = bit;
          }
        }
      }
      dir = -dir;
    }
  }

  function maskCondition(mask, r, c) {
    switch (mask) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return ((r * c) % 2 + (r * c) % 3) === 0;
      case 6: return (((r * c) % 2 + (r * c) % 3) % 2) === 0;
      case 7: return (((r + c) % 2 + (r * c) % 3) % 2) === 0;
      default: return false;
    }
  }

  function writeFormatAndVersion(modules, size, version, ecLevelBits, mask) {
    // Format bits: 2-bit EC + 3-bit mask, BCH(15,5), XOR 0x5412
    const data = (ecLevelBits << 3) | mask;
    let rem = data << 10;
    for (let i = 14; i >= 10; i -= 1) {
      if ((rem >>> i) & 1) rem ^= 0x537 << (i - 10);
    }
    const formatBits = ((data << 10) | rem) ^ 0x5412;

    for (let i = 0; i <= 5; i += 1) modules[8][i] = (formatBits >>> (14 - i)) & 1;
    modules[8][7] = (formatBits >>> 8) & 1;
    modules[8][8] = (formatBits >>> 7) & 1;
    modules[7][8] = (formatBits >>> 6) & 1;
    for (let i = 9; i <= 14; i += 1) modules[14 - i][8] = (formatBits >>> (14 - i)) & 1;

    for (let i = 0; i <= 6; i += 1) modules[size - 1 - i][8] = (formatBits >>> (14 - i)) & 1;
    for (let i = 7; i <= 14; i += 1) modules[8][size - 15 + i] = (formatBits >>> (14 - i)) & 1;

    if (version >= 7) {
      let vrem = version << 12;
      for (let i = 17; i >= 12; i -= 1) {
        if ((vrem >>> i) & 1) vrem ^= 0x1f25 << (i - 12);
      }
      const vbits = (version << 12) | vrem;
      for (let i = 0; i < 18; i += 1) {
        const bit = (vbits >>> i) & 1;
        const r = Math.floor(i / 3);
        const c = size - 11 + (i % 3);
        modules[r][c] = bit;
        modules[c][r] = bit;
      }
    }
  }

  function penaltyScore(modules, size) {
    let score = 0;

    // Rule 1: runs of 5+ same color
    for (let r = 0; r < size; r += 1) {
      let runColor = modules[r][0];
      let runLen = 1;
      for (let c = 1; c < size; c += 1) {
        if (modules[r][c] === runColor) {
          runLen += 1;
        } else {
          if (runLen >= 5) score += 3 + (runLen - 5);
          runColor = modules[r][c];
          runLen = 1;
        }
      }
      if (runLen >= 5) score += 3 + (runLen - 5);
    }
    for (let c = 0; c < size; c += 1) {
      let runColor = modules[0][c];
      let runLen = 1;
      for (let r = 1; r < size; r += 1) {
        if (modules[r][c] === runColor) {
          runLen += 1;
        } else {
          if (runLen >= 5) score += 3 + (runLen - 5);
          runColor = modules[r][c];
          runLen = 1;
        }
      }
      if (runLen >= 5) score += 3 + (runLen - 5);
    }

    // Rule 2: 2x2 blocks
    for (let r = 0; r < size - 1; r += 1) {
      for (let c = 0; c < size - 1; c += 1) {
        const v = modules[r][c];
        if (v === modules[r][c + 1] && v === modules[r + 1][c] && v === modules[r + 1][c + 1]) {
          score += 3;
        }
      }
    }

    // Rule 3: finder-like patterns
    const pat1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    const pat2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c <= size - 11; c += 1) {
        let m1 = true;
        let m2 = true;
        for (let k = 0; k < 11; k += 1) {
          if (modules[r][c + k] !== pat1[k]) m1 = false;
          if (modules[r][c + k] !== pat2[k]) m2 = false;
        }
        if (m1 || m2) score += 40;
      }
    }
    for (let c = 0; c < size; c += 1) {
      for (let r = 0; r <= size - 11; r += 1) {
        let m1 = true;
        let m2 = true;
        for (let k = 0; k < 11; k += 1) {
          if (modules[r + k][c] !== pat1[k]) m1 = false;
          if (modules[r + k][c] !== pat2[k]) m2 = false;
        }
        if (m1 || m2) score += 40;
      }
    }

    // Rule 4: dark ratio
    let dark = 0;
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (modules[r][c]) dark += 1;
      }
    }
    const percent = (dark * 100) / (size * size);
    const k = Math.abs(Math.floor(percent / 5) * 5 - 50) / 5;
    score += k * 10;

    return score;
  }

  function encodeQR(text, ecKey = 'H') {
    const bytes = toUtf8Bytes(text);
    const chosenEc = VERSION_TABLE[ecKey] ? ecKey : 'H';
    let version = pickVersion(bytes.length, chosenEc);
    let finalEc = chosenEc;

    if (!version && chosenEc === 'H') {
      version = pickVersion(bytes.length, 'M');
      finalEc = 'M';
    }
    if (!version) {
      throw new Error('URL is too long for QR Version 1-10.');
    }

    const codewords = buildCodewords(bytes, version, finalEc);
    const base = createMatrix(version);
    placeData(base, codewords);

    const ecLevelBits = finalEc === 'H' ? EC_LEVEL_H : EC_LEVEL_M;
    let bestMask = 0;
    let bestScore = Infinity;
    let bestModules = null;

    for (let mask = 0; mask < 8; mask += 1) {
      const candidate = base.modules.map((row) => Int8Array.from(row));
      for (let r = 0; r < base.size; r += 1) {
        for (let c = 0; c < base.size; c += 1) {
          if (!base.isFunction[r][c] && maskCondition(mask, r, c)) {
            candidate[r][c] ^= 1;
          }
        }
      }
      writeFormatAndVersion(candidate, base.size, version, ecLevelBits, mask);
      const s = penaltyScore(candidate, base.size);
      if (s < bestScore) {
        bestScore = s;
        bestMask = mask;
        bestModules = candidate;
      }
    }

    return {
      version,
      ecLevel: finalEc,
      mask: bestMask,
      size: base.size,
      modules: bestModules
    };
  }

  global.PIMQR = { encodeQR };
})(window);
