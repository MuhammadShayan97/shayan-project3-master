
import { NextResponse } from "next/server";
import { clearAdminSession } from "../../../lib/session";

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully.",
    });

    clearAdminSession(response);

    return response;
  } catch (error) {
    console.error("Logout API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to logout. Please try again.",
      },
      { status: 500 }
    );
  }
}
