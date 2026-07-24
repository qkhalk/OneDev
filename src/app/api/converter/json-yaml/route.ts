import { NextResponse } from "next/server";
import yaml from "js-yaml";

export async function POST(request: Request) {
  try {
    const { input, from, to } = await request.json();

    if (!input || typeof input !== "string") {
      return NextResponse.json(
        { error: "Input is required and must be a string" },
        { status: 400 }
      );
    }

    if (!from || !to || !["json", "yaml"].includes(from) || !["json", "yaml"].includes(to)) {
      return NextResponse.json(
        { error: "from and to must be either 'json' or 'yaml'" },
        { status: 400 }
      );
    }

    if (from === to) {
      return NextResponse.json({ output: input });
    }

    let output: string;

    if (from === "json" && to === "yaml") {
      const parsed = JSON.parse(input);
      output = yaml.dump(parsed, { indent: 2 });
    } else {
      // from yaml to json
      const parsed = yaml.load(input);
      output = JSON.stringify(parsed, null, 2);
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
