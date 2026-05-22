import { useEffect, useRef } from 'react';

export function Particle10() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let particles: Array<{
      x: number; y: number; originX: number; originY: number;
      vx: number; vy: number; angle: number; speed: number;
    }> = [];
    
    let bgParticles: Array<{
      x: number; y: number; z: number; angle: number; radius: number; speed: number;
    }> = [];

    const initParticles = () => {
      particles = [];
      bgParticles = [];
      const width = canvas.width;
      const height = canvas.height;
      
      // Draw "10" to get pixel data
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'white';
      ctx.font = `900 ${Math.min(width, height) * 0.6}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('10', width / 2, height / 2);

      const data = ctx.getImageData(0, 0, width, height).data;
      ctx.clearRect(0, 0, width, height);

      const step = 6; // Mayor densidad
      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const alpha = data[(y * width + x) * 4 + 3];
          if (alpha > 128) {
             const dx = x - width/2;
             const dy = y - height/2;
             const distance = Math.sqrt(dx*dx + dy*dy);
             const angle = Math.atan2(dy, dx);
             
             particles.push({
               x: width/2 + Math.cos(angle) * (distance + Math.random() * 800), 
               y: height/2 + Math.sin(angle) * (distance + Math.random() * 800),
               originX: x,
               originY: y,
               vx: (Math.random() - 0.5) * 2,
               vy: (Math.random() - 0.5) * 2,
               angle: angle,
               speed: Math.random() * 0.05
             });
          }
        }
      }
      
      // Orbiting background particles
      for (let i = 0; i < 400; i++) {
        const zLayer = i % 4; // 0, 1, 2, 3
        bgParticles.push({
            angle: Math.random() * Math.PI * 2,
            radius: Math.random() * Math.max(width, height) * 1.5,
            z: zLayer,
            speed: (0.001 + Math.random() * 0.002) / (zLayer + 1),
            x: 0, y: 0
        });
      }
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    window.addEventListener('resize', resize);
    resize();

    let animationFrame: number;
    let time = 0;

    const animate = () => {
      time += 0.015;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Draw Orbiting Background Particles
      bgParticles.forEach(p => {
         p.angle += p.speed;
         const perspective = 1 / ((p.z * 0.5) + 1);
         p.x = cx + Math.cos(p.angle) * p.radius * perspective;
         p.y = cy + Math.sin(p.angle) * p.radius * perspective * 0.5; // Squash Y for orbital look
         
         const size = Math.max(0.2, (4 - p.z) * 0.8 * perspective);
         const alpha = (4 - p.z) * 0.2;
         
         ctx.fillStyle = `rgba(255, 30, 30, ${alpha})`;
         ctx.shadowBlur = 0;
         if (p.z === 0) {
             ctx.shadowColor = 'rgba(255, 30, 30, 0.9)';
             ctx.shadowBlur = 10;
         }
         ctx.beginPath();
         ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
         ctx.fill();
      });

      const cycle = Math.sin(time * 0.5) * 0.5 + 0.5; // 0 to 1
      const isDispersing = cycle < 0.15; // Menos tiempo disperso

      particles.forEach((p, index) => {
         // Rotación con efecto 3D simple en X e Y
         const currentAngle = p.angle + Math.sin(time * 0.2) * 0.2;
         const distCenter = Math.sqrt((p.originX - cx)**2 + (p.originY - cy)**2);
         // Efecto de perspectiva
         const perspective = 1 + Math.sin(time * p.speed * 10 + p.originX * 0.01) * 0.2;
         
         const rotatedOriginX = cx + Math.cos(currentAngle) * distCenter * perspective;
         const rotatedOriginY = cy + Math.sin(currentAngle) * distCenter * (perspective * 0.8); // Aplastar un poco en Y para dar profundidad

         if (isDispersing) {
            p.vx += (Math.random() - 0.5) * 2;
            p.vy += (Math.random() - 0.5) * 2;
            p.x += p.vx;
            p.y += p.vy;
         } else {
            const ease = 0.05 + p.speed;
            p.vx *= 0.9;
            p.vy *= 0.9;
            p.x += (rotatedOriginX - p.x) * ease + p.vx;
            p.y += (rotatedOriginY - p.y) * ease + p.vy;
         }

         const size = isDispersing ? 1 : 1.5 * perspective;
         const alpha = isDispersing ? 0.4 : 0.8 + perspective * 0.2;
         
         ctx.fillStyle = `rgba(255, 30, 30, ${alpha})`; // Rojo intenso neón
         ctx.shadowColor = 'rgba(255, 30, 30, 1)';
         ctx.shadowBlur = isDispersing ? 0 : 8;

         ctx.beginPath();
         ctx.arc(p.x, p.y, Math.max(0.1, size), 0, Math.PI * 2);
         ctx.fill();
         
         // Conectar algunas partículas cercanas para dar efecto de red tridimensional
         if (!isDispersing && index % 12 === 0) {
            ctx.shadowBlur = 0;
            ctx.strokeStyle = `rgba(255, 30, 30, ${alpha * 0.2})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(cx + Math.cos(currentAngle + 0.1) * distCenter * perspective, 
                       cy + Math.sin(currentAngle + 0.1) * distCenter * (perspective * 0.8));
            ctx.stroke();
         }
      });

      animationFrame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-0 mix-blend-screen opacity-80"
    />
  );
}
