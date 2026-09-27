// =============================================================================
// HR Pro Suite — PromptPay QR Generator & EMVCo Payload Utility
// Generates official Thai PromptPay QR codes with dynamic amounts
// =============================================================================

import QRCode from 'qrcode';

/** CRC-16/CCITT-FALSE implementation for EMVCo standard */
function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  const hex = crc.toString(16).toUpperCase();
  return ('0000' + hex).slice(-4);
}

function formatTag(id: string, value: string): string {
  const len = ('00' + value.length).slice(-2);
  return `${id}${len}${value}`;
}

/**
 * Format PromptPay Target (Mobile Phone or Tax ID/National ID)
 * Mobile phone (10 digits starting with 0): 0812345678 -> 0066812345678 (Tag 01)
 * Tax/National ID (13 digits): 13 digits (Tag 02)
 */
export function formatPromptPayTarget(target: string): string {
  const clean = target.replace(/[^0-9]/g, '');
  if (clean.length === 10 && clean.startsWith('0')) {
    // Mobile: 0066 + 9 digits without leading 0
    return '0066' + clean.slice(1);
  }
  return clean;
}

/**
 * Generate EMVCo standard PromptPay QR Code payload
 */
export function generatePromptPayPayload(target: string, amount?: number): string {
  const cleanTarget = target.replace(/[^0-9]/g, '');
  const isMobile = cleanTarget.length === 10 && cleanTarget.startsWith('0');
  const isEWallet = cleanTarget.length === 15;
  const formattedTarget = formatPromptPayTarget(cleanTarget);

  // Sub-tags for Merchant Account Information (Tag 29)
  const aidTag = formatTag('00', 'A000000677010111');
  const targetTag = isMobile
    ? formatTag('01', formattedTarget)
    : isEWallet
    ? formatTag('03', formattedTarget)
    : formatTag('02', formattedTarget);
  const merchantAccountInfo = formatTag('29', aidTag + targetTag);

  // Payload segments
  let payload = '';
  payload += formatTag('00', '01'); // Payload Format Indicator
  payload += formatTag('01', amount ? '12' : '11'); // 12 = Dynamic (with amount), 11 = Static
  payload += merchantAccountInfo;
  payload += formatTag('53', '764'); // Currency: THB (764)

  if (amount && amount > 0) {
    const amountStr = amount.toFixed(2);
    payload += formatTag('54', amountStr);
  }

  payload += formatTag('58', 'TH'); // Country Code
  payload += '6304'; // CRC placeholder (ID 63, length 04)

  const checksum = crc16(payload);
  return payload.slice(0, -4) + formatTag('63', checksum);
}

/**
 * Generate QR code as Base64 Data URL
 */
export async function generatePromptPayQRCode(
  target: string,
  amount?: number
): Promise<string> {
  const payload = generatePromptPayPayload(target, amount);
  return await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: {
      dark: '#0B0E14',
      light: '#FFFFFF',
    },
  });
}
