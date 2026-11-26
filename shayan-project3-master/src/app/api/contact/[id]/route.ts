
import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";
import {
  requireAdmin,
  isSameOriginRequest,
} from "../../../lib/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// PATCH: Mark a message as read or unread
export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403 }
      );
    }

    if (!requireAdmin(request)) {
      return NextResponse.json(
        { error: "Unauthorized access." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const messageId = Number(id);

    if (!Number.isSafeInteger(messageId) || messageId <= 0) {
      return NextResponse.json(
        { error: "Invalid message ID." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body.is_read !== "boolean") {
      return NextResponse.json(
        { error: "A valid read status is required." },
        { status: 400 }
      );
    }

    const result = await sql`
      UPDATE contact_messages
      SET is_read = ${body.is_read}
      WHERE id = ${messageId}
      RETURNING id, is_read
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Message not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result[0],
    });
  } catch (error) {
    console.error("Contact PATCH error:", error);

    return NextResponse.json(
      { error: "Unable to update message." },
      { status: 500 }
    );
  }
}

// DELETE: Remove a contact message
export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403 }
      );
    }

    if (!requireAdmin(request)) {
      return NextResponse.json(
        { error: "Unauthorized access." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const messageId = Number(id);

    if (!Number.isSafeInteger(messageId) || messageId <= 0) {
      return NextResponse.json(
        { error: "Invalid message ID." },
        { status: 400 }
      );
    }

    const result = await sql`
      DELETE FROM contact_messages
      WHERE id = ${messageId}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Message not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Contact message deleted.",
    });
  } catch (error) {
    console.error("Contact DELETE error:", error);

    return NextResponse.json(
      { error: "Unable to delete message." },
      { status: 500 }
    );
  }
}
