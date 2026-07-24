import { NextResponse } from "next/server";
import { parseStringPromise, Builder } from "xml2js";

export async function POST(request: Request) {
  try {
    const { input, from, to } = await request.json();

    if (!input || typeof input !== "string") {
      return NextResponse.json(
        { error: "Input is required and must be a string" },
        { status: 400 }
      );
    }

    if (!from || !to || !["json", "xml"].includes(from) || !["json", "xml"].includes(to)) {
      return NextResponse.json(
        { error: "from and to must be either 'json' or 'xml'" },
        { status: 400 }
      );
    }

    if (from === to) {
      return NextResponse.json({ output: input });
    }

    let output: string;

    if (from === "json" && to === "xml") {
      const parsed = JSON.parse(input);
      const builder = new Builder({
        rootName: "root",
        renderOpts: { pretty: true, indent: "  ", newline: "\n" },
      });
      output = builder.buildObject(parsed);
    } else {
      // from xml to json
      const result = await parseStringPromise(input, {
        explicitArray: false,
        trim: true,
      });
      output = JSON.stringify(result, null, 2);
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
