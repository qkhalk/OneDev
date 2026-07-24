import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { input, algorithm } = await request.json();

    if (!input || typeof input !== "string") {
      return NextResponse.json(
        { error: "Input is required and must be a string" },
        { status: 400 }
      );
    }

    const validAlgorithms = ["md5", "sha1", "sha256", "sha512"];

    if (!algorithm || !validAlgorithms.includes(algorithm)) {
      return NextResponse.json(
        { error: `algorithm must be one of: ${validAlgorithms.join(", ")}` },
        { status: 400 }
      );
    }

    const hash = crypto.createHash(algorithm).update(input).digest("hex");

    return NextResponse.json({ output: hash, algorithm });
  } catch (error) {
    return NextResponse.json(
      {
        output: "",
        error: error instanceof Error ? error.message : "Hash generation failed",
      },
      { status: 400 }
    );
  }
}
