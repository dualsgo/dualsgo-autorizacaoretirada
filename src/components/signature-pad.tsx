"use client";

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Signature, Eraser } from 'lucide-react';
import { Card, CardContent } from './ui/card';

interface SignaturePadProps {
  id: string;
  label: string;
  onSignatureChange: (signatureDataUrl: string | null) => void;
  signatureError?: string;
  width?: number;
  height?: number;
}

export function SignaturePad({
  id,
  label,
  onSignatureChange,
  signatureError,
  width = 300,
  height = 150,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  const getCanvasContext = useCallback(() => {
    return canvasRef.current?.getContext('2d');
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Set canvas dimensions for high DPI screens
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px;`
      
      const ctx = getCanvasContext();
      if (ctx) {
        ctx.scale(ratio, ratio);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [width, height, getCanvasContext]);

  const startDrawing = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    const ctx = getCanvasContext();
    if (!ctx) return;

    const pos = getMousePos(event);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasSigned(true);
  }, [getCanvasContext]);

  const draw = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const ctx = getCanvasContext();
    if (!ctx) return;

    const pos = getMousePos(event);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }, [isDrawing, getCanvasContext]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;
    const ctx = getCanvasContext();
    if (ctx) ctx.closePath();
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onSignatureChange(dataUrl);
    }
  }, [isDrawing, getCanvasContext, onSignatureChange]);

  const getMousePos = (event: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    let clientX, clientY;
    if (event.nativeEvent instanceof MouseEvent) {
      clientX = event.nativeEvent.clientX;
      clientY = event.nativeEvent.clientY;
    } else if (event.nativeEvent instanceof TouchEvent) {
      clientX = event.nativeEvent.touches[0].clientX;
      clientY = event.nativeEvent.touches[0].clientY;
    } else {
      clientX = 0;
      clientY = 0;
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const clearSignature = useCallback(() => {
    const ctx = getCanvasContext();
    if (ctx) {
      ctx.clearRect(0, 0, width, height);
    }
    onSignatureChange(null);
    setHasSigned(false);
  }, [getCanvasContext, onSignatureChange, width, height]);

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="font-medium">{label}</Label>
      <Card className="border-muted-foreground/50">
        <CardContent className="p-2 flex flex-col items-center">
          <canvas
            id={id}
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing} // Stop drawing if mouse leaves canvas
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="border border-input rounded-md cursor-crosshair bg-white touch-none"
            aria-label="Campo de assinatura digital"
            style={{ width: `${width}px`, height: `${height}px` }}
          />
          <div className="mt-2 flex space-x-2">
            <Button type="button" variant="outline" size="sm" onClick={clearSignature} disabled={!hasSigned} aria-label="Limpar assinatura">
              <Eraser className="mr-2 h-4 w-4" />
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>
      {signatureError && <p className="text-sm text-destructive">{signatureError}</p>}
    </div>
  );
}
