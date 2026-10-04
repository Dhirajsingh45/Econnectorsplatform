import React, { useEffect, useRef } from 'react';

// Constellation definitions with relative coordinates (0 to 1) for responsive placement
const CONSTELLATIONS_DATA = [
  {
    id: 'orion',
    name: 'Orion',
    title: 'Orion — The Hunter',
    color: '#a0c8ff',
    glowColor: 'rgba(160, 200, 255, 0.6)',
    anchor: { x: 0.18, y: 0.35 }, // Center anchor relative to screen
    scale: 140, // Base pixel scale
    labelOffset: { x: -35, y: -65 },
    points: [
      { id: 0, x: -0.4, y: -0.6, size: 3.2, name: 'Betelgeuse', color: '#ffaa66' }, // Top left
      { id: 1, x: 0.4, y: -0.5, size: 2.8, name: 'Bellatrix', color: '#a0c8ff' },  // Top right
      { id: 2, x: -0.2, y: 0.0, size: 2.5, name: 'Alnitak', color: '#80f0ff' },    // Belt 1
      { id: 3, x: 0.0, y: 0.02, size: 2.5, name: 'Alnilam', color: '#ffffff' },    // Belt 2
      { id: 4, x: 0.2, y: 0.04, size: 2.5, name: 'Mintaka', color: '#80f0ff' },    // Belt 3
      { id: 5, x: -0.35, y: 0.6, size: 2.6, name: 'Saiph', color: '#a0c8ff' },    // Bottom left
      { id: 6, x: 0.45, y: 0.55, size: 3.4, name: 'Rigel', color: '#70e0ff' },     // Bottom right
      { id: 7, x: 0.0, y: -0.85, size: 2.0, name: 'Meissa', color: '#d0a0ff' },   // Head
    ],
    edges: [
      [7, 0], [7, 1], // Head to shoulders
      [0, 2], [1, 4], // Shoulders to belt ends
      [2, 3], [3, 4], // Belt line
      [2, 5], [4, 6], // Belt to knees
    ]
  },
  {
    id: 'cygnus',
    name: 'Cygnus',
    title: 'Cygnus — The Swan',
    color: '#80f0ff',
    glowColor: 'rgba(128, 240, 255, 0.6)',
    anchor: { x: 0.78, y: 0.22 },
    scale: 130,
    labelOffset: { x: 20, y: -50 },
    points: [
      { id: 0, x: 0.0, y: -0.7, size: 3.5, name: 'Deneb', color: '#ffffff' },    // Tail (brightest)
      { id: 1, x: 0.0, y: -0.1, size: 2.8, name: 'Sadr', color: '#80f0ff' },     // Center chest
      { id: 2, x: 0.0, y: 0.65, size: 2.4, name: 'Albireo', color: '#ffe082' },  // Head/Beak
      { id: 3, x: -0.65, y: -0.2, size: 2.6, name: 'Gienah', color: '#a0c8ff' }, // Left wing tip
      { id: 4, x: 0.65, y: -0.05, size: 2.6, name: 'Delta Cyg', color: '#c77dff' } // Right wing tip
    ],
    edges: [
      [0, 1], [1, 2], // Spine / Body line
      [3, 1], [1, 4]  // Cross Wings
    ]
  },
  {
    id: 'draco',
    name: 'Draco',
    title: 'Draco — The Dragon',
    color: '#c77dff',
    glowColor: 'rgba(199, 125, 255, 0.6)',
    anchor: { x: 0.48, y: 0.16 },
    scale: 150,
    labelOffset: { x: -40, y: -55 },
    points: [
      { id: 0, x: -0.6, y: -0.3, size: 3.0, name: 'Eltanin', color: '#ffb703' }, // Head 1
      { id: 1, x: -0.35, y: -0.45, size: 2.8, name: 'Rastaban', color: '#ffe082' },// Head 2
      { id: 2, x: -0.2, y: -0.2, size: 2.4, name: 'Grumium', color: '#c77dff' }, // Head 3
      { id: 3, x: -0.45, y: -0.08, size: 2.2, name: 'Kuma', color: '#a0c8ff' },  // Head 4
      { id: 4, x: 0.0, y: -0.05, size: 2.5, name: 'Altais', color: '#80f0ff' },  // Body curve 1
      { id: 5, x: 0.25, y: 0.15, size: 2.3, name: 'Aldhibah', color: '#ffffff' },// Body curve 2
      { id: 6, x: 0.1, y: 0.45, size: 2.6, name: 'Edasich', color: '#80f0ff' },  // Tail curve
      { id: 7, x: -0.2, y: 0.65, size: 2.5, name: 'Thuban', color: '#70e0ff' }   // Tail tip
    ],
    edges: [
      [0, 1], [1, 2], [2, 3], [3, 0], // Dragon Head polygon
      [2, 4], [4, 5], [5, 6], [6, 7]  // Winding body tail
    ]
  },
  {
    id: 'felis',
    name: 'Felis',
    title: 'Felis — The Cat',
    color: '#ffe066',
    glowColor: 'rgba(255, 224, 102, 0.7)',
    anchor: { x: 0.22, y: 0.72 },
    scale: 135,
    labelOffset: { x: -30, y: 65 },
    points: [
      { id: 0, x: -0.45, y: -0.45, size: 2.4, name: 'Left Ear', color: '#ffe066' },
      { id: 1, x: -0.2, y: -0.55, size: 2.2, name: 'Crown', color: '#ffffff' },
      { id: 2, x: 0.05, y: -0.45, size: 2.4, name: 'Right Ear', color: '#ffe066' },
      { id: 3, x: -0.2, y: -0.25, size: 3.2, name: 'Felis Alpha', color: '#ffb703' }, // Cat Heart
      { id: 4, x: -0.5, y: 0.1, size: 2.3, name: 'Front Paw', color: '#a0c8ff' },
      { id: 5, x: 0.15, y: 0.1, size: 2.5, name: 'Hind Quarter', color: '#ffe082' },
      { id: 6, x: 0.45, y: -0.05, size: 2.2, name: 'Tail Curve', color: '#80f0ff' },
      { id: 7, x: 0.6, y: -0.3, size: 2.6, name: 'Tail Tip', color: '#c77dff' }
    ],
    edges: [
      [0, 1], [1, 2], [2, 3], [3, 0], // Head shape
      [3, 4], [3, 5], // Body to limbs
      [5, 6], [6, 7]  // Arching tail
    ]
  },
  {
    id: 'canis',
    name: 'Canis',
    title: 'Canis — The Dog',
    color: '#70e0ff',
    glowColor: 'rgba(112, 224, 255, 0.7)',
    anchor: { x: 0.76, y: 0.75 },
    scale: 140,
    labelOffset: { x: -20, y: 65 },
    points: [
      { id: 0, x: -0.4, y: -0.35, size: 4.2, name: 'Sirius', color: '#ffffff' }, // Brightest star Sirius!
      { id: 1, x: -0.65, y: -0.45, size: 2.4, name: 'Mirzam', color: '#80f0ff' }, // Nose
      { id: 2, x: 0.0, y: -0.1, size: 2.8, name: 'Wezen', color: '#ffe082' },    // Back
      { id: 3, x: 0.35, y: 0.3, size: 3.0, name: 'Adhara', color: '#70e0ff' },   // Rear leg
      { id: 4, x: 0.0, y: 0.4, size: 2.3, name: 'Furud', color: '#a0c8ff' },    // Front leg
      { id: 5, x: 0.45, y: -0.15, size: 2.2, name: 'Aludra', color: '#c77dff' }  // Tail
    ],
    edges: [
      [1, 0], [0, 2], [2, 3], [2, 4], [2, 5] // Dog skeleton
    ]
  }
];

