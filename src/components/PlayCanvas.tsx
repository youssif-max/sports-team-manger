"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { drawCourt } from "@/lib/courts";

export type PlayCanvasHandle = {
  getDataUrl: () => string;
};

const COLORS = ["#111827", "#dc2626", "#2563eb", "#16a34a", "#f59e0b"];
const WIDTHS = [2, 4, 7];
const CANVAS_W = 600;
const CANVAS_H = 450;

export const PlayCanvas = forwardRef<PlayCanvasHandle, { sport: string }>(
  function PlayCanvas({ sport }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const last = useRef<{ x: number; y: number } | null>(null);
    const [color, setColor] = useState(COLORS[0]);
    const [lineWidth, setLineWidth] = useState(WIDTHS[1]);

    function redrawCourt() {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      drawCourt(ctx, sport, CANVAS_W, CANVAS_H);
    }

    useEffect(() => {
      redrawCourt();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sport]);

    useImperativeHandle(ref, () => ({
      getDataUrl: () => canvasRef.current?.toDataURL("image/png") ?? "",
    }));

    function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
        y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
      };
    }

    function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
      drawing.current = true;
      last.current = getPos(e);
      e.currentTarget.setPointerCapture(e.pointerId);
    }

    function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
      if (!drawing.current || !last.current) return;
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const pos = getPos(e);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      last.current = pos;
    }

    function handlePointerUp() {
      drawing.current = false;
      last.current = null;
    }

    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-7 w-7 rounded-full border-2 ${
                color === c ? "border-neutral-900 dark:border-white" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
              aria-label={`Pen color ${c}`}
            />
          ))}
          <div className="mx-1 h-6 w-px bg-neutral-200 dark:bg-neutral-700" />
          {WIDTHS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setLineWidth(w)}
              aria-label={`Pen width ${w}`}
              className={`flex h-7 w-7 items-center justify-center rounded-lg border ${
                lineWidth === w
                  ? "border-brand-600 bg-brand-600/10"
                  : "border-neutral-300 dark:border-neutral-700"
              }`}
            >
              <span
                className="rounded-full bg-neutral-700 dark:bg-neutral-200"
                style={{ width: w + 2, height: w + 2 }}
              />
            </button>
          ))}
          <div className="mx-1 h-6 w-px bg-neutral-200 dark:bg-neutral-700" />
          <button
            type="button"
            onClick={redrawCourt}
            className="rounded-lg border border-neutral-300 px-3 py-1 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Clear
          </button>
        </div>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="touch-none rounded-lg border border-neutral-300 bg-white dark:border-neutral-700"
          style={{
            width: "100%",
            maxWidth: CANVAS_W,
            height: "auto",
            aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
          }}
        />
      </div>
    );
  }
);
