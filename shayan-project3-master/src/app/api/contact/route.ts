
import { NextResponse } from "next/server";
import { sql } from "../../lib/db";
import {
  requireAdmin,
  isSameOriginRequest,
} from "../../lib/session";

// GET: Load contact messages (Admin only)
export async function GET(request: Request) {
  try {
    if (!requireAdmin(request)) {
      return NextResponse.json(
        { error: "Unauthorized access." },
        { status: 401 }
      );
    }

    const messages = await sql`
      SELECT id, name, email, message, is_read, created_at
      FROM contact_messages
      ORDER BY created_at DESC
      LIMIT 100
    `;

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Contact GET error:", error);

    return NextResponse.json(
      { error: "Unable to load contact messages." },
      { status: 500 }
    );
  }
}

// POST: Save a visitor's contact message
export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid form submission." },
        { status: 400 }
      );
    }

    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Please complete all fields." },
        { status: 400 }
      );
    }

    if (
      name.length > 100 ||
      email.length > 254 ||
      message.length < 10 ||
      message.length > 5000
    ) {
      return NextResponse.json(
        { error: "Please check the length of your information." },
        { status: 400 }
      );
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO contact_messages (name, email, message)
      VALUES (${name}, ${email}, ${message})
      RETURNING id
    `;

    return NextResponse.json(
      {
        success: true,
        message: "Your message has been received.",
        id: result[0].id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Contact POST error:", error);

    return NextResponse.json(
      { error: "Unable to save your message. Please try again." },
      { status: 500 }
    );
  }
}
