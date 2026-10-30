import { useEffect, useRef, useSyncExternalStore } from 'react';
import { display } from '../client/display';

interface Drop { x: number; y: number; len: number; speed: number; alpha: number }

/**
 * 고립된 산속 펜션의 밤: 빗줄기 캔버스 + 필름 노이즈 + 비네트.
 * pointer-events 가 없으므로 아래 UI 조작을 막지 않는다.
 * intensity: 타이틀은 진하게, 대시보드는 가독성을 위해 옅게.
 */
export function Atmosphere(props: { intensity?: number; lightning?: boolean }) {
  const { effects } = useSyncExternalStore(display.subscribe, display.get);
  return effects ? <AtmosphereLayer {...props} /> : null;
}

function AtmosphereLayer({ intensity = 1, lightning = false }: { intensity?: number; lightning?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let w = 0, h = 0, raf = 0, last = performance.now();
    let nextFlash = performance.now() + 6000 + Math.random() * 9000;
    const drops: Drop[] = [];
    const spawn = (anywhere: boolean): Drop => ({
      x: Math.random() * (w + 200) - 100,
      y: anywhere ? Math.random() * h : -40 - Math.random() * 200,
      len: 10 + Math.random() * 22,
      speed: 650 + Math.random() * 650,
      alpha: (0.08 + Math.random() * 0.22) * intensity,
    });
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.round((w * h) / 9000 * intensity);
      drops.length = 0;
      for (let i = 0; i < target; i++) drops.push(spawn(true));
    };
    const SLANT = 0.18;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      for (const d of drops) {
        d.y += d.speed * dt;
        d.x += d.speed * SLANT * dt;
        if (d.y - d.len > h) Object.assign(d, spawn(false));
        ctx.strokeStyle = `rgba(170, 190, 215, ${d.alpha})`;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.len * SLANT, d.y - d.len);
        ctx.stroke();
      }
      if (lightning && now > nextFlash && flashRef.current) {
        flashRef.current.animate(
          [{ opacity: 0 }, { opacity: 0.35 }, { opacity: 0.05 }, { opacity: 0.22 }, { opacity: 0 }],
          { duration: 900, easing: 'ease-out' },
        );
        nextFlash = now + 9000 + Math.random() * 14000;
      }
      raf = requestAnimationFrame(frame);
    };
    resize();
    window.addEventListener('resize', resize);
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); }
    };
    document.addEventListener('visibilitychange', onVis);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [intensity, lightning]);

  return (
    <div className="atmosphere" aria-hidden>
      <canvas ref={canvasRef} className="rain" />
      <div className="grain" style={{ opacity: 0.06 + 0.06 * intensity }} />
      <div className="vignette" style={{ opacity: intensity }} />
      {lightning && <div ref={flashRef} className="flash" />}
    </div>
  );
}
