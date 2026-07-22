// ============================================
// Barcode & QR Code SVG Generation Utilities
// Pure TypeScript - no external dependencies
// ============================================

export type BarcodeSymbology = 'code128' | 'code39' | 'interleaved2of5' | 'upc_a' | 'ean13';

export interface ItemIdSettings {
  prefix: string;
  minDigits: number;
  showItemId: boolean;
  showQrCode: boolean;
  showBarcode: boolean;
  barcodeSymbology: BarcodeSymbology;
}

export const DEFAULT_ITEM_ID_SETTINGS: ItemIdSettings = {
  prefix: '',
  minDigits: 6,
  showItemId: true,
  showQrCode: false,
  showBarcode: false,
  barcodeSymbology: 'code128',
};

export const BARCODE_SYMBOLOGIES: { value: BarcodeSymbology; label: string; description: string }[] = [
  { value: 'code128', label: 'Code 128', description: 'High-density alphanumeric barcode' },
  { value: 'code39', label: 'Code 39 (3 of 9)', description: 'Alphanumeric, widely used in non-retail' },
  { value: 'interleaved2of5', label: 'Interleaved 2 of 5', description: 'Numeric only, compact' },
  { value: 'upc_a', label: 'UPC-A', description: 'Retail, 12 numeric digits' },
  { value: 'ean13', label: 'EAN-13', description: 'International retail, 13 digits' },
];

// ============================================
// CODE 128 BARCODE ENCODER
// ============================================
const CODE128_PATTERNS: Record<number, string> = {
  0: '11011001100', 1: '11001101100', 2: '11001100110', 3: '10010011000',
  4: '10010001100', 5: '10001001100', 6: '10011001000', 7: '10011000100',
  8: '10001100100', 9: '11001001000', 10: '11001000100', 11: '11000100100',
  12: '10110011100', 13: '10011011100', 14: '10011001110', 15: '10111001100',
  16: '10011101100', 17: '10011100110', 18: '11001110010', 19: '11001011100',
  20: '11001001110', 21: '11011100100', 22: '11001110100', 23: '11101101110',
  24: '11101001100', 25: '11100101100', 26: '11100100110', 27: '11101100100',
  28: '11100110100', 29: '11100110010', 30: '11011011000', 31: '11011000110',
  32: '11000110110', 33: '10100011000', 34: '10001011000', 35: '10001000110',
  36: '10110001000', 37: '10001101000', 38: '10001100010', 39: '11010001000',
  40: '11000101000', 41: '11000100010', 42: '10110111000', 43: '10110001110',
  44: '10001101110', 45: '10111011000', 46: '10111000110', 47: '10001110110',
  48: '11101110110', 49: '11010001110', 50: '11000101110', 51: '11011101000',
  52: '11011100010', 53: '11011101110', 54: '11101011000', 55: '11101000110',
  56: '11100010110', 57: '11101101000', 58: '11101100010', 59: '11100011010',
  60: '11101111010', 61: '11001000010', 62: '11110001010', 63: '10100110000',
  64: '10100001100', 65: '10010110000', 66: '10010000110', 67: '10000101100',
  68: '10000100110', 69: '10110010000', 70: '10110000100', 71: '10011010000',
  72: '10011000010', 73: '10000110100', 74: '10000110010', 75: '11000010010',
  76: '11001010000', 77: '11110111010', 78: '11000010100', 79: '10001111010',
  80: '10100111100', 81: '10010111100', 82: '10010011110', 83: '10111100100',
  84: '10011110100', 85: '10011110010', 86: '11110100100', 87: '11110010100',
  88: '11110010010', 89: '11011011110', 90: '11011110110', 91: '11110110110',
  92: '10101111000', 93: '10100011110', 94: '10001011110', 95: '10111101000',
  96: '10111100010', 97: '11110101000', 98: '11110100010', 99: '10111011110',
  100: '10111101110', 101: '11101011110', 102: '11110101110',
  103: '11010000100', // START B
  104: '11010010000', // START A
  105: '11010011100', // START C
  106: '1100011101011', // STOP
};

function encodeCode128(text: string): string {
  let encoded = CODE128_PATTERNS[104]; // START A for simplicity
  let checksum = 104;
  
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    let value: number;
    if (charCode >= 32 && charCode <= 126) {
      value = charCode - 32;
    } else {
      value = 0;
    }
    encoded += CODE128_PATTERNS[value] || CODE128_PATTERNS[0];
    checksum += value * (i + 1);
  }
  
  checksum = checksum % 103;
  encoded += CODE128_PATTERNS[checksum];
  encoded += CODE128_PATTERNS[106]; // STOP
  
  return encoded;
}

