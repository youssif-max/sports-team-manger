import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "crypto";

// Time-based one-time passwords (RFC 6238) for two-factor sign-in, compatible
// with Google Authenticator, 1Password, Authy, etc. Kept dependency-free.

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const DIGITS = 6;

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str: string): Buffer {
  const clean = str.replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = BASE32.indexOf(ch);
    if (idx === -1) throw new Error("Invalid base32");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function totpCodeAt(secretBase32: string, step: number, digits = DIGITS): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac("sha1", base32Decode(secretBase32)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(bin % 10 ** digits).padStart(digits, "0");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// Returns the time-step the code matched (so the caller can store it and
// refuse to accept the same code twice), or null. Accepts ±1 step of clock
// drift, and never a step at or before `lastUsedStep`.
export function verifyTotp(
  secretBase32: string,
  code: string,
  lastUsedStep: number | null,
  nowMs = Date.now()
): number | null {
  const cleaned = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleaned)) return null;
  const current = Math.floor(nowMs / 1000 / STEP_SECONDS);
  let matched: number | null = null;
  // Check every window (no early exit) so timing doesn't reveal which matched.
  for (const delta of [-1, 0, 1]) {
    const step = current + delta;
    if (safeEqual(totpCodeAt(secretBase32, step), cleaned) && (lastUsedStep === null || step > lastUsedStep)) {
      matched = step;
    }
  }
  return matched;
}

export function otpauthUri(secretBase32: string, accountEmail: string): string {
  const label = encodeURIComponent(`SportSync:${accountEmail}`);
  return `otpauth://totp/${label}?secret=${secretBase32}&issuer=SportSync&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

// --- Secret encryption at rest (AES-256-GCM) -------------------------------
// A database leak alone shouldn't hand out everyone's authenticator secrets,
// so they're encrypted with a key that lives only in the environment.

function encryptionKey(): Buffer | null {
  const raw = process.env.TOTP_ENCRYPTION_KEY;
  if (raw) {
    const key = Buffer.from(raw, "base64");
    // Accept a 32-byte base64 key; otherwise stretch whatever was provided.
    return key.length === 32 ? key : createHash("sha256").update(raw).digest();
  }
  // Local development only — never silently fall back in production.
  if (process.env.NODE_ENV !== "production") {
    return createHash("sha256").update("sportsync-dev-only-totp-key").digest();
  }
  return null;
}

export function isTwoFactorAvailable(): boolean {
  return encryptionKey() !== null;
}

export function encryptSecret(plain: string): string {
  const key = encryptionKey();
  if (!key) throw new Error("TOTP_ENCRYPTION_KEY is not set.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}

export function decryptSecret(stored: string): string {
  const key = encryptionKey();
  if (!key) throw new Error("TOTP_ENCRYPTION_KEY is not set.");
  const [iv, tag, enc] = stored.split(".").map((p) => Buffer.from(p, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

// --- Recovery codes --------------------------------------------------------
// One-time codes for when the phone is lost. Only hashes are stored.

const RECOVERY_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () => {
    let code = "";
    for (let i = 0; i < 10; i++) code += RECOVERY_CHARS[randomInt(RECOVERY_CHARS.length)];
    return `${code.slice(0, 5)}-${code.slice(5)}`;
  });
}

export function normalizeRecoveryCode(input: string): string {
  return input.replace(/[\s-]+/g, "").toUpperCase();
}

export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(normalizeRecoveryCode(code)).digest("hex");
}
