import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { input, action } = await request.json();

    if (!input || typeof input !== "string") {
      return NextResponse.json(
        { error: "Input is required and must be a string" },
        { status: 400 }
      );
    }

    if (!action || !["encode", "decode"].includes(action)) {
      return NextResponse.json(
        { error: "action must be either 'encode' or 'decode'" },
        { status: 400 }
      );
    }

    let output: string;

    if (action === "encode") {
      output = Buffer.from(input, "utf-8").toString("base64");
    } else {
      output = Buffer.from(input, "base64").toString("utf-8");
    }

    return NextResponse.json({ output });
  } catch (error) {
    return NextResponse.json(
      {
        output: "",
        error: error instanceof Error ? error.message : "Conversion failed",
      },
      { status: 400 }
    );
  }
}
