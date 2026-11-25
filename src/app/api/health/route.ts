import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const configured = Boolean(process.env.GROQ_API_KEY?.trim());
  return NextResponse.json({
    ok: true,
    configured,
    provider: "groq",
  });
}
