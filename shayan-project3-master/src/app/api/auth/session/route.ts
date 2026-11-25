
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../lib/session";

export async function GET() {
  try {
    const authenticated = await getAdminSession();

    return NextResponse.json({
      authenticated: Boolean(authenticated),
    });
  } catch (error) {
    console.error("Session check error:", error);

    return NextResponse.json(
      { authenticated: false },
      { status: 500 }
    );
  }
}
