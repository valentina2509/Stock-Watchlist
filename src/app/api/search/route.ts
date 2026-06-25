import { NextRequest, NextResponse } from "next/server";
import { searchTickers } from "@/lib/market-data";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) return NextResponse.json([]);

  const results = await searchTickers(q);
  return NextResponse.json(results);
}
