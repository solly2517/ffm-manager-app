import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

type DigitalSignaturePadProps = {
  disabled?: boolean;
  onChange: (dataUrl: string | null) => void;
};

export function DigitalSignaturePad({ disabled = false, onChange }: DigitalSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);
  const resetCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#0f172a";
    context.lineWidth = 5;
    context.lineCap = "round";
    context.lineJoin = "round";
    setHasSignature(false);
    onChange(null);
  };
  useEffect(() => { resetCanvas(); }, []);
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) };
  };
  const begin = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    canvas.setPointerCapture(event.pointerId);
    const next = point(event);
    context.beginPath();
    context.moveTo(next.x, next.y);
    drawingRef.current = true;
  };
  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || disabled) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    const next = point(event);
    context.lineTo(next.x, next.y);
    context.stroke();
  };
  const end = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setHasSignature(true);
    onChange(canvas.toDataURL("image/png"));
  };
  return <div className="space-y-2"><canvas ref={canvasRef} width={800} height={280} className="h-36 w-full touch-none rounded-md border border-cyan-400/35 bg-white" aria-label="Recipient digital signature pad" role="img" onPointerDown={begin} onPointerMove={draw} onPointerUp={end} onPointerCancel={end}/><div className="flex items-center justify-between gap-3"><p className="text-xs text-slate-400">Ask the recipient to sign above using a finger, stylus, or mouse.</p><Button type="button" variant="outline" size="sm" disabled={disabled || !hasSignature} onClick={resetCanvas}><RotateCcw size={14}/> Clear</Button></div></div>;
}
