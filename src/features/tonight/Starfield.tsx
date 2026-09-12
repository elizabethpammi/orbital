import { useEffect, useRef } from 'react';
import { generateStars, hashSeed } from '../../lib/starfield';

const STAR_COUNT = 420;
const TWINKLE_SPEED = 0.0012; // radians per ms

/**
 * Full-viewport canvas starfield. Seeded by the current UTC date, so the sky
 * is stable within a day and quietly different tomorrow. Twinkle animation is
 * skipped entirely when the user prefers reduced motion.
 */
export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const stars = generateStars(hashSeed(new Date().toISOString().slice(0, 10)), STAR_COUNT);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;

    const draw = (elapsedMs: number) => {
      const { width, height } = canvas;
      context.clearRect(0, 0, width, height);
      for (const star of stars) {
        const twinkle = reducedMotion
          ? 1
          : 0.75 + 0.25 * Math.sin(star.twinklePhase + elapsedMs * TWINKLE_SPEED);
        context.globalAlpha = star.alpha * twinkle;
        context.beginPath();
        context.arc(star.x * width, star.y * height, star.radius * devicePixelRatio, 0, Math.PI * 2);
        context.fillStyle = '#e8ecf4';
        context.fill();
      }
      context.globalAlpha = 1;
    };

    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * devicePixelRatio);
      canvas.height = Math.floor(window.innerHeight * devicePixelRatio);
      draw(performance.now());
    };
    resize();
    window.addEventListener('resize', resize);

    if (!reducedMotion) {
      const tick = (time: number) => {
        draw(time);
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={canvasRef} className="starfield" aria-hidden="true" />;
}
