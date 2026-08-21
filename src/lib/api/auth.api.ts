import { createServerFn } from "@tanstack/react-start";
import { getDb, hashPassword, verifyPassword } from "../db.server";

export type AuthUser = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: "landlord" | "tenant";
};

export const loginFn = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const db = getDb();
    const user = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(data.email) as any;
    if (!user) return { error: "Email không tồn tại" };
    if (!verifyPassword(data.password, user.password_hash)) {
      return { error: "Mật khẩu không đúng" };
    }
    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role,
      } as AuthUser,
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
  .handler(async ({ data }) => {
    const db = getDb();
    const existing = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(data.email);
    if (existing) return { error: "Email đã được sử dụng" };

    const id = crypto.randomUUID();
    const hash = hashPassword(data.password);
    db.prepare(
      `INSERT INTO users (id, email, password_hash, full_name, phone, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, data.email, hash, data.full_name, data.phone || null, data.role);

    return {
      user: {
        id,
        email: data.email,
        full_name: data.full_name,
        phone: data.phone || null,
        role: data.role,
      } as AuthUser,
    };
  });

import crypto from "node:crypto";
