import { NextResponse } from "next/server";
import Papa from "papaparse";

export async function POST(request: Request) {
  try {
    const { input, from, to } = await request.json();

    if (!input || typeof input !== "string") {
      return NextResponse.json(
        { error: "Input is required and must be a string" },
        { status: 400 }
      );
    }

    if (!from || !to || !["json", "csv"].includes(from) || !["json", "csv"].includes(to)) {
      return NextResponse.json(
        { error: "from and to must be either 'json' or 'csv'" },
        { status: 400 }
      );
    }

    if (from === to) {
      return NextResponse.json({ output: input });
    }

    let output: string;

    if (from === "json" && to === "csv") {
      const parsed = JSON.parse(input);
      if (!Array.isArray(parsed)) {
        return NextResponse.json(
          { error: "JSON input must be an array of objects" },
          { status: 400 }
        );
      }
      output = Papa.unparse(parsed);
    } else {
      // from csv to json
      const result = Papa.parse(input, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
      });
      output = JSON.stringify(result.data, null, 2);
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
