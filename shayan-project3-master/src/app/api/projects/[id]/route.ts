
import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";
import {
  requireAdmin,
  isSameOriginRequest,
} from "../../../lib/session";

type Context = {
  params: Promise<{ id: string }>;
};

// PUT: Edit an existing project
export async function PUT(
  request: Request,
  context: Context
) {
  try {
    // Same-origin validation
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403 }
      );
    }

    // Admin authentication
    if (!requireAdmin(request)) {
      return NextResponse.json(
        { error: "Unauthorized access." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const projectId = Number(id);

    if (!Number.isSafeInteger(projectId) || projectId <= 0) {
      return NextResponse.json(
        { error: "Invalid project ID." },
        { status: 400 }
      );
    }

    const body = await request.json();

    const title =
      typeof body.title === "string" ? body.title.trim() : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required." },
        { status: 400 }
      );
    }

    if (title.length > 255 || description.length > 10000) {
      return NextResponse.json(
        { error: "Project information is too long." },
        { status: 400 }
      );
    }

    const result = await sql`
      UPDATE projects
      SET title = ${title},
          description = ${description}
      WHERE id = ${projectId}
      RETURNING id, title, description
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Project not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      project: result[0],
    });
  } catch (error) {
    console.error("Projects PUT error:", error);

    return NextResponse.json(
      { error: "Unable to update project." },
      { status: 500 }
    );
  }
}

// DELETE: Remove an existing project
export async function DELETE(
  request: Request,
  context: Context
) {
  try {
    // Same-origin validation
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403 }
      );
    }

    // Admin authentication
    if (!requireAdmin(request)) {
      return NextResponse.json(
        { error: "Unauthorized access." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const projectId = Number(id);

    if (!Number.isSafeInteger(projectId) || projectId <= 0) {
      return NextResponse.json(
        { error: "Invalid project ID." },
        { status: 400 }
      );
    }

    const result = await sql`
      DELETE FROM projects
      WHERE id = ${projectId}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Project not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Project deleted successfully.",
    });
  } catch (error) {
    console.error("Projects DELETE error:", error);

    return NextResponse.json(
      { error: "Unable to delete project." },
      { status: 500 }
    );
  }
}
