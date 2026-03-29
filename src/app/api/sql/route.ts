import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - Get all tables
export async function GET() {
  try {
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    return NextResponse.json({ tables });
  } catch (error) {
    console.error("Get tables error:", error);
    return NextResponse.json({ error: "Failed to get tables" }, { status: 500 });
  }
}

// POST - Execute SQL query
export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json({ error: "Query required" }, { status: 400 });
    }

    // Security: Only allow SELECT queries
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery.startsWith("select")) {
      return NextResponse.json(
        { error: "Only SELECT queries are allowed for security" },
        { status: 403 }
      );
    }

    // Block dangerous patterns
    const dangerousPatterns = ["drop", "delete", "truncate", "update", "insert", "alter", "create", "grant", "revoke"];
    for (const pattern of dangerousPatterns) {
      if (normalizedQuery.includes(pattern)) {
        return NextResponse.json(
          { error: `Dangerous pattern "${pattern}" detected` },
          { status: 403 }
        );
      }
    }

    // Execute query
    const result = await prisma.$queryRawUnsafe(query);

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    console.error("SQL error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "SQL Error", details: errorMessage },
      { status: 400 }
    );
  }
}
