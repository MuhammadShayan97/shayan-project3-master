
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sql } from "../../../lib/db";
import {
  getAdminSession,
  isSameOriginRequest,
  clearAdminSession,
} from "../../../lib/session";
import {
  hashAdminPassword,
  verifyAdminPassword,
} from "../../../lib/admin-password";

export const runtime = "nodejs";

function safeCompare(a: string, b: string): boolean {
  const first = Buffer.from(a, "utf8");
  const second = Buffer.from(b, "utf8");

  if (first.length !== second.length) {
    return false;
  }

  return timingSafeEqual(first, second);
}

export async function POST(request: NextRequest) {
  try {
    // Only allow requests from this website.
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { success: false, message: "Invalid request origin." },
        { status: 403 }
      );
    }

    // Require an active admin session.
    if (!(await getAdminSession())) {
      return NextResponse.json(
        { success: false, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const currentPassword =
      typeof body?.currentPassword === "string"
        ? body.currentPassword
        : "";

    const newPassword =
      typeof body?.newPassword === "string"
        ? body.newPassword
        : "";

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: "Please fill in both password fields." },
        { status: 400 }
      );
    }

    if (newPassword.length < 12 || newPassword.length > 128) {
      return NextResponse.json(
        {
          success: false,
          message: "Your new password must be between 12 and 128 characters.",
        },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Your new password must be different from your current password.",
        },
        { status: 400 }
      );
    }

    const adminUsername = process.env.ADMIN_USERNAME?.trim();
    const fallbackPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername) {
      return NextResponse.json(
        { success: false, message: "Admin account is not configured." },
        { status: 500 }
      );
    }

    // Read the current stored password hash.
    const credentialRows = await sql`
      SELECT password_hash
      FROM admin_credentials
      WHERE username = ${adminUsername}
      LIMIT 1
    `;

    let currentPasswordMatches = false;

    if (credentialRows.length > 0) {
      currentPasswordMatches = verifyAdminPassword(
        currentPassword,
        String(credentialRows[0].password_hash)
      );
    } else if (fallbackPassword) {
      currentPasswordMatches = safeCompare(
        currentPassword,
        fallbackPassword
      );
    }

    if (!currentPasswordMatches) {
      return NextResponse.json(
        { success: false, message: "Your current password is incorrect." },
        { status: 401 }
      );
    }

    // Hash the new password before storing it.
    const passwordHash = hashAdminPassword(newPassword);

    await sql`
      INSERT INTO admin_credentials (
        username,
        password_hash,
        updated_at
      )
      VALUES (
        ${adminUsername},
        ${passwordHash},
        NOW()
      )
      ON CONFLICT (username)
      DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        updated_at = NOW()
    `;

    // End this browser's current session so the new password is used at next login.
    const response = NextResponse.json({
      success: true,
      message: "Password changed successfully. Please log in with your new password.",
    });

    clearAdminSession(response);

    return response;
  } catch (error) {
    console.error("Change password API error:", error);

    return NextResponse.json(
      { success: false, message: "Server error. Please try again." },
      { status: 500 }
    );
  }
}
