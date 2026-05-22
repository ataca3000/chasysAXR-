import { useEffect, useRef } from 'react';

export function DNAOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let animationFrame: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const draw = () => {
      time += 0.015;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width * 0.85; // Posicionado a la derecha
      const startY = canvas.height * -0.2;
      const endY = canvas.height * 1.2;
      const step = 25; // Espaciado vertical
      const amplitude = 80; // Ancho de la hélice
      const freq = 0.03; // Frecuencia de torsión

      ctx.lineWidth = 1;

      for (let y = startY; y < endY; y += step) {
        const angle = y * freq + time * 3;
        const x1 = centerX + Math.cos(angle) * amplitude;
        const x2 = centerX + Math.cos(angle + Math.PI) * amplitude;

        const z1 = Math.sin(angle);
        const z2 = Math.sin(angle + Math.PI);

        // Líneas conectoras del ADN
        ctx.strokeStyle = `rgba(220, 38, 38, ${0.05 + (z1 + 1) * 0.1})`;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();

        // Nodos (puntos rojos)
        const drawPoint = (x: number, y: number, z: number) => {
            const size = 1.5 + (z + 1) * 2;
            const alpha = 0.3 + (z + 1) * 0.35;
            ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        };

        drawPoint(x1, y, z1);
        drawPoint(x2, y, z2);
      }

      animationFrame = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0 opacity-60 mix-blend-screen" />;
}
