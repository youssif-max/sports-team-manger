import { describe, expect, it } from "vitest";
import {
  base32Decode,
  base32Encode,
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  normalizeRecoveryCode,
  totpCodeAt,
  verifyTotp,
} from "@/lib/totp";

// RFC 6238 appendix B: ASCII secret "12345678901234567890", SHA-1.
const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890"));

describe("totp", () => {
  it("matches the RFC 6238 test vectors", () => {
    expect(totpCodeAt(RFC_SECRET, Math.floor(59 / 30), 8)).toBe("94287082");
    expect(totpCodeAt(RFC_SECRET, Math.floor(1111111109 / 30), 8)).toBe("07081804");
    expect(totpCodeAt(RFC_SECRET, Math.floor(2000000000 / 30), 8)).toBe("69279037");
  });

  it("round-trips base32", () => {
    const s = generateTotpSecret();
    expect(base32Encode(base32Decode(s))).toBe(s);
  });

  it("accepts the current code and one step of drift, rejects others", () => {
    const now = 1_700_000_000_000;
    const step = Math.floor(now / 1000 / 30);
    expect(verifyTotp(RFC_SECRET, totpCodeAt(RFC_SECRET, step), null, now)).toBe(step);
    expect(verifyTotp(RFC_SECRET, totpCodeAt(RFC_SECRET, step - 1), null, now)).toBe(step - 1);
    expect(verifyTotp(RFC_SECRET, totpCodeAt(RFC_SECRET, step + 5), null, now)).toBeNull();
    expect(verifyTotp(RFC_SECRET, "abcdef", null, now)).toBeNull();
    expect(verifyTotp(RFC_SECRET, "12345", null, now)).toBeNull();
  });

  it("refuses to accept the same code twice", () => {
    const now = 1_700_000_000_000;
    const step = Math.floor(now / 1000 / 30);
    const code = totpCodeAt(RFC_SECRET, step);
    expect(verifyTotp(RFC_SECRET, code, step, now)).toBeNull();
    expect(verifyTotp(RFC_SECRET, code, step - 1, now)).toBe(step);
  });

  it("encrypts secrets and detects tampering", () => {
    const s = generateTotpSecret();
    const enc = encryptSecret(s);
    expect(enc).not.toContain(s);
    expect(decryptSecret(enc)).toBe(s);
    const parts = enc.split(".");
    parts[2] = Buffer.from("tampered").toString("base64");
    expect(() => decryptSecret(parts.join("."))).toThrow();
  });

  it("generates distinct recovery codes that hash consistently", () => {
    const codes = generateRecoveryCodes();
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes[0]).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
    expect(hashRecoveryCode(codes[0])).toBe(hashRecoveryCode(codes[0].toLowerCase().replace("-", " ")));
    expect(normalizeRecoveryCode("ab cd-ef")).toBe("ABCDEF");
  });
});
