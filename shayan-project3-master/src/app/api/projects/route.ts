
import { NextResponse } from "next/server";
import { sql } from "../../lib/db";
import {
  requireAdmin,
  isSameOriginRequest,
} from "../../lib/session";

// GET: Display all projects on the public portfolio
export async function GET() {
  try {
    const projects = await sql`
      SELECT id, title, description
      FROM projects
      ORDER BY id DESC
    `;

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Projects GET error:", error);

    return NextResponse.json(
      { error: "Unable to load projects." },
      { status: 500 }
    );
  }
}

// POST: Add a new project (Admin only)
export async function POST(request: Request) {
  try {
    // Check that the request comes from the same origin
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403 }
      );
    }

    // Check admin authentication
    if (!requireAdmin(request)) {
      return NextResponse.json(
        { error: "Unauthorized access." },
        { status: 401 }
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
      INSERT INTO projects (title, description)
      VALUES (${title}, ${description})
      RETURNING id, title, description
    `;

    return NextResponse.json(
      {
        success: true,
        project: result[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Projects POST error:", error);

    return NextResponse.json(
      { error: "Unable to add project." },
      { status: 500 }
    );
  }
}