export default function ConstellationBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Mouse tracking for parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetParallaxX = 0;
    let targetParallaxY = 0;
    let currentParallaxX = 0;
    let currentParallaxY = 0;

    // Background Stars Array
    let stars = [];

    const generateStars = (w, h) => {
      const count = Math.floor(Math.min(w, h) * 0.35) + 180; // 250 - 450 stars
      const newStars = [];
      const colors = ['#ffffff', '#ffffff', '#a0c8ff', '#d0a0ff', '#80f0ff', '#ffe082'];

      for (let i = 0; i < count; i++) {
        newStars.push({
          x: Math.random(),
          y: Math.random(),
          size: Math.random() * 1.8 + 0.5, // 0.5px to 2.3px
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: Math.random() * 0.75 + 0.2,
          twinkleSpeed: Math.random() * 0.02 + 0.006,
          twinklePhase: Math.random() * Math.PI * 2,
          depth: Math.random() * 0.8 + 0.2 // Depth factor for parallax
        });
      }
      return newStars;
    };

    const handleResize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
      stars = generateStars(width, height);
    };

    const handleMouseMove = (e) => {
      // Normalize mouse coordinates from -1 to 1
      targetParallaxX = (e.clientX / width - 0.5) * 2;
      targetParallaxY = (e.clientY / height - 0.5) * 2;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    handleResize();

    let time = 0;

    const render = () => {
      time += 0.016;

      // Smooth lerp for parallax position
      currentParallaxX += (targetParallaxX - currentParallaxX) * 0.04;
      currentParallaxY += (targetParallaxY - currentParallaxY) * 0.04;

      // Add gentle ambient cosmic drift if mouse is stationary
      const ambientX = Math.sin(time * 0.3) * 0.15;
      const ambientY = Math.cos(time * 0.25) * 0.15;
      const totalOffsetX = (currentParallaxX + ambientX) * 18;
      const totalOffsetY = (currentParallaxY + ambientY) * 18;

      ctx.clearRect(0, 0, width, height);

      // ─── 1. Deep Space Gradient & Nebula Atmosphere ──────────────────────────
      const spaceGrad = ctx.createLinearGradient(0, 0, width, height);
      spaceGrad.addColorStop(0, '#04040c');
      spaceGrad.addColorStop(0.4, '#09081a');
      spaceGrad.addColorStop(0.7, '#110924');
      spaceGrad.addColorStop(1, '#05040e');
      ctx.fillStyle = spaceGrad;
      ctx.fillRect(0, 0, width, height);

      // Render Soft Nebulas (Radial Color Blurs)
      const nebulas = [
        { x: width * 0.2 + totalOffsetX * 0.2, y: height * 0.3 + totalOffsetY * 0.2, r: 280, color: 'rgba(128, 240, 255, 0.04)' },
        { x: width * 0.8 + totalOffsetX * 0.2, y: height * 0.25 + totalOffsetY * 0.2, r: 320, color: 'rgba(199, 125, 255, 0.05)' },
        { x: width * 0.5 + totalOffsetX * 0.15, y: height * 0.75 + totalOffsetY * 0.15, r: 360, color: 'rgba(255, 140, 66, 0.035)' },
        { x: width * 0.15 + totalOffsetX * 0.1, y: height * 0.8 + totalOffsetY * 0.1, r: 260, color: 'rgba(64, 120, 255, 0.04)' }
      ];

      nebulas.forEach((neb) => {
        const nGrad = ctx.createRadialGradient(neb.x, neb.y, 0, neb.x, neb.y, neb.r);
        nGrad.addColorStop(0, neb.color);
        nGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = nGrad;
        ctx.beginPath();
        ctx.arc(neb.x, neb.y, neb.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // ─── 2. Background Scattered Stars ───────────────────────────────────────
      stars.forEach((s) => {
        const sx = (s.x * width + totalOffsetX * s.depth + width) % width;
        const sy = (s.y * height + totalOffsetY * s.depth + height) % height;

        // Twinkle calculation
        const currentAlpha = s.alpha * (0.6 + 0.4 * Math.sin(time * (s.twinkleSpeed * 60) + s.twinklePhase));

        ctx.fillStyle = s.color;
        ctx.globalAlpha = Math.max(0.1, Math.min(1, currentAlpha));
        ctx.beginPath();
        ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // ─── 3. Constellations Layer ─────────────────────────────────────────────
      CONSTELLATIONS_DATA.forEach((c) => {
        const anchorX = c.anchor.x * width + totalOffsetX * 0.5;
        const anchorY = c.anchor.y * height + totalOffsetY * 0.5;
        const responsiveScale = c.scale * Math.min(width / 1400, 1.2);

        // Project relative star positions to screen coordinates
        const projectedPoints = c.points.map((pt) => ({
          ...pt,
          px: anchorX + pt.x * responsiveScale,
          py: anchorY + pt.y * responsiveScale
        }));

        // 3a. Draw Connecting Lines
        ctx.lineWidth = 1;
        ctx.strokeStyle = c.color;
        ctx.globalAlpha = 0.35;
        ctx.shadowBlur = 6;
        ctx.shadowColor = c.color;

        c.edges.forEach(([i, j]) => {
          const p1 = projectedPoints[i];
          const p2 = projectedPoints[j];
          if (p1 && p2) {
            ctx.beginPath();
            ctx.moveTo(p1.px, p1.py);
            ctx.lineTo(p2.px, p2.py);
            ctx.stroke();
          }
        });

        // 3b. Draw Star Vertices with Glowing Halos
        projectedPoints.forEach((pt) => {
          const pulse = 1 + 0.25 * Math.sin(time * 2 + pt.id * 1.5);
          
          // Outer Glow
          ctx.globalAlpha = 0.4;
          ctx.fillStyle = c.glowColor;
          ctx.beginPath();
          ctx.arc(pt.px, pt.py, pt.size * 2.8 * pulse, 0, Math.PI * 2);
          ctx.fill();

          // Core Star Dot
          ctx.globalAlpha = 0.95;
          ctx.fillStyle = pt.color || '#ffffff';
          ctx.shadowBlur = 10;
          ctx.shadowColor = pt.color || c.color;
          ctx.beginPath();
          ctx.arc(pt.px, pt.py, pt.size, 0, Math.PI * 2);
          ctx.fill();
        });

        // 3c. Floating Constellation Label
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.85;
        const labelX = anchorX + c.labelOffset.x;
        const labelY = anchorY + c.labelOffset.y;

        // Label Backdrop Pill
        ctx.fillStyle = 'rgba(10, 12, 24, 0.55)';
        ctx.strokeStyle = `${c.color}44`;
        ctx.lineWidth = 1;

        const text = c.title;
        ctx.font = '600 11px Outfit, Inter, sans-serif';
        const textWidth = ctx.measureText(text).width;
        const padX = 8;
        const padY = 4;
        const pillWidth = textWidth + padX * 2;
        const pillHeight = 20;

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(labelX - padX, labelY - 14, pillWidth, pillHeight, 4);
        } else {
          ctx.rect(labelX - padX, labelY - 14, pillWidth, pillHeight);
        }
        ctx.fill();
        ctx.stroke();

        // Label Text
        ctx.fillStyle = c.color;
        ctx.fillText(text, labelX, labelY);
      });

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        pointerEvents: 'none',
        overflow: 'hidden'
      }}
    />
  );
}
