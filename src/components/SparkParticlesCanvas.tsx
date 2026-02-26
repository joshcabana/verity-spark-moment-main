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
  mode?: SparkParticleMode;
};

export type SparkParticleMode = "ambient" | "converging" | "exploding";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const SparkParticlesCanvas = ({
  className = "",
  density = 100,
  speed = 0.35,
  mode = "ambient",
}: SparkParticlesCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modeRef = useRef<SparkParticleMode>(mode);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

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
    let activeMode: SparkParticleMode = modeRef.current;
    let modeSince = 0;

    const mouse = { x: 0, y: 0, active: false };

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const applyExplosionImpulse = () => {
      const centerX = width / 2;
      const centerY = height / 2;

      particles.forEach((particle) => {
        const dx = particle.x - centerX;
        const dy = particle.y - centerY;
        const dist = Math.max(0.001, Math.hypot(dx, dy));
        const angleNoise = (Math.random() - 0.5) * 0.4;
        const unitX = dx / dist;
        const unitY = dy / dist;
        const impulse = 0.85 + Math.random() * 0.9;

        particle.vx = (unitX + angleNoise) * impulse;
        particle.vy = (unitY + angleNoise) * impulse;
        particle.alpha = clamp(particle.alpha + 0.15, 0.22, 0.92);
      });
    };

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

    const drawConnections = (modeToDraw: SparkParticleMode) => {
      const maxDist = modeToDraw === "ambient" ? 110 : 140;
      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist > maxDist) continue;

          const strengthScale = modeToDraw === "ambient" ? 0.22 : 0.3;
          const strength = (1 - dist / maxDist) * strengthScale;
          ctx.strokeStyle = `hsla(${(a.hue + b.hue) / 2}, 90%, 62%, ${strength})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    };

    const drawAuroraOrb = (modeToDraw: SparkParticleMode, elapsedMs: number) => {
      if (modeToDraw === "ambient") return;

      const centerX = width / 2;
      const centerY = height / 2;
      const pulse = 1 + Math.sin(elapsedMs / 220) * 0.08;
      const orbRadius = modeToDraw === "converging" ? 88 * pulse : 104 * pulse;
      const modeOpacity = modeToDraw === "converging" ? 0.52 : 0.38;

      const gradient = ctx.createRadialGradient(centerX, centerY, 12, centerX, centerY, orbRadius);
      gradient.addColorStop(0, "rgba(255,255,255,0.32)");
      gradient.addColorStop(0.28, `rgba(52,211,153,${modeOpacity})`);
      gradient.addColorStop(0.62, `rgba(217,70,239,${modeOpacity * 0.82})`);
      gradient.addColorStop(1, "rgba(10,10,10,0)");

      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    };

    const drawEnergyRings = (elapsedMs: number) => {
      const centerX = width / 2;
      const centerY = height / 2;

      for (let i = 0; i < 3; i += 1) {
        const progress = ((elapsedMs / 340) + i * 0.28) % 1;
        const radius = 24 + progress * Math.min(width, height) * 0.42;
        const alpha = (1 - progress) * 0.26;

        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    const render = (timestamp: number) => {
      if (activeMode !== modeRef.current) {
        activeMode = modeRef.current;
        modeSince = timestamp;
        if (activeMode === "exploding") {
          applyExplosionImpulse();
        }
      }

      if (modeSince === 0) {
        modeSince = timestamp;
      }

      ctx.clearRect(0, 0, width, height);
      const centerX = width / 2;
      const centerY = height / 2;
      const elapsedInMode = timestamp - modeSince;

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];

        if (!reduceMotion) {
          if (activeMode === "ambient") {
            p.x += p.vx;
            p.y += p.vy;
            p.vx += (Math.random() - 0.5) * 0.003;
            p.vy += (Math.random() - 0.5) * 0.003;
            p.vx = clamp(p.vx, -1.1, 1.1);
            p.vy = clamp(p.vy, -1.1, 1.1);
          } else if (activeMode === "converging") {
            const dxToCenter = centerX - p.x;
            const dyToCenter = centerY - p.y;
            const distance = Math.max(0.001, Math.hypot(dxToCenter, dyToCenter));
            const pull = clamp(0.02 + distance / 9000, 0.01, 0.055);

            p.vx += (dxToCenter / distance) * pull;
            p.vy += (dyToCenter / distance) * pull;
            p.vx *= 0.985;
            p.vy *= 0.985;
            p.vx = clamp(p.vx, -1.8, 1.8);
            p.vy = clamp(p.vy, -1.8, 1.8);

            p.x += p.vx;
            p.y += p.vy;
          } else {
            const shockBoost = elapsedInMode < 180 ? 1.2 : 1;
            const settleFactor = clamp((elapsedInMode - 1200) / 1500, 0, 1);

            p.x += p.vx * shockBoost;
            p.y += p.vy * shockBoost;

            p.vx *= elapsedInMode < 900 ? 0.989 : 0.968;
            p.vy *= elapsedInMode < 900 ? 0.989 : 0.968;

            if (settleFactor > 0) {
              p.vx += (Math.random() - 0.5) * 0.008 * settleFactor;
              p.vy += (Math.random() - 0.5) * 0.008 * settleFactor;
            }

            p.vx = clamp(p.vx, -2.2 + settleFactor, 2.2 - settleFactor);
            p.vy = clamp(p.vy, -2.2 + settleFactor, 2.2 - settleFactor);
          }

          if (p.x <= -8 || p.x >= width + 8) p.vx *= -1;
          if (p.y <= -8 || p.y >= height + 8) p.vy *= -1;

          if (activeMode === "ambient" && mouse.active) {
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

        const modeAlphaBoost = activeMode === "ambient" ? 0 : activeMode === "converging" ? 0.1 : 0.06;
        const particleAlpha = clamp(p.alpha + modeAlphaBoost, 0.2, 0.95);

        ctx.fillStyle = `hsla(${p.hue}, 95%, 64%, ${particleAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + (activeMode === "converging" ? 0.15 : 0), 0, Math.PI * 2);
        ctx.fill();
      }

      drawConnections(activeMode);
      drawAuroraOrb(activeMode, elapsedInMode);
      if (activeMode === "exploding") {
        drawEnergyRings(elapsedInMode);
      }

      rafId = window.requestAnimationFrame((nextTimestamp) => render(nextTimestamp));
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
    render(performance.now());

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
