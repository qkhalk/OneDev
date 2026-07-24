import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  try {
    const uuid = crypto.randomUUID();
    return NextResponse.json({ uuid });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "UUID generation failed",
      },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const count = body?.count ?? 1;

    if (typeof count !== "number" || count < 1 || count > 1000) {
      return NextResponse.json(
        { error: "count must be a number between 1 and 1000" },
        { status: 400 }
      );
    }

    const uuids: string[] = [];
    for (let i = 0; i < count; i++) {
      uuids.push(crypto.randomUUID());
    }

    return NextResponse.json({ uuids, count });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "UUID generation failed",
      },
      { status: 400 }
    );
  }
}
