
import {
  pbkdf2Sync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const ITERATIONS = 310000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";

export function hashAdminPassword(password: string): string {
  const salt = randomBytes(16).toString("base64url");

  const hash = pbkdf2Sync(
    password,
    salt,
    ITERATIONS,
    KEY_LENGTH,
    DIGEST
  ).toString("base64url");

  return `pbkdf2$${ITERATIONS}$${salt}$${hash}`;
}

export function verifyAdminPassword(
  password: string,
  storedHash: string
): boolean {
  try {
    const parts = storedHash.split("$");

    if (parts.length !== 4 || parts[0] !== "pbkdf2") {
      return false;
    }

    const iterations = Number(parts[1]);
    const salt = parts[2];
    const expectedHash = parts[3];

    if (
      !Number.isInteger(iterations) ||
      iterations < 100000 ||
      iterations > 1000000 ||
      !salt ||
      !expectedHash
    ) {
      return false;
    }

    const actual = pbkdf2Sync(
      password,
      salt,
      iterations,
      KEY_LENGTH,
      DIGEST
    );

    const expected = Buffer.from(expectedHash, "base64url");

    return (
      expected.length === actual.length &&
      timingSafeEqual(expected, actual)
    );
  } catch {
    return false;
  }
}
