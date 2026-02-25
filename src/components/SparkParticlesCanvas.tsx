import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  hue: number;
};

type SparkParticlesCanvasProps = {
  className?: string;
  density?: number;
  speed?: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const SparkParticlesCanvas = ({
  className = "",
  density = 100,
  speed = 0.35,
}: SparkParticlesCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let rafId = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles: Particle[] = [];

    const mouse = { x: 0, y: 0, active: false };

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const spawnParticle = (): Particle => {
      const teal = Math.random() > 0.55;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        size: 0.6 + Math.random() * 2.3,
        alpha: 0.22 + Math.random() * 0.6,
        hue: teal ? 160 + Math.random() * 18 : 300 + Math.random() * 18,
      };
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = clamp(window.devicePixelRatio || 1, 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const targetCount = clamp(Math.floor((width * height) / 17000 * (density / 100)), 45, 180);
      particles = Array.from({ length: targetCount }, spawnParticle);
    };

    const drawConnections = () => {
      const maxDist = 110;
      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist > maxDist) continue;

          const strength = (1 - dist / maxDist) * 0.22;
          ctx.strokeStyle = `hsla(${(a.hue + b.hue) / 2}, 90%, 62%, ${strength})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];

        if (!reduceMotion) {
          p.x += p.vx;
          p.y += p.vy;

          if (p.x <= -8 || p.x >= width + 8) p.vx *= -1;
          if (p.y <= -8 || p.y >= height + 8) p.vy *= -1;

          if (mouse.active) {
            const mx = p.x - mouse.x;
            const my = p.y - mouse.y;
            const dist = Math.hypot(mx, my);
            if (dist < 120 && dist > 0.1) {
              const force = (1 - dist / 120) * 0.08;
              p.vx += (mx / dist) * force;
              p.vy += (my / dist) * force;
              p.vx = clamp(p.vx, -1.3, 1.3);
              p.vy = clamp(p.vy, -1.3, 1.3);
            }
          }
        }

        ctx.fillStyle = `hsla(${p.hue}, 95%, 64%, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      drawConnections();

      rafId = window.requestAnimationFrame(render);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
      mouse.active =
        mouse.x >= 0 && mouse.x <= rect.width && mouse.y >= 0 && mouse.y <= rect.height;
    };

    const onPointerLeave = () => {
      mouse.active = false;
    };

    resize();
    render();

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerout", onPointerLeave, { passive: true });

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", onPointerLeave);
    };
  }, [density, speed]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      aria-hidden="true"
    />
  );
};

export default SparkParticlesCanvas;
