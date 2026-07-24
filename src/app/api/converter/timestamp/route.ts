import { NextResponse } from "next/server";

export async function GET() {
  try {
    const now = new Date();
    return NextResponse.json({
      unix: Math.floor(now.getTime() / 1000),
      unixMs: now.getTime(),
      iso: now.toISOString(),
      local: now.toLocaleString(),
      utc: now.toUTCString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get timestamp",
      },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { input, action } = await request.json();

    if (input === undefined || input === null) {
      return NextResponse.json(
        { error: "Input is required" },
        { status: 400 }
      );
    }

    if (!action || !["toUnix", "toHuman"].includes(action)) {
      return NextResponse.json(
        { error: "action must be either 'toUnix' or 'toHuman'" },
        { status: 400 }
      );
    }

    let result: Record<string, string | number>;

    if (action === "toUnix") {
      // Convert human-readable date string or ISO to unix timestamp
      const date = new Date(input);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format" },
          { status: 400 }
        );
      }
      result = {
        unix: Math.floor(date.getTime() / 1000),
        unixMs: date.getTime(),
        iso: date.toISOString(),
      };
    } else {
      // toHuman: convert unix timestamp to human-readable
      const numInput = typeof input === "number" ? input : Number(input);
      if (isNaN(numInput)) {
        return NextResponse.json(
          { error: "Input must be a valid number for toHuman conversion" },
          { status: 400 }
        );
      }

      // Determine if input is in seconds or milliseconds
      const timestamp = numInput > 1e12 ? numInput : numInput * 1000;
      const date = new Date(timestamp);

      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: "Invalid timestamp" },
          { status: 400 }
        );
      }

      result = {
        iso: date.toISOString(),
        local: date.toLocaleString(),
        utc: date.toUTCString(),
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Conversion failed",
      },
      { status: 400 }
    );
  }
}
