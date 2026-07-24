import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Token is required and must be a string" },
        { status: 400 }
      );
    }

    const parts = token.split(".");

    if (parts.length !== 3) {
      return NextResponse.json(
        { error: "Invalid JWT format. Expected 3 parts separated by dots." },
        { status: 400 }
      );
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Decode base64url (JWT uses base64url encoding without padding)
    const decodeBase64Url = (str: string): string => {
      const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
      return Buffer.from(padded, "base64").toString("utf-8");
    };

    const header = JSON.parse(decodeBase64Url(headerB64));
    const payload = JSON.parse(decodeBase64Url(payloadB64));

    return NextResponse.json({
      header,
      payload,
      signature: signatureB64,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "JWT decode failed",
      },
      { status: 400 }
    );
  }
}
