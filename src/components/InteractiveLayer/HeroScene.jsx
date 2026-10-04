import { useRef, useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Environment, ContactShadows, PerspectiveCamera, OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';

// ─────────────────────────────────────────────
//  STAR SHADER MATERIAL (GPU twinkling + mouse)
// ─────────────────────────────────────────────
const starVertexShader = `
  uniform float uTime;
  uniform vec2 uMouse;
  attribute float aSize;
  attribute float aTwinkleSpeed;
  attribute float aTwinkleOffset;
  varying float vAlpha;
  varying vec3 vColor;
  attribute vec3 aColor;

  void main() {
    vColor = aColor;

    // Twinkling
    float twinkle = 0.5 + 0.5 * sin(uTime * aTwinkleSpeed + aTwinkleOffset);
    vAlpha = 0.3 + 0.7 * twinkle;

    // Mouse push (in NDC space)
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vec4 clipPos = projectionMatrix * mvPos;
    vec2 ndc = clipPos.xy / clipPos.w;
    float dist = length(ndc - uMouse);
    float pushStr = smoothstep(0.4, 0.0, dist) * 0.12;
    ndc += normalize(ndc - uMouse) * pushStr;
    // Reconstruct a pushed clip position
    clipPos.xy = ndc * clipPos.w;

    gl_PointSize = aSize * (300.0 / -mvPos.z);
    gl_Position = clipPos;
  }
`;

const starFragmentShader = `
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float glow = 1.0 - smoothstep(0.0, 0.5, d);
    glow = pow(glow, 2.0);
    gl_FragColor = vec4(vColor, glow * vAlpha);
  }
`;

// ─────────────────────────────────────────────
//  NEBULA SHADER
// ─────────────────────────────────────────────
const nebulaVertexShader = `
  uniform float uTime;
  attribute float aSize;
  attribute float aOffset;
  varying float vAlpha;
  attribute vec3 aColor;
  varying vec3 vColor;

  void main() {
    vColor = aColor;
    float drift = sin(uTime * 0.1 + aOffset) * 0.5;
    vec3 pos = position + vec3(cos(aOffset) * drift, drift, sin(aOffset) * drift * 0.5);
    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    vAlpha = 0.05 + 0.15 * (0.5 + 0.5 * sin(uTime * 0.3 + aOffset));
    gl_PointSize = aSize * (300.0 / -mvPos.z);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const nebulaFragmentShader = `
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float soft = 1.0 - smoothstep(0.0, 0.5, d);
    soft = pow(soft, 1.5);
    gl_FragColor = vec4(vColor, soft * vAlpha);
  }
