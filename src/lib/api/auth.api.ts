import crypto from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getDb, hashPassword, normalizeEmail, verifyPassword } from "../db.server";

export type AuthUser = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: "landlord" | "tenant";
};

export type AuthResult =
  | { user: AuthUser; error?: undefined }
  | { user?: undefined; error: string };

type UserRow = AuthUser & { password_hash: string };

const MIN_PASSWORD_LENGTH = 6;

export const loginFn = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }): Promise<AuthResult> => {
    const db = getDb();
    const user = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(normalizeEmail(data.email)) as UserRow | undefined;

    // Same message for both failure modes so the response can't be used to
    // enumerate which emails are registered.
    if (!user || !verifyPassword(data.password, user.password_hash)) {
      return { error: "Email hoặc mật khẩu không đúng" };
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role,
      },
    };
  });

export const signupFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      email: string;
      password: string;
      full_name: string;
      phone: string;
      role: "landlord" | "tenant";
    }) => data,
  )
  .handler(async ({ data }): Promise<AuthResult> => {
    const email = normalizeEmail(data.email);
    const fullName = data.full_name.trim();

    // The client enforces these too, but a server fn is a public endpoint.
    if (!email.includes("@")) return { error: "Email không hợp lệ" };
    if (data.password.length < MIN_PASSWORD_LENGTH) {
      return { error: `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự` };
    }
    if (!fullName) return { error: "Vui lòng nhập họ tên" };
    if (data.role !== "landlord" && data.role !== "tenant") {
      return { error: "Vai trò không hợp lệ" };
    }

    const db = getDb();
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) return { error: "Email đã được sử dụng" };

    const id = crypto.randomUUID();
    const phone = data.phone.trim() || null;
    db.prepare(
      `INSERT INTO users (id, email, password_hash, full_name, phone, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, email, hashPassword(data.password), fullName, phone, data.role);

    return { user: { id, email, full_name: fullName, phone, role: data.role } };
  });
