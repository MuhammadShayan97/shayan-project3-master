
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sql } from "../../../lib/db";
import { setAdminSession } from "../../../lib/session";

export const runtime = "nodejs";

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

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
    const body = await request.json();

    const username =
      typeof body?.username === "string" ? body.username.trim() : "";

    const password =
      typeof body?.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter username and password.",
        },
        { status: 400 }
      );
    }

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      console.error("Admin credentials are not configured.");

      return NextResponse.json(
        {
          success: false,
          message: "Admin credentials are not configured.",
        },
        { status: 500 }
      );
    }

    // Check whether the admin account is temporarily blocked.
    const existingLimit = await sql`
      SELECT attempts, blocked_until
      FROM admin_login_rate_limits
      WHERE username = ${adminUsername}
      LIMIT 1
    `;

    if (existingLimit.length > 0) {
      const blockedUntil = existingLimit[0].blocked_until;

      if (
        blockedUntil &&
        new Date(blockedUntil).getTime() > Date.now()
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Too many failed attempts. Please try again after 15 minutes.",
          },
          { status: 429 }
        );
      }
    }

    // Verify credentials.
    const usernameMatches = safeCompare(
      username,
      adminUsername.trim()
    );

    const passwordMatches = safeCompare(
      password,
      adminPassword
    );

    if (!usernameMatches || !passwordMatches) {
      // Atomically record a failed login attempt.
      const result = await sql`
        INSERT INTO admin_login_rate_limits (
          username,
          attempts,
          window_started_at,
          blocked_until
        )
        VALUES (
          ${adminUsername},
          1,
          NOW(),
          NULL
        )
        ON CONFLICT (username)
        DO UPDATE SET
          attempts = CASE
            WHEN admin_login_rate_limits.window_started_at
              <= NOW() - INTERVAL '15 minutes'
            THEN 1
            ELSE admin_login_rate_limits.attempts + 1
          END,

          window_started_at = CASE
            WHEN admin_login_rate_limits.window_started_at
              <= NOW() - INTERVAL '15 minutes'
            THEN NOW()
            ELSE admin_login_rate_limits.window_started_at
          END,

          blocked_until = CASE
            WHEN (
              CASE
                WHEN admin_login_rate_limits.window_started_at
                  <= NOW() - INTERVAL '15 minutes'
                THEN 1
                ELSE admin_login_rate_limits.attempts + 1
              END
            ) >= 5
            THEN NOW() + INTERVAL '15 minutes'
            ELSE NULL
          END

        RETURNING attempts
      `;

      const attempts = Number(result[0].attempts);

      if (attempts >= MAX_ATTEMPTS) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Too many failed attempts. Login blocked for 15 minutes.",
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "Incorrect username or password.",
          remainingAttempts: MAX_ATTEMPTS - attempts,
        },
        { status: 401 }
      );
    }

    // Successful login: clear previous failed attempts.
    await sql`
      DELETE FROM admin_login_rate_limits
      WHERE username = ${adminUsername}
    `;

    const response = NextResponse.json({
      success: true,
      message: "Login successful.",
    });

    await setAdminSession(response);

    return response;

  } catch (error) {
    console.error("Login API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Server error. Please try again.",
      },
      { status: 500 }
    );
  }
}
