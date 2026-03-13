import { useEffect, useRef } from "react";
import gsap from "gsap";

const STAR_COUNT = 200;
const ARMS = 5;

export const SpiralAnimation = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear previous stars
    container.innerHTML = "";
    starsRef.current = [];

    const cx = container.offsetWidth / 2;
    const cy = container.offsetHeight / 2;
    const maxRadius = Math.min(cx, cy) * 0.85;

    for (let i = 0; i < STAR_COUNT; i++) {
      const star = document.createElement("div");
      const arm = i % ARMS;
      const t = (i / STAR_COUNT); // 0-1 progress along arm
      const armAngle = (arm / ARMS) * Math.PI * 2;
      const spiralAngle = armAngle + t * Math.PI * 3;
      const radius = t * maxRadius;

      const x = cx + Math.cos(spiralAngle) * radius;
      const y = cy + Math.sin(spiralAngle) * radius;
      const size = 1 + Math.random() * 2.5;
      const brightness = 0.3 + Math.random() * 0.7;

      star.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        left: ${x}px;
        top: ${y}px;
        background: rgba(0, ${Math.floor(200 + brightness * 55)}, 156, ${brightness});
        box-shadow: 0 0 ${4 + brightness * 6}px rgba(0, 255, 156, ${brightness * 0.5});
        pointer-events: none;
      `;

      container.appendChild(star);
      starsRef.current.push(star);
    }

    // Rotate the entire container continuously
    gsap.to(container, {
      rotation: 360,
      duration: 120,
      repeat: -1,
      ease: "none",
      transformOrigin: "50% 50%",
    });

    // Pulse individual stars
    starsRef.current.forEach((star, i) => {
      gsap.to(star, {
        opacity: 0.2 + Math.random() * 0.5,
        scale: 0.6 + Math.random() * 0.8,
        duration: 1.5 + Math.random() * 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: Math.random() * 2,
      });
    });

    // Centre glow
    const glow = document.createElement("div");
    glow.style.cssText = `
      position: absolute;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      left: ${cx - 6}px;
      top: ${cy - 6}px;
      background: radial-gradient(circle, rgba(0,255,204,0.9) 0%, rgba(0,255,156,0) 100%);
      box-shadow: 0 0 20px rgba(0,255,204,0.6);
      pointer-events: none;
    `;
    container.appendChild(glow);

    gsap.to(glow, {
      boxShadow: "0 0 30px rgba(0,255,204,0.9)",
      scale: 1.3,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });

    return () => {
      gsap.killTweensOf(container);
      starsRef.current.forEach((s) => gsap.killTweensOf(s));
      gsap.killTweensOf(glow);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ position: "relative", overflow: "hidden" }}
    />
  );
};

export default SpiralAnimation;
