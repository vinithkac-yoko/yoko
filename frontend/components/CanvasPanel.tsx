"use client";

import { useEffect, useState } from "react";

const BACKEND = "http://localhost:8000";

interface Props {
  svg: string;
  onSvgUpdate: (svg: string) => void;
}

export default function CanvasPanel({ svg, onSvgUpdate }: Props) {
  const [error, setError] = useState<string>("");
  const [resetting, setResetting] = useState(false);

  // Load initial SVG from backend on mount
  useEffect(() => {
    fetch(`${BACKEND}/pattern/svg`)
      .then((r) => r.json())
      .then((d) => onSvgUpdate(d.svg))
      .catch(() => setError("Cannot connect to backend at localhost:8000"));
  }, [onSvgUpdate]);

  async function handleReset() {
    setResetting(true);
    try {
      const res = await fetch(`${BACKEND}/pattern/reset`, { method: "POST" });
      const data = await res.json();
      onSvgUpdate(data.svg);
      setError("");
    } catch {
      setError("Reset failed — is the backend running?");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-gray-800 text-sm">Pattern Canvas</h1>
          <p className="text-xs text-gray-500">Seamly2D-style pattern view</p>
        </div>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
        >
          {resetting ? "Resetting…" : "Reset pattern"}
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto p-4 bg-gray-50">
        {error && (
          <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}
        {svg ? (
          <div
            className="shadow-sm rounded-lg overflow-hidden inline-block"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Loading pattern…
          </div>
        )}
      </div>
    </div>
  );
}