// ============================================
// CODE 39 BARCODE ENCODER
// ============================================
const CODE39_PATTERNS: Record<string, string> = {
  '0': '101001101101', '1': '110100101011', '2': '101100101011', '3': '110110010101',
  '4': '101001101011', '5': '110100110101', '6': '101100110101', '7': '101001011011',
  '8': '110100101101', '9': '101100101101', 'A': '110101001011', 'B': '101101001011',
  'C': '110110100101', 'D': '101011001011', 'E': '110101100101', 'F': '101101100101',
  'G': '101010011011', 'H': '110101001101', 'I': '101101001101', 'J': '101011001101',
  'K': '110101010011', 'L': '101101010011', 'M': '110110101001', 'N': '101011010011',
  'O': '110101101001', 'P': '101101101001', 'Q': '101010110011', 'R': '110101011001',
  'S': '101101011001', 'T': '101011011001', 'U': '110010101011', 'V': '100110101011',
  'W': '110011010101', 'X': '100101101011', 'Y': '110010110101', 'Z': '100110110101',
  '-': '100101011011', '.': '110010101101', ' ': '100110101101', '$': '100100100101',
  '/': '100100101001', '+': '100101001001', '%': '101001001001', '*': '100101101101',
};

function encodeCode39(text: string): string {
  let encoded = CODE39_PATTERNS['*'] + '0'; // Start with * and gap
  const upperText = text.toUpperCase();
  
  for (let i = 0; i < upperText.length; i++) {
    const char = upperText[i];
    const pattern = CODE39_PATTERNS[char];
    if (pattern) {
      encoded += pattern + '0'; // Add gap between characters
    }
  }
  
  encoded += CODE39_PATTERNS['*']; // End with *
  return encoded;
}

// ============================================
// INTERLEAVED 2 OF 5 ENCODER (numeric only)
// ============================================
const I2OF5_PATTERNS: Record<string, string> = {
  '0': 'NNWWN', '1': 'WNNNW', '2': 'NWNNW', '3': 'WWNNN',
  '4': 'NNWNW', '5': 'WNWNN', '6': 'NWWNN', '7': 'NNNWW',
  '8': 'WNNWN', '9': 'NWNWN',
};

function encodeInterleaved2of5(text: string): string {
  // Must be even length, pad with leading 0 if needed
  let digits = text.replace(/\D/g, '');
  if (digits.length % 2 !== 0) digits = '0' + digits;
  
  let encoded = '1010'; // Start pattern
  
  for (let i = 0; i < digits.length; i += 2) {
    const bars = I2OF5_PATTERNS[digits[i]] || I2OF5_PATTERNS['0'];
    const spaces = I2OF5_PATTERNS[digits[i + 1]] || I2OF5_PATTERNS['0'];
    
    for (let j = 0; j < 5; j++) {
      encoded += bars[j] === 'W' ? '111' : '1';
      encoded += spaces[j] === 'W' ? '000' : '0';
    }
  }
  
  encoded += '11101'; // Stop pattern
  return encoded;
}

// ============================================
// SVG BARCODE RENDERER
// ============================================
export function generateBarcodeSVG(
  text: string,
  symbology: BarcodeSymbology = 'code128',
  width: number = 200,
  height: number = 60,
  showText: boolean = true
): string {
  let encoded: string;
  
  switch (symbology) {
    case 'code39':
      encoded = encodeCode39(text);
      break;
    case 'interleaved2of5':
      encoded = encodeInterleaved2of5(text);
      break;
    case 'upc_a':
    case 'ean13':
      // Fallback to Code 128 for UPC/EAN since they require specific digit counts
      encoded = encodeCode128(text);
      break;
    case 'code128':
    default:
      encoded = encodeCode128(text);
      break;
  }
  
  const barWidth = width / encoded.length;
  const barHeight = showText ? height - 16 : height;
  
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  svg += `<rect width="${width}" height="${height}" fill="white"/>`;
  
  for (let i = 0; i < encoded.length; i++) {
    if (encoded[i] === '1') {
      svg += `<rect x="${i * barWidth}" y="0" width="${barWidth}" height="${barHeight}" fill="black"/>`;
    }
  }
  
  if (showText) {
    svg += `<text x="${width / 2}" y="${height - 2}" text-anchor="middle" font-family="monospace" font-size="10" fill="black">${text}</text>`;
  }
  
  svg += '</svg>';
  return svg;
}

// ============================================
// QR CODE GENERATOR (Simplified - uses a grid pattern)
// ============================================
// This is a simplified QR-like code generator for visual representation.
// For production, you'd use a proper QR library. This creates a deterministic
// pattern based on the input text that looks like a QR code.

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function generateQRMatrix(text: string, size: number = 21): boolean[][] {
  const matrix: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));
  const hash = hashString(text);
  
  // Add finder patterns (top-left, top-right, bottom-left)
  const addFinderPattern = (startRow: number, startCol: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          if (startRow + r < size && startCol + c < size) {
            matrix[startRow + r][startCol + c] = true;
          }
        }
      }
    }
  };
  
  addFinderPattern(0, 0);
  addFinderPattern(0, size - 7);
  addFinderPattern(size - 7, 0);
  
  // Add timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }
  
  // Fill data area with deterministic pattern based on text hash
  let seed = hash;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Skip finder patterns and timing
      if ((r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8)) continue;
      if (r === 6 || c === 6) continue;
      
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      // Mix in character data
      const charIndex = (r * size + c) % text.length;
      const charVal = text.charCodeAt(charIndex);
      matrix[r][c] = ((seed + charVal) % 3) === 0;
    }
  }
  
  return matrix;
}

