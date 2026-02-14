import { compileEmail } from "@/lib/compile-email";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { tsxCode } = await req.json();

    if (!tsxCode || typeof tsxCode !== "string") {
      return NextResponse.json(
        { error: "tsxCode is required and must be a string" },
        { status: 400 }
      );
    }

    const htmlCode = await compileEmail(tsxCode);
    return NextResponse.json({ htmlCode });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown compilation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
