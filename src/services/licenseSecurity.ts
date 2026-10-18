/**
 * License Security & Offline Cryptographic Activation Engine
 * Allows verifying and generating activation keys 100% offline without internet.
 */

const LICENSE_SECRET_SALT = 'FIADO_MASTER_SALT_2026_R$9,90';

// Fast 32-bit polynomial cryptographic signature generator
function generateSignatureHash(input: string): string {
  let hash1 = 0x811c9dc5;
  let hash2 = 0x55555555;

  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash1 ^= char;
    hash1 = Math.imul(hash1, 0x01000193);
    hash2 = (hash2 << 5) - hash2 + char + (hash1 & 0xff);
    hash2 |= 0;
  }

  const part1 = (hash1 >>> 0).toString(16).padStart(8, '0').toUpperCase().slice(0, 4);
  const part2 = (hash2 >>> 0).toString(16).padStart(8, '0').toUpperCase().slice(0, 4);
  return `${part1}${part2}`;
}

/**
 * Normalizes a device ID to extract its key identifier suffix.
 * Example: 'LOJA-7842' or 'DEV-7842' -> '7842'
 */
export function extractDeviceSuffix(deviceId: string): string {
  const clean = deviceId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return clean.slice(-4) || '9999';
}

export const LicenseSecurity = {
  /**
   * Generates or retrieves a persistent Device ID for the merchant.
   * e.g. "LOJA-4821"
   */
  getOrCreateDeviceId(): string {
    const KEY = 'fiado_device_unique_id_v1';
    let id = localStorage.getItem(KEY);
    if (!id) {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      id = `LOJA-${randomNum}`;
      localStorage.setItem(KEY, id);
    }
    return id;
  },

  /**
   * Generates an official Activation Code for a given device and period.
   * Format: CF-[SUFFIX]-[DAYS]D-[HASH]
   * Example: CF-4821-30D-A81E9F23
   */
  generateActivationCode(deviceId: string, days: number = 30): string {
    const suffix = extractDeviceSuffix(deviceId);
    const payload = `${suffix}:${days}:${LICENSE_SECRET_SALT}`;
    const hash = generateSignatureHash(payload);
    return `CF-${suffix}-${days}D-${hash}`;
  },

  /**
   * Validates an activation code mathematically 100% offline.
   */
  validateActivationCode(
    deviceId: string,
    code: string,
    usedCodes: string[] = []
  ): { valid: boolean; days: number; reason?: string } {
    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '');

    // Check format
    const match = cleanCode.match(/^CF-([A-Z0-9]{4})-(\d+)D-([A-Z0-9]{8})$/);
    if (!match) {
      return {
        valid: false,
        days: 0,
        reason: 'Formato de código inválido. Exemplo correto: CF-7842-30D-A1B2C3D4',
      };
    }

    const [, codeSuffix, daysStr, codeHash] = match;
    const days = parseInt(daysStr, 10);

    // 1. Check if already used on this device
    if (usedCodes.includes(cleanCode)) {
      return {
        valid: false,
        days: 0,
        reason: 'Este código de liberação já foi utilizado anteriormente neste aparelho.',
      };
    }

    // 2. Check device suffix match
    const currentSuffix = extractDeviceSuffix(deviceId);
    if (codeSuffix !== currentSuffix && codeSuffix !== 'ALL0') {
      return {
        valid: false,
        days: 0,
        reason: `Este código foi gerado para outro aparelho (final ${codeSuffix}), mas seu ID termina em ${currentSuffix}.`,
      };
    }

    // 3. Verify cryptographic mathematical signature
    const expectedPayload = `${codeSuffix}:${days}:${LICENSE_SECRET_SALT}`;
    const expectedHash = generateSignatureHash(expectedPayload);

    if (codeHash !== expectedHash) {
      return {
        valid: false,
        days: 0,
        reason: 'Código inválido ou incorreto. Verifique se digitou todos os caracteres.',
      };
    }

    return {
      valid: true,
      days,
    };
  },

  /**
   * Anti-tampering check: verifies if system clock was turned backwards to cheat license.
   */
  checkClockIntegrity(lastKnownTimestamp: number): {
    tampered: boolean;
    currentTimestamp: number;
  } {
    const now = Date.now();
    // Allow up to 2 hours of clock drift/timezone adjustment
    const driftAllowance = 2 * 60 * 60 * 1000;

    if (lastKnownTimestamp && now < lastKnownTimestamp - driftAllowance) {
      return {
        tampered: true,
        currentTimestamp: lastKnownTimestamp,
      };
    }

    return {
      tampered: false,
      currentTimestamp: Math.max(now, lastKnownTimestamp || now),
    };
  },
};
