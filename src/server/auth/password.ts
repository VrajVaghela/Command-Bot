import "server-only";
import bcrypt from "bcryptjs";

/** Password hashing (code_standards.md §6) — pure-JS bcrypt, no native bindings. */
const SALT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
