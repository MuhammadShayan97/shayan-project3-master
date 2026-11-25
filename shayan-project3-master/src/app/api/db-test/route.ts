
import { sql } from "../../lib/db";

export async function GET() {
  try {
    const result = await sql`
      SELECT NOW() AS database_time
    `;

    return Response.json({
      success: true,
      message: "NeonDB connected successfully!",
      databaseTime: result[0].database_time,
    });
  } catch (error) {
    console.error("Database error:", error);

    return Response.json(
      {
        success: false,
        message: "Unable to connect to NeonDB.",
      },
      { status: 500 }
    );
  }
}
