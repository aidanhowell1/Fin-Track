import React, { useEffect, useRef } from 'react';

interface FloatingIcon {
  x: number;
  y: number;
  vx: number;
  vy: number;
  icon: string;
  rotation: number;
  vr: number;
  scale: number;
}

const ICONS = ['$', '€', '£', '¥', '📊', '💰', '📈'];

export const AnimatedAuthBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const iconsRef = useRef<FloatingIcon[]>([]);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createIcons = () => {
      const icons: FloatingIcon[] = [];
      const numIcons = Math.min(20, Math.floor(window.innerWidth * window.innerHeight / 50000));
      
      for (let i = 0; i < numIcons; i++) {
        icons.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          icon: ICONS[Math.floor(Math.random() * ICONS.length)],
          rotation: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.02,
          scale: 0.5 + Math.random() * 0.5,
        });
      }
      return icons;
    };

    const animate = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      iconsRef.current.forEach((icon) => {
        // Update position
        icon.x += icon.vx;
        icon.y += icon.vy;
        icon.rotation += icon.vr;

        // Bounce off walls
        if (icon.x < 0 || icon.x > canvas.width) icon.vx *= -1;
        if (icon.y < 0 || icon.y > canvas.height) icon.vy *= -1;

        // Draw icon with glow effect
        ctx.save();
        ctx.translate(icon.x, icon.y);
        ctx.rotate(icon.rotation);
        ctx.scale(icon.scale, icon.scale);

        // Add glow effect
        ctx.shadowColor = '#4f46e5';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#6366f1';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon.icon, 0, 0);

        ctx.restore();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Initial setup
    resizeCanvas();
    iconsRef.current = createIcons();
    animate();

    // Handle window resize
    window.addEventListener('resize', () => {
      resizeCanvas();
      iconsRef.current = createIcons();
    });

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 bg-gradient-to-b from-gray-900 to-gray-800"
      style={{ opacity: 0.6 }}
    />
  );
};

export default AnimatedAuthBackground;