export function generateQRCodeSVG(
  text: string,
  size: number = 120,
  darkColor: string = '#000000',
  lightColor: string = '#ffffff'
): string {
  const moduleCount = 21;
  const matrix = generateQRMatrix(text, moduleCount);
  const moduleSize = size / moduleCount;
  
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
  svg += `<rect width="${size}" height="${size}" fill="${lightColor}"/>`;
  
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (matrix[r][c]) {
        svg += `<rect x="${c * moduleSize}" y="${r * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="${darkColor}"/>`;
      }
    }
  }
  
  svg += '</svg>';
  return svg;
}

// ============================================
// ITEM URL GENERATOR
// ============================================
export function generateItemUrl(
  itemUid: string,
  baseUrl?: string
): string {
  const base = baseUrl || window.location.origin;
  return `${base}/item/${itemUid}`;
}

// ============================================
// UID GENERATOR (client-side preview)
// ============================================
export function generatePreviewUid(prefix: string, minDigits: number, sequence: number = 1): string {
  const paddedNum = String(sequence).padStart(minDigits, '0');
  return prefix ? `${prefix}-${paddedNum}` : paddedNum;
}

// ============================================
// SCANNED INPUT PARSER
// Parses barcode/QR code scanned input and determines its type:
// - Unique ID pattern (e.g., "INV-000042", "ORD-001")
// - QR code URL (e.g., "https://example.com/item/INV-000042")
// - Raw text
// ============================================

export interface ParsedScanResult {
  type: 'unique_id' | 'qr_url' | 'raw_text';
  /** The original scanned input */
  raw: string;
  /** Extracted unique ID (if found) */
  uniqueId: string | null;
  /** Full URL (if QR code URL detected) */
  url: string | null;
  /** Whether this looks like a valid item reference */
  isItemReference: boolean;
}

/**
 * Parse scanned barcode/QR code input and classify it.
 * 
 * Unique ID patterns matched:
 *  - PREFIX-DIGITS (e.g., INV-000042, ORD-001, BUG-12345)
 *  - PREFIX-ALPHANUM (e.g., ITEM-A1B2C3)
 *  - Bare alphanumeric UIDs (e.g., 000042, ABC123)
 * 
 * QR URL patterns matched:
 *  - https://...\/item\/UNIQUE_ID
 *  - https://...\/app\/...\/UNIQUE_ID
 *  - Any URL containing /item/ path segment
 */
export function parseScannedInput(input: string): ParsedScanResult {
  const trimmed = (input || '').trim();
  
  if (!trimmed) {
    return { type: 'raw_text', raw: trimmed, uniqueId: null, url: null, isItemReference: false };
  }

  // ---- Check for URL (QR code) ----
  const urlPattern = /^https?:\/\//i;
  if (urlPattern.test(trimmed)) {
    // Try to extract a unique ID from the URL path
    // Match /item/UNIQUE_ID or /app/WORKSPACE/APPNAME/UNIQUE_ID
    const itemPathMatch = trimmed.match(/\/item\/([A-Za-z0-9_-]+)/i);
    const appPathMatch = trimmed.match(/\/app\/[^/]+\/[^/]+\/([A-Za-z0-9_-]+)/i);
    
    const extractedId = itemPathMatch?.[1] || appPathMatch?.[1] || null;
    
    return {
      type: 'qr_url',
      raw: trimmed,
      uniqueId: extractedId,
      url: trimmed,
      isItemReference: !!extractedId,
    };
  }

  // ---- Check for Unique ID pattern: PREFIX-DIGITS or PREFIX-ALPHANUM ----
  // e.g., INV-000042, ORD-001, BUG-12345, ITEM-A1B2C3
  const uidPattern = /^([A-Z]{2,10})-([A-Z0-9]+)$/i;
  const uidMatch = trimmed.match(uidPattern);
  if (uidMatch) {
    return {
      type: 'unique_id',
      raw: trimmed,
      uniqueId: trimmed.toUpperCase(),
      url: null,
      isItemReference: true,
    };
  }

  // ---- Check for bare numeric/alphanumeric UID (zero-padded numbers) ----
  // e.g., 000042, 001234
  const bareNumericPattern = /^0\d{2,}$/;
  if (bareNumericPattern.test(trimmed)) {
    return {
      type: 'unique_id',
      raw: trimmed,
      uniqueId: trimmed,
      url: null,
      isItemReference: true,
    };
  }

  // ---- Fallback: raw text ----
  return {
    type: 'raw_text',
    raw: trimmed,
    uniqueId: null,
    url: null,
    isItemReference: false,
  };
}
