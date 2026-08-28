import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { validateApiKey } from "@/lib/api-auth";


export async function POST(req: NextRequest) {
  if (!validateApiKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json({ error: "AI_KEY_MISSING" }, { status: 503 });
  }

  const { stats } = await req.json();
  if (!stats) {
    return NextResponse.json({ error: "stats payload required" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: anthropicKey });

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 900,
    system: `You are a CRM performance analyst for a B2B/B2C service business using 96 Kapital CRM. Your role is to analyse lead pipeline data and surface 4–6 concise, highly actionable business insights applicable to any industry.

Return ONLY a valid JSON array — no prose, no markdown, no explanation. Each element must have exactly these fields:
- "type": one of "critical", "warning", "positive", or "info"
- "headline": max 12 words, specific and data-driven
- "detail": 1–2 sentences with a concrete action the team can take today
- "metric": a short label like "6 urgent leads", "$12,400 pipeline", or "28% conversion"

Focus on: speed-to-lead (leads contacted within 5 minutes convert 9× more often), active pipeline revenue, lead source ROI, conversion rate trends, and response time SLA compliance. Frame insights around universal sales performance principles — urgency, follow-up velocity, and pipeline health.`,
    messages: [
      {
        role: "user",
        content: `Analyse this CRM snapshot and return 4–6 insights as a JSON array:\n\n${JSON.stringify(stats, null, 2)}`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  // Extract JSON array from response
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) {
    return NextResponse.json({ error: "Unexpected AI response format" }, { status: 500 });
  }

  let insights;
  try {
    insights = JSON.parse(match[0]);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  return NextResponse.json({ insights, generatedAt: new Date().toISOString() });
}
