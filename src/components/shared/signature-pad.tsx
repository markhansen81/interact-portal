"use client";

import { useRef, useState, useEffect } from "react";
import SignaturePadLib from "signature_pad";

interface SignaturePadProps {
  onSign: (signatureData: {
    signature_png: string;
    signature_type: "draw" | "type";
    typed_name?: string;
    timestamp: string;
  }) => void;
  signerName: string;
}

export function SignaturePad({ onSign, signerName }: SignaturePadProps) {
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typedName, setTypedName] = useState(signerName);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);

  useEffect(() => {
    if (canvasRef.current && mode === "draw") {
      const canvas = canvasRef.current;
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(2, 2);

      padRef.current = new SignaturePadLib(canvas, {
        backgroundColor: "rgb(255, 255, 255)",
        penColor: "rgb(0, 0, 0)",
      });
    }

    return () => {
      padRef.current?.off();
    };
  }, [mode]);

  function handleClear() {
    padRef.current?.clear();
  }

  function handleSign() {
    const timestamp = new Date().toISOString();

    if (mode === "draw") {
      if (!padRef.current || padRef.current.isEmpty()) return;
      const signature_png = padRef.current.toDataURL("image/png");
      onSign({ signature_png, signature_type: "draw", timestamp });
    } else {
      if (!typedName.trim()) return;
      // Generate typed signature as canvas image
      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 200;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 600, 200);
      ctx.fillStyle = "black";
      ctx.font = "italic 48px Georgia, serif";
      ctx.fillText(typedName, 30, 120);
      const signature_png = canvas.toDataURL("image/png");
      onSign({ signature_png, signature_type: "type", typed_name: typedName, timestamp });
    }
  }

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("draw")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            mode === "draw"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "border border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
          }`}
        >
          Draw Signature
        </button>
        <button
          onClick={() => setMode("type")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            mode === "type"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "border border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
          }`}
        >
          Type Signature
        </button>
      </div>

      {/* Signature Area */}
      {mode === "draw" ? (
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-lg border-2 border-dashed border-zinc-300 bg-white dark:border-zinc-700">
            <canvas
              ref={canvasRef}
              className="h-40 w-full cursor-crosshair"
              style={{ touchAction: "none" }}
            />
            <div className="absolute bottom-2 left-4 right-4 border-t border-zinc-300" />
          </div>
          <button
            onClick={handleClear}
            className="text-sm text-zinc-500 hover:text-zinc-700"
          >
            Clear
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="Type your full name"
            className="input"
          />
          <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 bg-white dark:border-zinc-700">
            <p
              className="text-4xl italic text-zinc-900"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {typedName || "Your signature"}
            </p>
          </div>
        </div>
      )}

      {/* Legal Text */}
      <p className="text-xs text-zinc-400">
        By signing, you agree to the terms of this document. Your signature,
        timestamp, and IP address will be recorded.
      </p>

      {/* Sign Button */}
      <button
        onClick={handleSign}
        className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700"
      >
        Sign Document
      </button>
    </div>
  );
}
