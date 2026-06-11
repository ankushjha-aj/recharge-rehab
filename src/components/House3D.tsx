import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Real-3D replacement for the flat SVG clinic building and its surroundings.
 *
 * It is built in "SVG pixel" units so it composes 1:1 with the 2D layers.
 * All characters, trees, and perched birds are fully rendered in 3D to ensure
 * depth, proper shadowing, and interactive hover tilt consistency.
 */

const FOV = 35;
const TOP_EXTEND = 64;
const PLANE_H = 320 + TOP_EXTEND;
const CAM_Y = TOP_EXTEND / 2;
const CAM_Z = PLANE_H / 2 / Math.tan((FOV * Math.PI) / 360);

// Tilt pivot: vertical axis through the house centre (svg x=500, depth -120).
const PIVOT: [number, number, number] = [100, -1, -120];
// Child position helper, relative to the pivot group.
const p = (sx: number, sy: number, wz: number): [number, number, number] => [sx - 500, 161 - sy, wz + 120];

type Frames = ReadonlyArray<readonly [number, number]>;

const sampleFrames = (frames: Frames, t: number): number => {
  for (let i = 1; i < frames.length; i++) {
    if (t <= frames[i][0]) {
      const [t0, v0] = frames[i - 1];
      const [t1, v1] = frames[i];
      return t1 === t0 ? v1 : v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
    }
  }
  return frames[frames.length - 1][1];
};


// Same fade profile as the old `smokeRise` CSS keyframes.
const SMOKE_OPACITY: Frames = [
  [0, 0],
  [0.4, 0.6],
  [1, 0],
];

const makeBrickTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const brickW = 32;
  const brickH = 16;

  // Classic richer red than original dark red
  ctx.fillStyle = '#CD3F3F';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Per-brick tint variation so the wall doesn't read as a flat fill.
  for (let row = 0; row < canvas.height / brickH; row++) {
    const offset = row % 2 ? brickW / 2 : 0;
    for (let col = -1; col <= canvas.width / brickW; col++) {
      const v = Math.random();
      ctx.fillStyle = v < 0.35 ? 'rgba(255,255,255,0.06)' : v < 0.7 ? 'rgba(0,0,0,0.07)' : 'rgba(0,0,0,0)';
      ctx.fillRect(col * brickW + offset + 1, row * brickH + 1, brickW - 2, brickH - 2);
    }
  }

  // Mortar joints.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1.6;
  for (let row = 0; row <= canvas.height / brickH; row++) {
    ctx.beginPath();
    ctx.moveTo(0, row * brickH);
    ctx.lineTo(canvas.width, row * brickH);
    ctx.stroke();
    const offset = row % 2 ? brickW / 2 : 0;
    for (let col = 0; col <= canvas.width / brickW; col++) {
      ctx.beginPath();
      ctx.moveTo(col * brickW + offset, row * brickH);
      ctx.lineTo(col * brickW + offset, row * brickH + brickH);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

// Truncated-pyramid roof matching the old trapezoid silhouette (510 wide base
// sloping in to a 410-wide flat top, 28 tall), with flat-shaded facets.
const makeFrustumGeometry = (bw: number, bd: number, tw: number, td: number, h: number) => {
  const b = [
    [-bw / 2, 0, bd / 2], [bw / 2, 0, bd / 2], [bw / 2, 0, -bd / 2], [-bw / 2, 0, -bd / 2],
  ];
  const t = [
    [-tw / 2, h, td / 2], [tw / 2, h, td / 2], [tw / 2, h, -td / 2], [-tw / 2, h, -td / 2],
  ];
  const quads = [
    [b[0], b[1], t[1], t[0]],
    [b[1], b[2], t[2], t[1]],
    [b[2], b[3], t[3], t[2]],
    [b[3], b[0], t[0], t[3]],
    [t[0], t[1], t[2], t[3]],
    [b[3], b[2], b[1], b[0]],
  ];
  const positions: number[] = [];
  for (const [v0, v1, v2, v3] of quads) {
    positions.push(...v0, ...v1, ...v2, ...v0, ...v2, ...v3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
};

// Arched outline (vertical sides dropping `drop` below the arc centre, capped
// by a semicircle of `radius`) used by the doorway and the arched window.
const archShape = (radius: number, drop: number) => {
  const shape = new THREE.Shape();
  shape.moveTo(-radius, -drop);
  shape.lineTo(-radius, 0);
  shape.absarc(0, 0, radius, Math.PI, 0, true);
  shape.lineTo(radius, -drop);
  shape.closePath();
  return shape;
};

const extrudeArch = (radius: number, drop: number, depth: number) =>
  new THREE.ExtrudeGeometry(archShape(radius, drop), { depth, bevelEnabled: false });

const glassMaterial = (
  <meshStandardMaterial
    color="#1E293B"
    roughness={0.55}
    metalness={0.1}
    emissive="#FDE68A"
    emissiveIntensity={0.14}
  />
);

type Window3DProps = { cx: number; cy: number; w: number; h: number };

const Window3D: React.FC<Window3DProps> = ({ cx, cy, w, h }) => (
  <group position={[cx - 500, 161 - cy, 120]}>
    <mesh position={[0, 0, 0.8]}>
      <boxGeometry args={[w, h, 2]} />
      {glassMaterial}
    </mesh>
    {/* Frame borders - Slate 50 off-white */}
    <mesh position={[0, h / 2 + 2, 1.2]} castShadow>
      <boxGeometry args={[w + 8, 4, 4]} />
      <meshStandardMaterial color="#F8FAFC" roughness={0.7} emissive="#F8FAFC" emissiveIntensity={0.15} />
    </mesh>
    <mesh position={[0, -(h / 2 + 2), 1.2]} castShadow>
      <boxGeometry args={[w + 8, 4, 4]} />
      <meshStandardMaterial color="#F8FAFC" roughness={0.7} emissive="#F8FAFC" emissiveIntensity={0.15} />
    </mesh>
    <mesh position={[-(w / 2 + 2), 0, 1.2]}>
      <boxGeometry args={[4, h + 8, 4]} />
      <meshStandardMaterial color="#F8FAFC" roughness={0.7} emissive="#F8FAFC" emissiveIntensity={0.15} />
    </mesh>
    <mesh position={[w / 2 + 2, 0, 1.2]}>
      <boxGeometry args={[4, h + 8, 4]} />
      <meshStandardMaterial color="#F8FAFC" roughness={0.7} emissive="#F8FAFC" emissiveIntensity={0.15} />
    </mesh>
    {/* Centre mullion */}
    <mesh position={[0, 0, 2]}>
      <boxGeometry args={[1.6, h - 3, 1.4]} />
      <meshStandardMaterial color="#F8FAFC" roughness={0.7} emissive="#F8FAFC" emissiveIntensity={0.15} />
    </mesh>
    {/* Sill - Slate 50 off-white */}
    <mesh position={[0, -(h / 2 + 4.5), 2.5]} castShadow>
      <boxGeometry args={[w + 12, 3.5, 9]} />
      <meshStandardMaterial color="#F8FAFC" roughness={0.7} emissive="#F8FAFC" emissiveIntensity={0.15} />
    </mesh>
  </group>
);

const SmokePuff: React.FC<{ delay: number }> = ({ delay }) => {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (!mesh.current || !material.current) return;
    const t = ((clock.getElapsedTime() + delay) % 3) / 3;
    mesh.current.position.set(-171 - 8 * t + Math.sin(t * 9 + delay * 7) * 2, 150 + 40 * t, 40);
    mesh.current.scale.setScalar(6 * (0.35 + 1.15 * t));
    material.current.opacity = sampleFrames(SMOKE_OPACITY, t);
  });
  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshBasicMaterial ref={material} color="#E2E8F0" transparent depthWrite={false} />
    </mesh>
  );
};

const ToyBus3D: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  color: string;
}> = ({ position, rotation, color }) => (
  <group position={position} rotation={rotation}>
    {/* Main bus body */}
    <mesh castShadow>
      <boxGeometry args={[14, 7, 6]} />
      <meshStandardMaterial color={color} roughness={0.5} />
    </mesh>
    {/* Roof/Top white accent */}
    <mesh position={[0, 3.6, 0]}>
      <boxGeometry args={[14, 0.4, 6]} />
      <meshStandardMaterial color="#F8FAFC" />
    </mesh>
    {/* Wheels */}
    <mesh position={[-4, -3.5, 3]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[2, 2, 1, 8]} />
      <meshStandardMaterial color="#1E293B" roughness={0.9} />
    </mesh>
    <mesh position={[4, -3.5, 3]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[2, 2, 1, 8]} />
      <meshStandardMaterial color="#1E293B" roughness={0.9} />
    </mesh>
    <mesh position={[-4, -3.5, -3]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[2, 2, 1, 8]} />
      <meshStandardMaterial color="#1E293B" roughness={0.9} />
    </mesh>
    <mesh position={[4, -3.5, -3]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[2, 2, 1, 8]} />
      <meshStandardMaterial color="#1E293B" roughness={0.9} />
    </mesh>
    {/* Front window */}
    <mesh position={[7.1, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[4, 3]} />
      <meshBasicMaterial color="#93C5FD" />
    </mesh>
    {/* Side windows */}
    <mesh position={[-3, 1.5, 3.1]}>
      <planeGeometry args={[3, 2.5]} />
      <meshBasicMaterial color="#93C5FD" />
    </mesh>
    <mesh position={[2, 1.5, 3.1]}>
      <planeGeometry args={[3, 2.5]} />
      <meshBasicMaterial color="#93C5FD" />
    </mesh>
    <mesh position={[-3, 1.5, -3.1]} rotation={[0, Math.PI, 0]}>
      <planeGeometry args={[3, 2.5]} />
      <meshBasicMaterial color="#93C5FD" />
    </mesh>
    <mesh position={[2, 1.5, -3.1]} rotation={[0, Math.PI, 0]}>
      <planeGeometry args={[3, 2.5]} />
      <meshBasicMaterial color="#93C5FD" />
    </mesh>
    {/* Headlights */}
    <mesh position={[7, -1, 2]}>
      <sphereGeometry args={[0.8, 8, 8]} />
      <meshBasicMaterial color="#FBBF24" />
    </mesh>
    <mesh position={[7, -1, -2]}>
      <sphereGeometry args={[0.8, 8, 8]} />
      <meshBasicMaterial color="#FBBF24" />
    </mesh>
  </group>
);


type DoorState = 'closed' | 'open' | 'closing';

// Sliding entrance door
const SlidingDoor: React.FC<{ doorState: DoorState }> = ({ doorState }) => {
  const pivot = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const doorGeo = useMemo(() => extrudeArch(26, 125, 2.2), []); // Expanded to cover any yellow background leakage
  const fanGeo = useMemo(() => extrudeArch(20, 1, 1.4), []);
  const open = doorState === 'open';

  useFrame((_, delta) => {
    if (!pivot.current) return;
    pivot.current.position.x = THREE.MathUtils.damp(pivot.current.position.x, open ? 67 : 25, 5, delta);
    pivot.current.scale.x = THREE.MathUtils.damp(pivot.current.scale.x, open ? 0.15 : 1, 5, delta);
    if (material.current) {
      material.current.opacity = THREE.MathUtils.damp(material.current.opacity, open ? 0.7 : 1, 5, delta);
    }
  });

  return (
    <group ref={pivot} position={[25, 0, 2.2]}>
      <mesh geometry={doorGeo} position={[-25, -0.5, 0]} castShadow>
        <meshStandardMaterial ref={material} color="#6B9A8A" roughness={0.6} transparent />
      </mesh>
      {/* Light arch fan at the top of the door */}
      <mesh geometry={fanGeo} position={[-25, -1, 1.2]}>
        <meshStandardMaterial color="#EBF5F1" roughness={0.6} />
      </mesh>
      <mesh position={[-40, -55, 4]}>
        <sphereGeometry args={[4, 16, 12]} />
        <meshStandardMaterial color="#E4C15B" roughness={0.3} metalness={0.6} />
      </mesh>
    </group>
  );
};

// 3D Bird on trees
const Bird3D: React.FC<{
  cx: number;
  cy: number;
  wz: number;
  bodyColor: string;
  wingColor: string;
  delay: number;
  scale?: number;
  mirrored?: boolean;
}> = ({ cx, cy, wz, bodyColor, wingColor, delay, scale = 1.0, mirrored = false }) => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = (clock.getElapsedTime() + delay) % 8;
    // Chirp/shake
    let rz = 0;
    if (t > 0.8 && t < 1.6) {
      rz = Math.sin((t - 0.8) * Math.PI * 4) * 0.15;
    }
    groupRef.current.rotation.z = rz;
    // Turn around
    if (t > 4 && t < 4.2) {
      groupRef.current.scale.x = (mirrored ? 1 : -1) * scale;
    } else {
      groupRef.current.scale.x = (mirrored ? -1 : 1) * scale;
    }
  });

  return (
    <group ref={groupRef} position={p(cx, cy, wz)} scale={scale}>
      <mesh castShadow>
        <sphereGeometry args={[3.5, 8, 8]} />
        <meshStandardMaterial color={bodyColor} roughness={0.7} />
      </mesh>
      <mesh position={[-3, 2.5, 0]} castShadow>
        <sphereGeometry args={[2.2, 8, 8]} />
        <meshStandardMaterial color={bodyColor} roughness={0.7} />
      </mesh>
      <mesh position={[-5.2, 2.2, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <coneGeometry args={[0.7, 2, 4]} />
        <meshStandardMaterial color="#F59E0B" roughness={0.5} />
      </mesh>
      <mesh position={[1.5, 0.5, 1.8]} rotation={[0.2, -0.2, -0.1]} castShadow>
        <boxGeometry args={[4, 1.5, 0.5]} />
        <meshStandardMaterial color={wingColor} roughness={0.7} />
      </mesh>
      <mesh position={[-3.6, 3.2, 1.2]}>
        <sphereGeometry args={[0.4, 4, 4]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
    </group>
  );
};

// 3D Tree canopy sphere helper
const FoliageSphere: React.FC<{ cx: number; cy: number; r: number; color: string; wz: number }> = ({ cx, cy, r, color, wz }) => (
  <mesh position={p(cx, cy, wz)} castShadow receiveShadow>
    <sphereGeometry args={[r, 16, 16]} />
    <meshStandardMaterial color={color} roughness={0.9} />
  </mesh>
);

const Tree3D: React.FC<{
  tx: number;
  ty: number;
  th: number;
  tw: number;
  trunkColor: string;
  children?: React.ReactNode;
}> = ({ tx, ty, th, tw, trunkColor, children }) => (
  <group>
    {/* Trunk */}
    <mesh position={p(tx, ty + th / 2, 0)} castShadow>
      <cylinderGeometry args={[tw / 2, tw / 2, th, 12]} />
      <meshStandardMaterial color={trunkColor} roughness={0.8} />
    </mesh>
    {children}
  </group>
);

// 3D Character Renderer
const Character3D: React.FC<{
  name?: string;
  headColor?: string;
  bodyColor: string;
  isParent?: boolean;
  isChild?: boolean;
  isGreeter?: boolean;
}> = ({
  name,
  headColor = '#475569',
  bodyColor,
  isParent = false,
  isChild = false,
  isGreeter = false,
}) => {
    const sizeMultiplier = isParent ? 2.6 : isGreeter ? 2.4 : isChild ? 1.75 : 1.0;

    return (
      <group scale={sizeMultiplier} name={name}>
        {/* Head */}
        <mesh position={[0, 24, 0]} castShadow>
          <sphereGeometry args={[5, 16, 16]} />
          <meshStandardMaterial color={headColor} roughness={0.6} />
        </mesh>

        {/* Body */}
        {isParent ? (
          <mesh position={[0, 11, 0]} castShadow>
            <cylinderGeometry args={[2.5, 7, 18, 16]} />
            <meshStandardMaterial color={bodyColor} roughness={0.6} />
          </mesh>
        ) : isGreeter ? (
          <group>
            <mesh position={[0, 11, 0]} castShadow>
              <cylinderGeometry args={[4, 5, 18, 16]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.6} />
            </mesh>
            {/* Blue shirt collar */}
            <mesh position={[0, 19, 0.6]} castShadow>
              <coneGeometry args={[1.5, 3, 4]} />
              <meshStandardMaterial color="#3B82F6" roughness={0.6} />
            </mesh>
          </group>
        ) : (
          <mesh position={[0, 10, 0]} castShadow>
            <cylinderGeometry args={[3, 3, 14, 16]} />
            <meshStandardMaterial color={bodyColor} roughness={0.6} />
          </mesh>
        )}

        {/* Legs */}
        <mesh name="leftLeg" position={[-2, 1.5, 0]} castShadow>
          <cylinderGeometry args={[1, 1, 5, 8]} />
          <meshStandardMaterial color="#475569" roughness={0.7} />
        </mesh>
        <mesh name="rightLeg" position={[2, 1.5, 0]} castShadow>
          <cylinderGeometry args={[1, 1, 5, 8]} />
          <meshStandardMaterial color="#475569" roughness={0.7} />
        </mesh>

        {/* Arms */}
        <mesh name="leftArm" position={[-4.5, 16, 0]} rotation={[0, 0, -0.15]} castShadow>
          <cylinderGeometry args={[0.8, 0.8, 10, 8]} />
          <meshStandardMaterial color="#475569" roughness={0.7} />
        </mesh>
        <mesh name="rightArm" position={[4.5, 16, 0]} rotation={[0, 0, 0.15]} castShadow>
          <cylinderGeometry args={[0.8, 0.8, 10, 8]} />
          <meshStandardMaterial color="#475569" roughness={0.7} />
        </mesh>
      </group>
    );
  };

// 3D Dog Renderer (receives color prop)
const Dog3D: React.FC<{ color: string }> = ({ color }) => (
  <group>
    {/* Body */}
    <mesh position={[0, 5, 0]} scale={[1.5, 0.85, 0.85]} castShadow>
      <sphereGeometry args={[6, 16, 16]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>

    {/* Head */}
    <mesh position={[8, 10, 0]} castShadow>
      <sphereGeometry args={[4.2, 16, 16]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>

    {/* Ears */}
    <mesh position={[6.5, 11, 2.5]} rotation={[0.2, 0, 0.2]} castShadow>
      <boxGeometry args={[1.5, 4, 1]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
    <mesh position={[6.5, 11, -2.5]} rotation={[-0.2, 0, 0.2]} castShadow>
      <boxGeometry args={[1.5, 4, 1]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>

    {/* Snout */}
    <mesh position={[11, 9, 0]} rotation={[0, 0, -Math.PI / 6]} castShadow>
      <cylinderGeometry args={[1.2, 1.8, 4, 10]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>

    {/* Legs */}
    <mesh position={[-4, 1.5, 3]} castShadow>
      <cylinderGeometry args={[0.8, 0.8, 4, 8]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
    <mesh position={[-4, 1.5, -3]} castShadow>
      <cylinderGeometry args={[0.8, 0.8, 4, 8]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
    <mesh position={[4, 1.5, 3]} castShadow>
      <cylinderGeometry args={[0.8, 0.8, 4, 8]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
    <mesh position={[4, 1.5, -3]} castShadow>
      <cylinderGeometry args={[0.8, 0.8, 4, 8]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>

    {/* Tail */}
    <group name="tail" position={[-8, 7, 0]} rotation={[0, 0, 0.4]}>
      <mesh position={[0, 2, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.4, 6, 8]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
    </group>
  </group>
);

const HouseModel: React.FC<{
  doorState: DoorState;
  birdsActive: boolean;
  animState: string;
  playState: string;
  clothingColors: { parent: string; child: string; playChild: string };
  staffStepsOut: boolean;
}> = ({ doorState, animState, playState, clothingColors, staffStepsOut }) => {
  const brickTexture = useMemo(makeBrickTexture, []);
  const roofGeo = useMemo(() => makeFrustumGeometry(510, 260, 410, 160, 28), []);
  const surroundGeo = useMemo(() => extrudeArch(29, 123, 1.2), []); // Extended down to 123
  const interiorGeo = useMemo(() => extrudeArch(25, 120, 1.2), []); // Extended down to 120
  const archFrameGeo = useMemo(() => extrudeArch(28, 25, 2.5), []);
  const archGlassGeo = useMemo(() => extrudeArch(25, 22, 2), []);

  // Character and Dog refs
  const ParentMesh = useRef<THREE.Group>(null);
  const ChildMesh = useRef<THREE.Group>(null);
  const GreeterMesh = useRef<THREE.Group>(null);
  const PlayChildMesh = useRef<THREE.Group>(null);
  const BallMesh = useRef<THREE.Group>(null);
  const Dog1Mesh = useRef<THREE.Group>(null);
  const Dog2Mesh = useRef<THREE.Group>(null);

  // Timers and transitions
  const lastAnimState = useRef(animState);
  const animStartTime = useRef(0);
  const lastPlayState = useRef(playState);
  const playStartTime = useRef(0);

  const setGroupOpacity = (group: THREE.Group | null, opacity: number) => {
    if (!group) return;
    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((mat) => {
          mat.transparent = true;
          mat.opacity = opacity;
        });
      }
    });
  };

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (animState !== lastAnimState.current) {
      lastAnimState.current = animState;
      animStartTime.current = time;
    }
    if (playState !== lastPlayState.current) {
      lastPlayState.current = playState;
      playStartTime.current = time;
    }

    const elapsedAnim = time - animStartTime.current;
    const elapsedPlay = time - playStartTime.current;

    // 1. Walk & Knock Group (Parent & Child)
    if (ParentMesh.current && ChildMesh.current) {
      let px = 885, pz = 140, py = 290;
      let cx = 910, cz = 140, cy = 290;
      let pOpacity = 1.0;
      let pWalkCycle = 0;
      let pArmAngle = 0.5;

      if (animState === 'walking') {
        const progress = Math.min(1, elapsedAnim / 4.0);
        px = 885 - 280 * progress;
        cx = px + 25;
        pWalkCycle = Math.sin(time * 12);
        py = 290 - Math.abs(Math.sin(time * 12)) * 3;
        cy = 290 - Math.abs(Math.cos(time * 12)) * 3;
        ParentMesh.current.rotation.z = Math.sin(time * 12) * 0.04;
        ChildMesh.current.rotation.z = Math.cos(time * 12) * 0.04;
      } else if (animState === 'knocking') {
        px = 605;
        cx = 630;
        pArmAngle = -0.8 + Math.sin(time * 18) * 0.4;
        ParentMesh.current.rotation.z = 0;
        ChildMesh.current.rotation.z = 0;
      } else if (animState === 'welcoming') {
        px = 605;
        cx = 630;
        ParentMesh.current.rotation.z = 0;
        ChildMesh.current.rotation.z = 0;
      } else if (animState === 'entering') {
        const progress = Math.min(1, elapsedAnim / 1.8);
        px = 605 + (580 - 605) * progress;
        pz = 140 + (2.2 - 140) * progress;
        py = 290 - progress * 10;

        cx = 630 + (590 - 630) * progress;
        cz = 140 + (2.2 - 140) * progress;
        cy = 290 - progress * 10;

        pWalkCycle = Math.sin(time * 10);
        pOpacity = 1.0 - progress;
      } else {
        pOpacity = 0.0;
      }

      ParentMesh.current.position.set(...p(px, py, pz));
      ChildMesh.current.position.set(...p(cx, cy, cz));
      setGroupOpacity(ParentMesh.current, pOpacity);
      setGroupOpacity(ChildMesh.current, pOpacity);
      ParentMesh.current.visible = pOpacity > 0.01;
      ChildMesh.current.visible = pOpacity > 0.01;

      const leftArm = ParentMesh.current.getObjectByName('leftArm');
      if (leftArm) leftArm.rotation.x = pArmAngle;

      const leftLeg = ParentMesh.current.getObjectByName('leftLeg');
      const rightLeg = ParentMesh.current.getObjectByName('rightLeg');
      if (leftLeg) leftLeg.rotation.x = pWalkCycle;
      if (rightLeg) rightLeg.rotation.x = -pWalkCycle;

      const cLeftLeg = ChildMesh.current.getObjectByName('leftLeg');
      const cRightLeg = ChildMesh.current.getObjectByName('rightLeg');
      if (cLeftLeg) cLeftLeg.rotation.x = pWalkCycle;
      if (cRightLeg) cRightLeg.rotation.x = -pWalkCycle;
    }

    // 2. Greeter (Therapist)
    if (GreeterMesh.current) {
      let gx = 580, gz = 2.2, gy = 280;
      let gOpacity = 0.0;
      let gArmAngle = 0;

      if (staffStepsOut && (animState === 'welcoming' || animState === 'entering')) {
        gOpacity = 1.0;
        if (animState === 'welcoming') {
          const progress = Math.min(1, elapsedAnim / 1.1);
          gz = 2.2 + (15 - 2.2) * progress;
          gArmAngle = -Math.PI / 2 + Math.sin(time * 10) * 0.3;
        } else if (animState === 'entering') {
          const progress = Math.min(1, elapsedAnim / 1.6);
          gz = 15 - 25 * progress;
          gOpacity = 1.0 - progress;
        }
      }

      GreeterMesh.current.position.set(...p(gx, gy, gz));
      setGroupOpacity(GreeterMesh.current, gOpacity);
      GreeterMesh.current.visible = gOpacity > 0.01;

      const rightArm = GreeterMesh.current.getObjectByName('rightArm');
      if (rightArm) rightArm.rotation.x = gArmAngle;
    }

    // 3. Playing Child & Ball
    if (PlayChildMesh.current && BallMesh.current) {
      let pcx = 110, pcy = 290, pcz = 140;
      let bx = 128, by = 266, bz = 140;
      let pcOpacity = 1.0;
      let pcWalkCycle = 0;

      if (playState === 'inside') {
        pcOpacity = 0.0;
      } else if (playState === 'coming-out') {
        const progress = Math.min(1, elapsedPlay / 3.0);
        pcx = 475 + (110 - 475) * progress;
        pcz = 2.2 + (140 - 2.2) * progress;
        pcy = 280 + (290 - 280) * progress - Math.abs(Math.sin(time * 15)) * 3;
        pcWalkCycle = Math.sin(time * 15);
        bx = pcx + 18;
        by = pcy - 12;
      } else if (playState === 'playing') {
        pcx = 110;
        pcy = 290 - Math.abs(Math.sin(time * 5)) * 6;
        pcz = 140;
        bx = 110 + 18;
        by = 290 - 24 - Math.abs(Math.sin(time * 10)) * 15;
      } else if (playState === 'entering-rain') {
        const progress = Math.min(1, elapsedPlay / 2.0);
        pcx = 110 + (475 - 110) * progress;
        pcz = 140 + (2.2 - 140) * progress;
        pcy = 290 - progress * 10 - Math.abs(Math.sin(time * 18)) * 4;
        pcWalkCycle = Math.sin(time * 18);
        pcOpacity = 1.0 - progress;
        bx = pcx + 18;
        by = pcy - 12;
      }

      PlayChildMesh.current.position.set(...p(pcx, pcy, pcz));
      BallMesh.current.position.set(...p(bx, by, bz));
      setGroupOpacity(PlayChildMesh.current, pcOpacity);
      setGroupOpacity(BallMesh.current, pcOpacity);
      PlayChildMesh.current.visible = pcOpacity > 0.01;
      BallMesh.current.visible = pcOpacity > 0.01;

      const pcLeftLeg = PlayChildMesh.current.getObjectByName('leftLeg');
      const pcRightLeg = PlayChildMesh.current.getObjectByName('rightLeg');
      if (pcLeftLeg) pcLeftLeg.rotation.x = pcWalkCycle;
      if (pcRightLeg) pcRightLeg.rotation.x = -pcWalkCycle;
    }

    // 4. Dogs
    if (Dog1Mesh.current && Dog2Mesh.current) {
      let d1x = 140, d1y = 290, d1z = 140;
      let d2x = 180, d2y = 290, d2z = 140;
      let dOpacity = 1.0;
      let d1TailWag = Math.sin(time * 25) * 0.4;
      let d2TailWag = Math.sin(time * 25 + 2.0) * 0.4;
      let d1RotY = 0;
      let d2RotY = 0;

      if (playState === 'inside') {
        dOpacity = 0;
      } else if (playState === 'coming-out') {
        const progress = Math.min(1, elapsedPlay / 3.0);
        d1x = 445 + (140 - 445) * progress;
        d2x = 405 + (180 - 405) * progress;
        d1z = 2.2 + (140 - 2.2) * progress;
        d2z = 2.2 + (140 - 2.2) * progress;
        d1y = 290 - Math.abs(Math.sin(time * 16)) * 2;
        d2y = 290 - Math.abs(Math.sin(time * 16 + 1)) * 2;
        d1RotY = -Math.PI / 2;
        d2RotY = -Math.PI / 2;
      } else if (playState === 'playing') {
        const cycle1 = (time * 0.8) % (2 * Math.PI);
        const dog1RunPos = Math.sin(cycle1);
        d1x = 180 + dog1RunPos * 40;
        d1RotY = Math.cos(cycle1) > 0 ? Math.PI / 2 : -Math.PI / 2;
        d1y = 290 - Math.abs(Math.sin(time * 14)) * 3;

        const cycle2 = (time * 0.8 + 2.5) % (2 * Math.PI);
        const dog2RunPos = Math.sin(cycle2);
        d2x = 200 + dog2RunPos * 40;
        d2RotY = Math.cos(cycle2) > 0 ? Math.PI / 2 : -Math.PI / 2;
        d2y = 290 - Math.abs(Math.sin(time * 14 + 1.2)) * 3;
      } else if (playState === 'entering-rain') {
        const progress = Math.min(1, elapsedPlay / 2.0);
        d1x = 140 + (445 - 140) * progress;
        d2x = 180 + (405 - 180) * progress;
        d1z = 140 + (2.2 - 140) * progress;
        d2z = 140 + (2.2 - 140) * progress;
        d1y = 290 - Math.abs(Math.sin(time * 18)) * 3;
        d2y = 290 - Math.abs(Math.sin(time * 18 + 0.8)) * 3;
        d1RotY = Math.PI / 2;
        d2RotY = Math.PI / 2;
        dOpacity = 1.0 - progress;
      }

      Dog1Mesh.current.position.set(...p(d1x, d1y, d1z));
      Dog2Mesh.current.position.set(...p(d2x, d2y, d2z));
      Dog1Mesh.current.rotation.y = d1RotY;
      Dog2Mesh.current.rotation.y = d2RotY;
      setGroupOpacity(Dog1Mesh.current, dOpacity);
      setGroupOpacity(Dog2Mesh.current, dOpacity);
      Dog1Mesh.current.visible = dOpacity > 0.01;
      Dog2Mesh.current.visible = dOpacity > 0.01;

      const tail1 = Dog1Mesh.current.getObjectByName('tail');
      const tail2 = Dog2Mesh.current.getObjectByName('tail');
      if (tail1) tail1.rotation.y = d1TailWag;
      if (tail2) tail2.rotation.y = d2TailWag;
    }
  });

  return (
    <group>
      {/* Main brick body - Extended from 230 to 250 in height to sink into ground */}
      <mesh position={p(500, 185, -118)} castShadow receiveShadow>
        <boxGeometry args={[480, 250, 236]} />
        <meshStandardMaterial map={brickTexture} roughness={0.85} />
      </mesh>

      {/* Sloped Slate 50 roof */}
      <mesh geometry={roofGeo} position={[0, 101, 2]} castShadow receiveShadow>
        <meshStandardMaterial color="#F8FAFC" roughness={0.7} emissive="#F8FAFC" emissiveIntensity={0.15} flatShading />
      </mesh>

      {/* Chimney + cap */}
      <mesh position={[-171, 141, 40]} castShadow>
        <boxGeometry args={[18, 24, 18]} />
        <meshStandardMaterial map={brickTexture} roughness={0.85} />
      </mesh>
      <mesh position={[-171, 155, 40]} castShadow>
        <boxGeometry args={[24, 4, 24]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.8} />
      </mesh>
      <SmokePuff delay={0} />
      <SmokePuff delay={1} />
      <SmokePuff delay={2} />


      {/* Balcony: floor slab, handrail, 32 balusters, end returns */}
      <mesh position={p(500, 156, 9)} castShadow>
        <boxGeometry args={[520, 12, 18]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.7} emissive="#F8FAFC" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={p(500, 114, 14)} castShadow>
        <boxGeometry args={[520, 8, 8]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.7} emissive="#F8FAFC" emissiveIntensity={0.15} />
      </mesh>
      {Array.from({ length: 32 }).map((_, i) => (
        <mesh key={i} position={p(247.5 + i * 16, 134, 14)}>
          <boxGeometry args={[5, 32, 5]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.7} emissive="#F8FAFC" emissiveIntensity={0.15} />
        </mesh>
      ))}
      <mesh position={p(244, 114, 7)}>
        <boxGeometry args={[8, 8, 14]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.7} emissive="#F8FAFC" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={p(756, 114, 7)}>
        <boxGeometry args={[8, 8, 14]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.7} emissive="#F8FAFC" emissiveIntensity={0.15} />
      </mesh>

      {/* Second floor windows */}
      <Window3D cx={312.5} cy={92.5} w={45} h={35} />
      <Window3D cx={382.5} cy={92.5} w={45} h={35} />
      <Window3D cx={462.5} cy={92.5} w={45} h={35} />

      {/* Arched window (right top) - Slate 50 borders */}
      <group position={[55, 73, 120]}>
        <mesh geometry={archFrameGeo} castShadow>
          <meshStandardMaterial color="#F8FAFC" roughness={0.7} emissive="#F8FAFC" emissiveIntensity={0.15} />
        </mesh>
        <mesh geometry={archGlassGeo} position={[0, 0, 1.2]}>
          {glassMaterial}
        </mesh>
        <mesh position={[0, -1, 3.4]}>
          <boxGeometry args={[1.6, 44, 1.2]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.7} emissive="#F8FAFC" emissiveIntensity={0.15} />
        </mesh>
      </group>

      {/* Ground floor windows */}
      <Window3D cx={330} cy={222.5} w={60} h={65} />
      <Window3D cx={420} cy={222.5} w={60} h={65} />

      {/* Main entrance: Slate 50 surround, warm-lit interior, sliding door */}
      <group position={[85, -29, 120]}>
        <mesh geometry={surroundGeo}>
          <meshStandardMaterial color="#F8FAFC" roughness={0.8} emissive="#F8FAFC" emissiveIntensity={0.15} />
        </mesh>
        <mesh geometry={interiorGeo} position={[0, 0, 0.6]}>
          <meshStandardMaterial color="#FFEAA7" emissive="#FFD980" emissiveIntensity={0.25} roughness={0.9} />
        </mesh>
        <mesh position={[0, -121.5, 5]} castShadow>
          <boxGeometry args={[62, 3, 12]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.8} />
        </mesh>
        <SlidingDoor doorState={doorState} />
      </group>

      {/* --- 3D Trees and Perched Birds --- */}
      {/* 1. Left Tree */}
      <Tree3D tx={70} ty={170} th={120} tw={16} trunkColor="#78350F">
        <FoliageSphere cx={50} cy={150} r={30} color="#15803D" wz={10} />
        <FoliageSphere cx={90} cy={150} r={30} color="#166534" wz={-10} />
        <FoliageSphere cx={70} cy={115} r={35} color="#22C55E" wz={5} />
        <FoliageSphere cx={70} cy={105} r={20} color="#4ADE80" wz={15} />
        <FoliageSphere cx={35} cy={135} r={25} color="#14532D" wz={-5} />
        <FoliageSphere cx={105} cy={135} r={25} color="#15803D" wz={-15} />
        <FoliageSphere cx={55} cy={95} r={22} color="#86EFAC" wz={20} />
        <FoliageSphere cx={85} cy={95} r={22} color="#22C55E" wz={-10} />
        <FoliageSphere cx={70} cy={80} r={18} color="#4ADE80" wz={10} />
        <FoliageSphere cx={45} cy={115} r={24} color="#15803D" wz={12} />
        <FoliageSphere cx={95} cy={115} r={24} color="#166534" wz={-8} />
        <FoliageSphere cx={70} cy={135} r={28} color="#14532D" wz={0} />
        <FoliageSphere cx={70} cy={90} r={15} color="#86EFAC" wz={8} />

        <Bird3D cx={60} cy={95} wz={22} bodyColor="#3B82F6" wingColor="#1D4ED8" delay={0} />
        <Bird3D cx={85} cy={105} wz={-12} bodyColor="#10B981" wingColor="#047857" delay={1.5} mirrored />
        <Bird3D cx={42} cy={128} wz={14} bodyColor="#F59E0B" wingColor="#B45309" delay={2.6} scale={0.9} />
        <Bird3D cx={101} cy={126} wz={-17} bodyColor="#EF4444" wingColor="#B91C1C" delay={3.4} scale={0.9} mirrored />
      </Tree3D>

      {/* 3. Small Left Tree (in place of the bench) */}
      <Tree3D tx={195} ty={230} th={60} tw={8} trunkColor="#7C3F14">
        <FoliageSphere cx={185} cy={225} r={15} color="#2F6F34" wz={5} />
        <FoliageSphere cx={210} cy={225} r={16} color="#4F8A3A" wz={-5} />
        <FoliageSphere cx={195} cy={205} r={20} color="#6FAF4E" wz={8} />
        <FoliageSphere cx={188} cy={198} r={12} color="#8BC66B" wz={12} />
        <FoliageSphere cx={202} cy={199} r={13} color="#3E7D32" wz={-8} />
      </Tree3D>

      {/* Green Toy Buses between the Left Tree and Small Left Tree */}
      <ToyBus3D position={p(105, 285, 110)} rotation={[0, -0.2, 0]} color="#059669" />
      <ToyBus3D position={p(130, 286, 120)} rotation={[0, 0.4, 0]} color="#10B981" />
      <ToyBus3D position={p(142, 286, 130)} rotation={[0, 0.15, 0]} color="#16A34A" />
      <ToyBus3D position={p(155, 287, 100)} rotation={[0, -0.6, 0]} color="#22C55E" />
      <ToyBus3D position={p(172, 288, 95)} rotation={[0, 0.7, 0]} color="#4ADE80" />

      {/* 2. Small Right Tree */}
      <Tree3D tx={766} ty={222} th={68} tw={10} trunkColor="#7C3F14">
        <FoliageSphere cx={752} cy={220} r={18} color="#2F6F34" wz={5} />
        <FoliageSphere cx={786} cy={219} r={19} color="#4F8A3A" wz={-5} />
        <FoliageSphere cx={769} cy={200} r={23} color="#6FAF4E" wz={8} />
        <FoliageSphere cx={760} cy={193} r={13} color="#8BC66B" wz={15} />
        <FoliageSphere cx={779} cy={194} r={14} color="#3E7D32" wz={-10} />

        <Bird3D cx={765} cy={194} wz={17} bodyColor="#8B5CF6" wingColor="#6D28D9" delay={0.8} scale={0.85} />
        <Bird3D cx={787} cy={218} wz={-8} bodyColor="#0EA5E9" wingColor="#0369A1" delay={2.2} scale={0.78} mirrored />
      </Tree3D>

      {/* --- 3D Characters Group --- */}
      {/* Walking Parent & Child */}
      <group ref={ParentMesh}>
        <Character3D bodyColor={clothingColors.parent} isParent />
      </group>
      <group ref={ChildMesh}>
        <Character3D bodyColor={clothingColors.child} isChild />
      </group>

      {/* Therapist Greeter */}
      <group ref={GreeterMesh}>
        <Character3D bodyColor="#FFFFFF" isGreeter />
      </group>

      {/* Playing Child & Bouncing Ball */}
      <group ref={PlayChildMesh}>
        <Character3D headColor="#FDBA74" bodyColor={clothingColors.playChild} isChild />
      </group>
      <group ref={BallMesh}>
        <mesh castShadow>
          <sphereGeometry args={[4, 16, 16]} />
          <meshStandardMaterial color="#F59E0B" roughness={0.4} />
        </mesh>
      </group>

      {/* Roaming Dogs (Scaled to 2.4) */}
      <group ref={Dog1Mesh} scale={2.4}>
        <Dog3D color="#D97706" />
      </group>
      <group ref={Dog2Mesh} scale={2.4}>
        <Dog3D color="#64748B" />
      </group>
    </group>
  );
};

type TiltRef = { current: { x: number; y: number } };

// Damped hover tilt: eases toward the pointer-driven target and back to the
// exact rest pose (0,0) where the 3D façade aligns with the 2D overlays.
const TiltGroup: React.FC<{ tiltRef: TiltRef; children: React.ReactNode }> = ({ tiltRef, children }) => {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, tiltRef.current.y, 4, delta);
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, tiltRef.current.x, 4, delta);
  });
  return (
    <group ref={group} position={PIVOT}>
      {children}
    </group>
  );
};

type House3DProps = {
  doorState: DoorState;
  birdsActive: boolean;
  tiltRef: TiltRef;
  animState: string;
  playState: string;
  clothingColors: { parent: string; child: string; playChild: string };
  staffStepsOut: boolean;
};

const House3D: React.FC<House3DProps> = ({
  doorState,
  birdsActive,
  tiltRef,
  animState,
  playState,
  clothingColors,
  staffStepsOut,
}) => (
  <Canvas
    flat
    shadows
    dpr={[1, 2]}
    gl={{ antialias: true, alpha: true }}
    camera={{ fov: FOV, near: 10, far: 2500, position: [0, CAM_Y, CAM_Z] }}
    style={{ pointerEvents: 'none', background: 'transparent' }}
  >
    <ambientLight intensity={0.5} />
    <hemisphereLight color="#DBEAFE" groundColor="#D9F99D" intensity={0.35} />
    <directionalLight
      position={[-280, 320, 300]}
      intensity={0.85}
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-camera-left={-650}
      shadow-camera-right={650}
      shadow-camera-top={450}
      shadow-camera-bottom={-350}
      shadow-camera-near={20}
      shadow-camera-far={1500}
      shadow-bias={-0.0004}
    />
    <TiltGroup tiltRef={tiltRef}>
      <HouseModel
        doorState={doorState}
        birdsActive={birdsActive}
        animState={animState}
        playState={playState}
        clothingColors={clothingColors}
        staffStepsOut={staffStepsOut}
      />
    </TiltGroup>
    {/* Soft contact shadow on the ground; stays put while the house tilts */}
    <mesh rotation-x={-Math.PI / 2} position={[100, -129.5, -80]} receiveShadow>
      <planeGeometry args={[1000, 620]} />
      <shadowMaterial transparent opacity={0.18} />
    </mesh>
  </Canvas>
);

export default House3D;
