import { NextRequest, NextResponse } from "next/server";
import { calculateAndPersistScore } from "@/lib/conviction-scorer";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const breakdown = await calculateAndPersistScore(Number(params.id));
    return NextResponse.json(breakdown);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Score calculation failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
