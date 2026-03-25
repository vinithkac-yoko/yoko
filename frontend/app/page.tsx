"use client";

import { useState } from "react";
import ChatPanel from "@/components/ChatPanel";
import CanvasPanel from "@/components/CanvasPanel";

export default function Home() {
  const [svg, setSvg] = useState<string>("");

  return (
    <main className="flex h-screen overflow-hidden bg-gray-50">
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        <ChatPanel onSvgUpdate={setSvg} />
      </div>
      <div className="w-2/3 flex flex-col">
        <CanvasPanel svg={svg} onSvgUpdate={setSvg} />
      </div>
    </main>
  );
}
