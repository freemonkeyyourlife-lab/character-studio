import { NextResponse } from "next/server";
import { planAgentTask, type AgentTask } from "@/lib/agents/orchestrator";
import type { ConversationContext } from "@/lib/agents/context";

export const runtime = "nodejs";

const tasks = new Set<AgentTask>(["chat", "image", "video", "voice"]);

export async function POST(request: Request) {
  try {
    const body = await request.json() as { task?: AgentTask; context?: ConversationContext };
    if (!body.task || !tasks.has(body.task)) return NextResponse.json({ error: "Invalid agent task." }, { status: 400 });
    if (!body.context || !Array.isArray(body.context.messages)) return NextResponse.json({ error: "Conversation context with messages is required." }, { status: 400 });
    return NextResponse.json({ ok: true, plan: planAgentTask(body.task, body.context) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid agent request." }, { status: 400 });
  }
}
