import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { Resvg } from "@resvg/resvg-js";

const BACKEND = "http://localhost:8000";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are a pattern drafting assistant for a sewing pattern canvas.
The image shows the current state of the pattern: a grid in mm, navy dots are labelled points, black lines/curves connect them.

Given the user's instruction, output ONLY valid JSON in this exact format (no markdown, no extra text):
{"commands": [...], "reply": "..."}

Available commands:
- {"action": "add_point", "name": "E", "x": 100, "y": 50}
- {"action": "move_point", "name": "A", "x": 0, "y": 10}
- {"action": "add_line", "from_point": "A", "to_point": "B"}
- {"action": "add_curve", "from_point": "A", "to_point": "B", "c1x": 50, "c1y": 10, "c2x": 150, "c2y": 10}
- {"action": "set_measurement", "name": "bust", "value": 96}
- {"action": "delete_point", "name": "E"}
- {"action": "reset"}

Coordinates are in mm. The canvas is 200mm wide × 300mm tall.
Look at the image to understand which points already exist before deciding what commands to emit.
If you cannot fulfill the request, set commands to [] and explain in reply.`;

async function svgToPngBase64(svg: string): Promise<string> {
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 800 } });
  const pngData = resvg.render().asPng();
  return pngData.toString("base64");
}

export async function POST(req: NextRequest) {
  const { message } = await req.json();

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  // 1. Get current canvas SVG
  let svg = "";
  try {
    const r = await fetch(`${BACKEND}/pattern/svg`);
    const d = await r.json();
    svg = d.svg;
  } catch {
    return NextResponse.json(
      { reply: "Error: cannot reach the pattern backend at localhost:8000", commands: [], errors: [], svg: "" },
      { status: 502 }
    );
  }

  // 2. Rasterize SVG → PNG base64
  let base64 = "";
  try {
    base64 = await svgToPngBase64(svg);
  } catch (e) {
    console.error("SVG rasterization failed:", e);
    // fall through — we'll send text-only if this fails
  }

  // 3. Call GPT-4o with vision
  let commands: unknown[] = [];
  let reply = "";
  try {
    const content: OpenAI.Chat.ChatCompletionContentPart[] = [];
    if (base64) {
      content.push({
        type: "image_url",
        image_url: { url: `data:image/png;base64,${base64}`, detail: "low" },
      });
    }
    content.push({ type: "text", text: message });

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1024,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content },
      ],
    });

    const text = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text);
    commands = parsed.commands ?? [];
    reply = parsed.reply ?? "";
  } catch (e) {
    console.error("OpenAI call failed:", e);
    return NextResponse.json(
      { reply: "Error calling OpenAI API.", commands: [], errors: [], svg },
      { status: 500 }
    );
  }

  if (commands.length === 0) {
    return NextResponse.json({ reply: reply || "No actions needed.", commands: [], errors: [], svg });
  }

  // 4. Execute commands via backend
  try {
    const res = await fetch(`${BACKEND}/pattern/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands }),
    });
    const data = await res.json();

    const errorMessages: string[] = (data.errors ?? []).map(
      (e: { error: string }) => e.error
    );

    const applied: number = data.applied?.length ?? 0;
    if (!reply) {
      if (applied > 0 && errorMessages.length === 0) {
        reply = `Applied ${applied} command${applied !== 1 ? "s" : ""} successfully.`;
      } else if (applied > 0) {
        reply = `Applied ${applied} command${applied !== 1 ? "s" : ""}. Some had errors.`;
      } else {
        reply = "No commands could be applied.";
      }
    }

    return NextResponse.json({
      reply,
      commands: data.applied,
      errors: errorMessages,
      svg: data.svg,
    });
  } catch {
    return NextResponse.json(
      { reply: "Error: cannot reach the pattern backend at localhost:8000", commands: [], errors: [], svg: "" },
      { status: 502 }
    );
  }
}