`;

// ─────────────────────────────────────────────
//  CONSTELLATION DATA
// ─────────────────────────────────────────────
const ALL_CONSTELLATIONS = [
  // ── REAL WORLD ──
  {
    name: 'Orion',
    type: 'real',
    label: 'Orion • The Hunter',
    center: [8, 2, -12],
    color: '#a8d8ff',
    lore: 'The great hunter of Greek mythology, placed among the stars by Zeus. Orion is one of the most recognizable constellations in the night sky.',
    coords: 'RA 05h 34m • Dec −05° 23′',
    wildlife: 'The Orion Nebula within its belt is a stellar nursery where thousands of young stars are born — mirroring the teeming biodiversity of untouched ecosystems.',
    conservation: null,
    points: [
      [0, 1.4, 0],    // 0: Betelgeuse (shoulder L)
      [1.2, 1.4, 0],  // 1: Bellatrix (shoulder R)
      [0, -1.4, 0],   // 2: Rigel (foot L)
      [1.2, -1.4, 0], // 3: Saiph (foot R)
      [0.2, 0.4, 0],  // 4: Belt star 1 (Alnitak)
      [0.6, 0.3, 0],  // 5: Belt star 2 (Alnilam)
      [1.0, 0.4, 0],  // 6: Belt star 3 (Mintaka)
      [0.6, 1.1, 0],  // 7: Neck
      [0.6, -0.5, 0], // 8: Below belt (sword)
    ],
    edges: [
      [0, 1], [0, 7], [1, 7],
      [4, 5], [5, 6],
      [0, 4], [1, 6],
      [2, 4], [3, 6],
      [4, 8], [6, 8],
    ]
  },
  {
    name: 'Ursa Major',
    type: 'real',
    label: 'Ursa Major • Great Bear',
    center: [-11, 5, -10],
    color: '#c4b5fd',
    lore: 'The Great Bear, one of the oldest named constellations. Its famous asterism, the Big Dipper, has guided navigators for millennia.',
    coords: 'RA 10h 40m • Dec +55° 22′',
    wildlife: 'Bears are keystone species — their foraging patterns shape entire ecosystems. Like Ursa Major guiding sailors, brown bears guide ecological balance.',
    conservation: null,
    points: [
      [0, 0, 0],   // 0: Dubhe
      [0.8, 0, 0], // 1: Merak
      [0.7, 0.7, 0], // 2: Phecda
      [-0.1, 0.7, 0], // 3: Megrez
      [-0.9, 1.1, 0], // 4: Alioth
      [-1.8, 1.0, 0], // 5: Mizar
      [-2.6, 1.4, 0], // 6: Alkaid
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]]
  },
  {
    name: 'Cassiopeia',
    type: 'real',
    label: 'Cassiopeia • The Queen',
    center: [2, 7, -14],
    color: '#fbbf24',
    lore: 'The vain queen of Ethiopian mythology, Cassiopeia boasts of her beauty. Her distinctive W-shape is a beacon of the northern night sky.',
    coords: 'RA 01h 25m • Dec +62° 01′',
    wildlife: 'Like the queen who commanded her kingdom, apex predators command their ecosystems — regulating populations and maintaining the delicate balance of nature.',
    conservation: null,
    points: [
      [-1.6, -0.4, 0], // 0: Caph
      [-0.8, 0.4, 0],  // 1: Schedar
      [0, -0.2, 0],    // 2: Cih (gamma)
      [0.8, 0.5, 0],   // 3: Ruchbah
      [1.6, -0.2, 0],  // 4: Segin
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4]]
  },
  {
    name: 'Lyra',
    type: 'real',
    label: 'Lyra • The Lyre',
    center: [-5, 5, -13],
    color: '#6ee7b7',
    lore: 'The lyre of Orpheus, whose music was so beautiful it moved rocks and rivers. Vega, its brightest star, will be Earth\'s north star in ~13,000 years.',
    coords: 'RA 18h 51m • Dec +32° 47′',
    wildlife: 'Birdsong — nature\'s music — is to ecosystems what Orpheus\'s lyre was to the world: a force that can calm, warn, attract, and sustain life.',
    conservation: null,
    points: [
      [0, 0.8, 0],    // 0: Vega (top)
      [-0.4, 0, 0],   // 1: Sheliak (L)
      [0.4, 0, 0],    // 2: Sulafat (R)
      [-0.6, -0.7, 0],// 3: Bottom L
      [0.6, -0.7, 0], // 4: Bottom R
    ],
    edges: [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 4]]
  },
  {
    name: 'Cygnus',
    type: 'real',
    label: 'Cygnus • The Swan',
    center: [4, 4, -14],
    color: '#93c5fd',
    lore: 'The celestial swan, sometimes identified with Zeus in disguise. Its Northern Cross asterism soars along the Milky Way.',
    coords: 'RA 20h 41m • Dec +45° 17′',
    wildlife: 'Swans are symbols of grace and partnership — monogamous birds that mate for life, mirroring the deep bonds found in wolf packs and elephant herds.',
    conservation: null,
    points: [
      [0, 1.0, 0],    // 0: Deneb (tail)
      [0, 0, 0],      // 1: Sadr (body center)
      [-1.0, -0.3, 0],// 2: L wing
      [1.0, -0.3, 0], // 3: R wing
      [0, -1.0, 0],   // 4: Albireo (head/beak)
    ],
    edges: [[0, 1], [1, 2], [1, 3], [1, 4]]
  },
  {
    name: 'Draco',
    type: 'real',
    label: 'Draco • The Dragon',
    center: [-9, 3, -11],
    color: '#f9a8d4',
    lore: 'The ancient dragon Ladon, guardian of the golden apples in the garden of the Hesperides. Draco winds around the north celestial pole.',
    coords: 'RA 17h 00m • Dec +65° 00′',
    wildlife: 'Komodo dragons — the world\'s largest lizards — are a living testament to the dragon myth, apex predators whose populations are now threatened by climate change.',
    conservation: null,
    points: [
      [-1.5, 0.0, 0], // 0: Eltanin (head)
      [-1.2, 0.4, 0], // 1: Rastaban (head)
      [-0.6, 0.3, 0], // 2: Grumium
      [0, 0.5, 0],    // 3: neck
      [0.5, 0.2, 0],  // 4: body
      [1.0, 0.6, 0],  // 5: coil
      [1.4, 0.3, 0],  // 6: tail mid
      [1.6, -0.3, 0], // 7: tail
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]]
  },
  // ── FAUNA (custom) ──
  {
    name: 'Felis',
    type: 'fauna',
    label: 'Felis • The Cat',
    center: [7.5, 3.2, -8],
    color: '#FCDC4D',
    lore: 'The celestial guardian of the night. Felis watches over all who wander in darkness, its eyes glowing like twin moons through the cosmic veil.',
    coords: 'RA 09h 28m • Dec −15° 40′',
    wildlife: 'Domestic cats retain the hunting instincts of their wild ancestors. As urban mousers, they have co-evolved with human civilizations for over 10,000 years.',
    conservation: 'Least Concern',
    points: [
      [-0.4, 1.2, 0.1],  [0.0, 0.8, 0.0],  [0.4, 1.2, -0.1],
      [-0.6, 0.5, 0.2],  [0.6, 0.5, -0.2], [0.0, 0.2, 0.0],
      [-0.4, -0.4, 0.3], [0.4, -0.6, -0.3],[0.9, -1.0, -0.1],
      [1.1, -0.3, 0.2],  [1.5, -0.1, 0.4], [-0.6, -1.3, 0.5], [0.4, -1.3, -0.5]
    ],
    edges: [
      [0,1],[1,2],[0,3],[2,4],[3,4],[3,5],[4,5],
      [5,6],[6,7],[7,8],[8,9],[9,10],[6,11],[8,12]
    ]
  },
  {
    name: 'Canis',
    type: 'fauna',
    label: 'Canis • The Dog',
    center: [-8, 2.2, -7],
    color: '#fb923c',
    lore: 'Humanity\'s oldest companion, written in the stars as a reminder that the bond between species can transcend worlds.',
    coords: 'RA 07h 06m • Dec −23° 55′',
    wildlife: 'Gray wolves are ecological engineers — their reintroduction to Yellowstone triggered a trophic cascade that changed river courses and restored entire ecosystems.',
    conservation: 'Vulnerable',
    points: [
      [-0.6, 0.8, -0.1], [-0.2, 0.8, 0.1], [0.1, 1.1, 0.3],
      [0.0, 0.5, 0.0],   [-0.3, 0.4, -0.2],[0.4, 0.1, -0.1],
      [1.1, 0.1, 0.2],   [1.5, 0.7, 0.4],  [0.2, -0.9, -0.3],
      [0.5, -0.9, 0.3],  [1.0, -0.9, -0.2],[1.3, -0.9, 0.2]
    ],
    edges: [
      [0,1],[1,2],[2,3],[1,3],[0,4],[4,3],
      [3,5],[5,6],[6,7],[5,8],[5,9],[6,10],[6,11]
    ]
  },
  {
    name: 'Avis',
    type: 'fauna',
    label: 'Avis • The Bird',
    center: [7.5, -2.5, 6],
    color: '#34d399',
    lore: 'The cosmic songbird whose melody sustains the rhythm of the universe. Avis sings between galaxies, carrying the songs of extinct species across eternity.',
    coords: 'RA 05h 52m • Dec −34° 18′',
    wildlife: 'Birds are the primary dispersers of plant seeds across continents. Without them, the world\'s forests would collapse within a century.',
    conservation: 'Near Threatened',
    points: [
      [-1.1, 0.0, -0.3], [-0.5, 0.2, -0.1], [0.0, 0.3, 0.0],
      [0.5, 0.2, 0.1],   [1.1, 0.0, 0.3],   [0.0, 0.9, 0.2],
      [0.0, -0.6, -0.2], [-0.3, -1.2, -0.4],[0.3, -1.2, 0.1]
    ],
    edges: [[0,1],[1,2],[2,3],[3,4],[2,5],[2,6],[6,7],[6,8],[7,8]]
  },
  {
    name: 'Lupus',
    type: 'fauna',
    label: 'Lupus • The Wolf',
    center: [-7, -2.2, 7],
    color: '#a78bfa',
    lore: 'The lone wolf of the cosmos, howling at the edge of the universe. A symbol of fierce independence and the untameable wild spirit.',
    coords: 'RA 15h 13m • Dec −41° 02′',
    wildlife: 'Wolves are one of the most studied predators for ecosystem regulation. Their populations are critical indicators of wilderness health.',
    conservation: 'Least Concern',
    points: [
      [-0.7, 1.0, 0.2], [-0.1, 0.7, 0.0], [0.2, 1.1, -0.2],
      [0.0, 0.3, 0.1],  [0.6, 0.0, -0.1], [1.3, -0.1, 0.0],
      [1.8, -0.5, -0.2],[2.1, -1.2, 0.3], [0.4, -1.1, -0.4],[1.1, -1.1, 0.4]
    ],
    edges: [[0,1],[1,2],[2,3],[0,3],[3,4],[4,5],[5,6],[6,7],[4,8],[6,9]]
  },
  {
    name: 'Cervus',
    type: 'fauna',
    label: 'Cervus • The Stag',
    center: [10, -3, -5],
    color: '#f472b6',
    lore: 'The cosmic stag whose antlers form the branching rivers of the galaxy. A symbol of renewal — its antlers shed and regrow, like the seasons of the cosmos.',
    coords: 'RA 21h 17m • Dec +10° 08′',
    wildlife: 'Deer populations regulate forest undergrowth. Their grazing patterns, combined with predator pressure, create the mosaic habitats essential for biodiversity.',
    conservation: 'Least Concern',
    points: [
      [0, 1.8, 0],  [-0.3, 1.4, 0], [0.3, 1.4, 0],
      [-0.8, 2.1, 0],[0.8, 2.1, 0], [-0.6, 1.0, 0], [0.6, 1.0, 0],
      [0, 0.6, 0],  [-0.4, -0.2, 0],[0.4, -0.2, 0],
      [-0.5, -1.0, 0],[0.5, -1.0, 0],[-0.5, -1.8, 0],[0.5, -1.8, 0]
    ],
    edges: [
      [0,1],[0,2],[1,3],[2,4],[1,5],[2,6],
      [5,7],[6,7],[7,8],[7,9],[8,10],[9,11],[10,12],[11,13]
    ]
  },
  {
    name: 'Serpens',
    type: 'fauna',
    label: 'Serpens • The Serpent',
    center: [-10, -3, -6],
    color: '#2dd4bf',
    lore: 'The great cosmic serpent, coiled between stars. Ancient cultures revered serpents as symbols of wisdom, rebirth, and the cyclic nature of existence.',
    coords: 'RA 16h 57m • Dec +10° 09′',
    wildlife: 'Snakes are both predator and prey, occupying a critical middle position in the food web. Their decline signals ecosystem collapse in grasslands worldwide.',
    conservation: 'Vulnerable',
    points: [
      [-1.5, 0.8, 0],  [-1.0, 0.3, 0],  [-0.4, 0.5, 0],
      [0.2, 0.1, 0],   [0.8, 0.4, 0],   [1.4, -0.1, 0],
      [1.8, 0.5, 0],   [2.2, 0.2, 0],
    ],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7]]
  },
];

// ─────────────────────────────────────────────
//  STATIC GEOMETRY GENERATION
// ─────────────────────────────────────────────
function generateStarfield(count = 3500) {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const twinkleSpeeds = new Float32Array(count);
  const twinkleOffsets = new Float32Array(count);
  const colors = new Float32Array(count * 3);

  const starColorPalette = [
    new THREE.Color('#ffffff'),
    new THREE.Color('#ffe8d0'),
    new THREE.Color('#d0e8ff'),
    new THREE.Color('#fff8df'),
    new THREE.Color('#ffd6f5'),
    new THREE.Color('#c8ffee'),
  ];

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 18 + Math.random() * 10;
    positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    sizes[i] = 0.3 + Math.random() * 1.2;
    twinkleSpeeds[i] = 0.5 + Math.random() * 3;
    twinkleOffsets[i] = Math.random() * Math.PI * 2;

    const c = starColorPalette[Math.floor(Math.random() * starColorPalette.length)];
    colors[i * 3 + 0] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  return { positions, sizes, twinkleSpeeds, twinkleOffsets, colors };
}

function generateNebula(count = 600) {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const offsets = new Float32Array(count);
  const colors = new Float32Array(count * 3);

  const nebulaColors = [
    new THREE.Color('#7c3aed'),
    new THREE.Color('#db2777'),
    new THREE.Color('#0891b2'),
    new THREE.Color('#065f46'),
    new THREE.Color('#9d174d'),
  ];

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 14 + Math.random() * 8;
    positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    sizes[i] = 2.0 + Math.random() * 5.0;
    offsets[i] = Math.random() * Math.PI * 2;

    const c = nebulaColors[Math.floor(Math.random() * nebulaColors.length)];
    colors[i * 3 + 0] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  return { positions, sizes, offsets, colors };
}

const STARFIELD_DATA = generateStarfield(3500);
const NEBULA_DATA = generateNebula(600);

// ─────────────────────────────────────────────
//  TWINKLING STARFIELD COMPONENT
// ─────────────────────────────────────────────
function TwinklingStarfield({ mouseNDC }) {
  const matRef = useRef();
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
  }), []);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    matRef.current.uniforms.uMouse.value.set(mouseNDC.current.x, mouseNDC.current.y);
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={STARFIELD_DATA.positions.length / 3} array={STARFIELD_DATA.positions} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" count={STARFIELD_DATA.sizes.length} array={STARFIELD_DATA.sizes} itemSize={1} />
        <bufferAttribute attach="attributes-aTwinkleSpeed" count={STARFIELD_DATA.twinkleSpeeds.length} array={STARFIELD_DATA.twinkleSpeeds} itemSize={1} />
        <bufferAttribute attach="attributes-aTwinkleOffset" count={STARFIELD_DATA.twinkleOffsets.length} array={STARFIELD_DATA.twinkleOffsets} itemSize={1} />
        <bufferAttribute attach="attributes-aColor" count={STARFIELD_DATA.colors.length / 3} array={STARFIELD_DATA.colors} itemSize={3} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={starVertexShader}
        fragmentShader={starFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─────────────────────────────────────────────
//  NEBULA DUST COMPONENT
// ─────────────────────────────────────────────
function NebulaDust() {
  const matRef = useRef();
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
  }), []);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={NEBULA_DATA.positions.length / 3} array={NEBULA_DATA.positions} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" count={NEBULA_DATA.sizes.length} array={NEBULA_DATA.sizes} itemSize={1} />
        <bufferAttribute attach="attributes-aOffset" count={NEBULA_DATA.offsets.length} array={NEBULA_DATA.offsets} itemSize={1} />
        <bufferAttribute attach="attributes-aColor" count={NEBULA_DATA.colors.length / 3} array={NEBULA_DATA.colors} itemSize={3} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={nebulaVertexShader}
        fragmentShader={nebulaFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─────────────────────────────────────────────
//  CONSTELLATION LINE MATERIAL (fading glow)
// ─────────────────────────────────────────────
function ConstellationLines({ constellation, isHovered, isSelected }) {
  const matRef = useRef();
  useFrame((state) => {
    if (!matRef.current) return;
    const t = state.clock.getElapsedTime();
    const base = 0.15 + 0.1 * Math.sin(t * 0.7 + constellation.name.length);
    const hover = isHovered || isSelected ? 0.7 : base;
    matRef.current.opacity = THREE.MathUtils.lerp(matRef.current.opacity, hover, 0.05);
  });

  const lineVertices = useMemo(() => {
    const pts = [];
    constellation.edges.forEach(([i, j]) => {
      const pA = constellation.points[i];
      const pB = constellation.points[j];
      pts.push(
        pA[0] + constellation.center[0], pA[1] + constellation.center[1], pA[2] + constellation.center[2],
        pB[0] + constellation.center[0], pB[1] + constellation.center[1], pB[2] + constellation.center[2],
      );
    });
    return new Float32Array(pts);
  }, [constellation]);

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={lineVertices.length / 3} array={lineVertices} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial ref={matRef} color={constellation.color} transparent opacity={0.15} />
    </lineSegments>
  );
}

// ─────────────────────────────────────────────
//  SINGLE CONSTELLATION
// ─────────────────────────────────────────────
function Constellation({ constellation, showLabels, isSelected, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const coreRef = useRef();

  useFrame((state) => {
    if (!coreRef.current) return;
    const t = state.clock.getElapsedTime();
    const target = hovered || isSelected ? 1.4 : 0.9 + 0.3 * Math.sin(t * 2 + constellation.center[0]);
    coreRef.current.scale.setScalar(THREE.MathUtils.lerp(coreRef.current.scale.x, target, 0.08));
  });

  const color = new THREE.Color(constellation.color);

  return (
    <group>
      <ConstellationLines constellation={constellation} isHovered={hovered} isSelected={isSelected} />

      {/* Star nodes */}
      {constellation.points.map((pt, idx) => (
        <mesh key={idx} position={[pt[0] + constellation.center[0], pt[1] + constellation.center[1], pt[2] + constellation.center[2]]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color={constellation.color} />
        </mesh>
      ))}

      {/* Interactive core */}
      <mesh
        ref={coreRef}
        position={constellation.center}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
        onClick={(e) => { e.stopPropagation(); onSelect(constellation); }}
      >
        <sphereGeometry args={[0.3, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={hovered || isSelected ? 0.25 : 0.0} />
      </mesh>

      {/* Glow ring on hover */}
      {(hovered || isSelected) && (
        <mesh position={constellation.center}>
          <ringGeometry args={[0.32, 0.42, 32]} />
          <meshBasicMaterial color={constellation.color} transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      )}

      {showLabels && (
        <Html position={[constellation.center[0], constellation.center[1] + 0.65, constellation.center[2]]} center distanceFactor={12} style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          <div className={`constellation-label ${isSelected ? 'selected' : ''}`} style={{ borderColor: constellation.color + '66', color: constellation.color }}>
            {constellation.label}
          </div>
        </Html>
      )}
    </group>
  );
}

// ─────────────────────────────────────────────
//  CAMERA CONTROLLER
// ─────────────────────────────────────────────
function CameraController({ target, resetSignal }) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 0.5, 6));
  const lookAtTarget = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    if (target) {
      // Fly toward constellation
      const c = target.center;
      const dir = new THREE.Vector3(c[0], c[1], c[2]).normalize();
      targetPos.current.set(dir.x * 7, dir.y * 5 + 1, dir.z * 7);
      lookAtTarget.current.set(c[0], c[1], c[2]);
    } else {
      targetPos.current.set(0, 0.5, 6);
      lookAtTarget.current.set(0, 0, 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, resetSignal]);

  useFrame(() => {
    camera.position.lerp(targetPos.current, 0.03);
    const lookAt = new THREE.Vector3();
    lookAt.lerpVectors(new THREE.Vector3(0, 0, 0), lookAtTarget.current, 0.05);
    camera.lookAt(lookAtTarget.current);
  });

  return null;
}

// ─────────────────────────────────────────────
//  3D CAT (with breed & accessories)
// ─────────────────────────────────────────────
function Cat({ catStyle = 'ginger', accessory = 'none', ...props }) {
  const group = useRef();
  const head = useRef();
  const tail = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (!group.current || !head.current || !tail.current) return;
    const t = state.clock.getElapsedTime();
    group.current.rotation.y = Math.sin(t * 0.5) * 0.2;
    group.current.position.y = Math.sin(t * 2) * 0.1;
    tail.current.rotation.z = Math.sin(t * 4) * 0.5;
    head.current.rotation.z = Math.sin(t * 1) * 0.1;
    head.current.rotation.x = Math.sin(t * 1.5) * 0.05;
  });

  let bodyColor = '#CB793A', detailColor = '#321325', eyeColor = '#321325';
  let earInnerColor = '#321325', noseColor = '#F06292', tailColor = '#CB793A';
  const eyeSparkleColor = '#ffffff';
  const isCyber = catStyle === 'cyber';

  if (catStyle === 'midnight') {
    bodyColor = '#1B1C1E'; detailColor = '#111213'; eyeColor = '#C6FF00'; earInnerColor = '#421D31'; tailColor = '#1B1C1E'; noseColor = '#2C2D30';
  } else if (catStyle === 'siamese') {
    bodyColor = '#EADEC9'; detailColor = '#4A3525'; eyeColor = '#00E5FF'; earInnerColor = '#4A3525'; tailColor = '#4A3525'; noseColor = '#4A3525';
  } else if (catStyle === 'calico') {
    bodyColor = '#FFFFFF'; detailColor = '#321325'; eyeColor = '#321325'; earInnerColor = '#FF8A65'; tailColor = '#CB793A'; noseColor = '#F06292';
  } else if (catStyle === 'cyber') {
    bodyColor = '#00f3ff'; detailColor = '#ff007f'; eyeColor = '#ff007f'; earInnerColor = '#00f3ff'; tailColor = '#00f3ff'; noseColor = '#ff007f';
  }

  const baseColor = isCyber ? (hovered ? '#ff007f' : '#00f3ff') : (hovered ? '#FCDC4D' : bodyColor);

  const getMaterial = (colorValue, isEmissive = false) => {
    if (isCyber) return <meshStandardMaterial color={colorValue} emissive={colorValue} emissiveIntensity={1.5} transparent opacity={0.65} roughness={0.1} metalness={0.9} />;
    return <meshStandardMaterial color={colorValue} roughness={0.3} {...(isEmissive ? { emissive: colorValue, emissiveIntensity: 0.8 } : {})} />;
  };

  return (
    <group ref={group} {...props} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      <Float speed={3} rotationIntensity={0.5} floatIntensity={1}>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.6, 32, 32]} />
          {getMaterial(baseColor)}
        </mesh>
        {isCyber && <mesh position={[0, 0, 0]} scale={1.01}><sphereGeometry args={[0.6, 16, 16]} /><meshBasicMaterial color="#ff007f" wireframe transparent opacity={0.3} /></mesh>}
        {catStyle === 'calico' && (
          <>
            <mesh position={[0.3, 0.2, 0.1]}><sphereGeometry args={[0.3, 16, 16]} /><meshStandardMaterial color="#CB793A" roughness={0.4} /></mesh>
            <mesh position={[-0.3, 0.1, -0.2]}><sphereGeometry args={[0.25, 16, 16]} /><meshStandardMaterial color="#1B1C1E" roughness={0.4} /></mesh>
            <mesh position={[0.15, -0.2, -0.3]}><sphereGeometry args={[0.22, 16, 16]} /><meshStandardMaterial color="#CB793A" roughness={0.4} /></mesh>
          </>
        )}
        <group ref={head} position={[0, 0.6, 0.4]}>
          <mesh><sphereGeometry args={[0.45, 32, 32]} />{getMaterial(baseColor)}</mesh>
          {isCyber && <mesh scale={1.01}><sphereGeometry args={[0.45, 12, 12]} /><meshBasicMaterial color="#ff007f" wireframe transparent opacity={0.3} /></mesh>}
          {catStyle === 'siamese' && <mesh position={[0, -0.05, 0.32]} scale={[1.1, 0.9, 0.8]}><sphereGeometry args={[0.18, 16, 16]} /><meshStandardMaterial color="#4A3525" roughness={0.4} /></mesh>}
          <group position={[-0.25, 0.35, 0]} rotation={[0, 0, 0.4]}>
            <mesh><coneGeometry args={[0.18, 0.35, 4]} />{getMaterial(baseColor)}</mesh>
            <mesh position={[0, -0.02, 0.04]} scale={0.75}><coneGeometry args={[0.15, 0.3, 4]} />{getMaterial(earInnerColor)}</mesh>
          </group>
          <group position={[0.25, 0.35, 0]} rotation={[0, 0, -0.4]}>
            <mesh><coneGeometry args={[0.18, 0.35, 4]} />{getMaterial(baseColor)}</mesh>
            <mesh position={[0, -0.02, 0.04]} scale={0.75}><coneGeometry args={[0.15, 0.3, 4]} />{getMaterial(earInnerColor)}</mesh>
          </group>
          <mesh position={[-0.18, 0.1, 0.38]}><sphereGeometry args={[0.08, 16, 16]} />{getMaterial(eyeColor, true)}</mesh>
          <mesh position={[0.18, 0.1, 0.38]}><sphereGeometry args={[0.08, 16, 16]} />{getMaterial(eyeColor, true)}</mesh>
          {!isCyber && <><mesh position={[-0.2, 0.14, 0.45]}><sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color={eyeSparkleColor} /></mesh><mesh position={[0.16, 0.14, 0.45]}><sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color={eyeSparkleColor} /></mesh></>}
          <mesh position={[0, 0, 0.42]} rotation={[0, 0, Math.PI]}><coneGeometry args={[0.05, 0.08, 3]} /><meshStandardMaterial color={noseColor} /></mesh>
          {!isCyber && [1, -1].map((side) => [0.05, 0, -0.05].map((y, i) => (
            <mesh key={`${side}-${i}`} position={[0.3 * side, y - 0.05, 0.4]} rotation={[0, 0, (0.1 * i - 0.1) * side]}>
              <boxGeometry args={[0.3, 0.01, 0.01]} />
              <meshStandardMaterial color={detailColor} transparent opacity={0.5} />
            </mesh>
          )))}
          {accessory === 'crown' && (
            <group position={[0, 0.46, 0.05]} rotation={[-0.1, 0, 0]}>
              <mesh><cylinderGeometry args={[0.16, 0.16, 0.06, 16]} /><meshStandardMaterial color="#FCDC4D" metalness={0.9} roughness={0.1} /></mesh>
              {[0,1,2,3,4].map((i) => { const angle = (i / 5) * Math.PI * 2; return <mesh key={i} position={[Math.sin(angle)*0.15, 0.06, Math.cos(angle)*0.15]} rotation={[0,-angle,0]}><coneGeometry args={[0.03, 0.08, 4]} /><meshStandardMaterial color="#FCDC4D" metalness={0.9} roughness={0.1} /></mesh>; })}
            </group>
          )}
          {accessory === 'goggles' && (
            <group position={[0, 0.1, 0.36]}>
              <mesh position={[-0.18, 0, 0.02]}><torusGeometry args={[0.11, 0.018, 8, 24]} /><meshStandardMaterial color="#D4AF37" metalness={0.9} roughness={0.1} /></mesh>
              <mesh position={[0.18, 0, 0.02]}><torusGeometry args={[0.11, 0.018, 8, 24]} /><meshStandardMaterial color="#D4AF37" metalness={0.9} roughness={0.1} /></mesh>
              <mesh position={[0, 0, 0.02]}><boxGeometry args={[0.15, 0.02, 0.02]} /><meshStandardMaterial color="#D4AF37" metalness={0.9} roughness={0.1} /></mesh>
              <mesh position={[0, 0, -0.15]}><boxGeometry args={[0.48, 0.03, 0.18]} /><meshStandardMaterial color="#3E2723" roughness={0.6} /></mesh>
            </group>
          )}
          {accessory === 'wizard' && (
            <group position={[0, 0.48, 0.05]} rotation={[-0.15, 0, -0.1]}>
              <mesh><cylinderGeometry args={[0.3, 0.3, 0.02, 16]} /><meshStandardMaterial color="#5E35B1" roughness={0.5} /></mesh>
              <mesh position={[0, 0.22, 0]}><coneGeometry args={[0.16, 0.44, 16]} /><meshStandardMaterial color="#5E35B1" roughness={0.5} /></mesh>
              <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.17, 0.17, 0.03, 16]} /><meshStandardMaterial color="#FCDC4D" metalness={0.5} roughness={0.2} /></mesh>
            </group>
          )}
        </group>
        <mesh position={[-0.25, -0.45, 0.4]}><sphereGeometry args={[0.12, 16, 16]} />{getMaterial(catStyle === 'siamese' || catStyle === 'midnight' ? detailColor : bodyColor)}</mesh>
        <mesh position={[0.25, -0.45, 0.4]}><sphereGeometry args={[0.12, 16, 16]} />{getMaterial(catStyle === 'siamese' || catStyle === 'midnight' ? detailColor : bodyColor)}</mesh>
        {accessory === 'bowtie' && (
          <group position={[0, -0.15, 0.58]}>
            <mesh position={[-0.08, 0, 0]} rotation={[0, 0, -Math.PI/6]}><coneGeometry args={[0.07, 0.16, 4]} /><meshStandardMaterial color="#E74C3C" roughness={0.3} /></mesh>
            <mesh position={[0.08, 0, 0]} rotation={[0, 0, Math.PI/6]}><coneGeometry args={[0.07, 0.16, 4]} /><meshStandardMaterial color="#E74C3C" roughness={0.3} /></mesh>
            <mesh position={[0, 0, 0.01]}><sphereGeometry args={[0.045, 16, 16]} /><meshStandardMaterial color="#E74C3C" roughness={0.3} /></mesh>
          </group>
        )}
        <group ref={tail} position={[0, -0.3, -0.5]} rotation={[-0.2, 0, 0]}>
          <mesh position={[0, 0.3, 0]}><capsuleGeometry args={[0.08, 0.6, 4, 8]} />{getMaterial(tailColor)}</mesh>
          {isCyber && <mesh position={[0, 0.3, 0]} scale={1.02}><capsuleGeometry args={[0.08, 0.6, 4, 8]} /><meshBasicMaterial color="#ff007f" wireframe transparent opacity={0.3} /></mesh>}
        </group>
      </Float>
    </group>
  );
}

// ─────────────────────────────────────────────
//  MOUSE TRACKER (NDC coords)
// ─────────────────────────────────────────────
function MouseTracker({ mouseNDC }) {
  const { gl } = useThree();
  useFrame(() => {
    // mouseNDC is updated externally via window mousemove
  });

  return null;
}

// ─────────────────────────────────────────────
//  SCENE CONTENTS
// ─────────────────────────────────────────────
function SceneContents({ catStyle, accessory, showLabels, selectedConstellation, onSelectConstellation, mouseNDC }) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0.5, 6]} fov={40} />
      <ambientLight intensity={0.8} />
      <pointLight position={[10, 10, 10]} intensity={2} color="#FCDC4D" />
      <spotLight position={[-10, 10, 10]} angle={0.2} penumbra={1} intensity={1.5} color="#FFF" />
      <directionalLight position={[0, 5, 5]} intensity={1} />

      <NebulaDust />
      <TwinklingStarfield mouseNDC={mouseNDC} />

      {ALL_CONSTELLATIONS.map((c) => (
        <Constellation
          key={c.name}
          constellation={c}
          showLabels={showLabels}
          isSelected={selectedConstellation?.name === c.name}
          onSelect={onSelectConstellation}
        />
      ))}

      <Suspense fallback={null}>
        <Cat position={[0, 0.05, 0]} scale={1.8} catStyle={catStyle} accessory={accessory} />
        <Environment preset="city" />
      </Suspense>

      <ContactShadows position={[0, -1.2, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />
      <CameraController target={selectedConstellation} resetSignal={selectedConstellation?.name} />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={!selectedConstellation}
        autoRotateSpeed={0.3}
        maxPolarAngle={Math.PI / 1.5}
        minPolarAngle={Math.PI / 3}
      />
    </>
  );
}

// ─────────────────────────────────────────────
//  MAIN EXPORT
// ─────────────────────────────────────────────
export default function HeroScene({ catStyle = 'ginger', accessory = 'none', showLabels = true, selectedConstellation, onSelectConstellation }) {
  const mouseNDC = useRef({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e) => {
    mouseNDC.current.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseNDC.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%' }} onMouseMove={handleMouseMove}>
      <Canvas>
        <SceneContents
          catStyle={catStyle}
          accessory={accessory}
          showLabels={showLabels}
          selectedConstellation={selectedConstellation}
          onSelectConstellation={onSelectConstellation}
          mouseNDC={mouseNDC}
        />
      </Canvas>
    </div>
  );
}
