import { NextResponse } from "next/server";
import { rerunScenario } from "@/lib/grind/repository/demo-store";

export async function GET() {
  return NextResponse.json(rerunScenario());
}
