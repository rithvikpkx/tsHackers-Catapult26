import { NextResponse } from "next/server";
import { recordVoiceIntent } from "@/lib/grind/repository/demo-store";
import type { VoiceIntent } from "@/lib/grind/contracts";

export async function POST(request: Request) {
  const body = (await request.json()) as { callId?: string; intent?: VoiceIntent };
  if (!body.callId || !body.intent) {
    return NextResponse.json({ error: "callId and intent are required" }, { status: 400 });
  }

  return NextResponse.json(recordVoiceIntent(body.callId, body.intent));
}
