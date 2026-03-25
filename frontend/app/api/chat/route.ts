import { NextRequest, NextResponse } from "next/server";

const BACKEND = "http://localhost:8000";

interface Command {
  action: string;
  [key: string]: unknown;
}

/** Parse natural language into pattern commands using regex. */
function parseMessage(msg: string): Command[] {
  const text = msg.trim().toLowerCase();
  const commands: Command[] = [];

  // reset
  if (/^reset$/.test(text)) {
    commands.push({ action: "reset" });
    return commands;
  }

  // add point X at x,y  or  add point X at x y
  const addPt = msg.match(/add\s+point\s+(\w+)\s+at\s+([\d.]+)[,\s]+([\d.]+)/i);
  if (addPt) {
    commands.push({ action: "add_point", name: addPt[1], x: parseFloat(addPt[2]), y: parseFloat(addPt[3]) });
  }

  // move point X to x,y
  const movePt = msg.match(/move\s+point\s+(\w+)\s+to\s+([\d.]+)[,\s]+([\d.]+)/i);
  if (movePt) {
    commands.push({ action: "move_point", name: movePt[1], x: parseFloat(movePt[2]), y: parseFloat(movePt[3]) });
  }

  // draw line from A to B  |  add line from A to B
  const addLn = msg.match(/(?:draw|add)\s+line\s+from\s+(\w+)\s+to\s+(\w+)/i);
  if (addLn) {
    commands.push({ action: "add_line", from_point: addLn[1], to_point: addLn[2] });
  }

  // add curve from A to B c1 x1,y1 c2 x2,y2
  const addCv = msg.match(
    /add\s+curve\s+from\s+(\w+)\s+to\s+(\w+)\s+c1\s+([\d.]+)[,\s]+([\d.]+)\s+c2\s+([\d.]+)[,\s]+([\d.]+)/i
  );
  if (addCv) {
    commands.push({
      action: "add_curve",
      from_point: addCv[1],
      to_point: addCv[2],
      c1x: parseFloat(addCv[3]),
      c1y: parseFloat(addCv[4]),
      c2x: parseFloat(addCv[5]),
      c2y: parseFloat(addCv[6]),
    });
  }

  // set <measurement> to <value>
  const setM = msg.match(/set\s+(\w+)\s+to\s+([\d.]+)/i);
  if (setM) {
    commands.push({ action: "set_measurement", name: setM[1], value: parseFloat(setM[2]) });
  }

  // delete point X
  const delPt = msg.match(/delete\s+point\s+(\w+)/i);
  if (delPt) {
    commands.push({ action: "delete_point", name: delPt[1] });
  }

  return commands;
}

export async function POST(req: NextRequest) {
  const { message } = await req.json();

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  const commands = parseMessage(message);

  if (commands.length === 0) {
    // No commands parsed — fetch current SVG and return helpful message
    let svg = "";
    try {
      const r = await fetch(`${BACKEND}/pattern/svg`);
      const d = await r.json();
      svg = d.svg;
    } catch {
      // backend unreachable
    }
    return NextResponse.json({
      reply:
        "I didn't understand that. Try:\n• add point E at 100,50\n• draw line from A to E\n• set bust to 96\n• move point B to 210,0\n• delete point E\n• reset",
      commands: [],
      errors: [],
      svg,
    });
  }

  // Send commands to backend
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
    let reply = "";
    if (applied > 0 && errorMessages.length === 0) {
      reply = `Applied ${applied} command${applied !== 1 ? "s" : ""} successfully.`;
    } else if (applied > 0) {
      reply = `Applied ${applied} command${applied !== 1 ? "s" : ""}. Some had errors.`;
    } else {
      reply = "No commands could be applied.";
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
