"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  Continent bounding boxes                                           */
/* ------------------------------------------------------------------ */
const CONTINENTS = [
  [25, 70, -130, -60], [15, 30, -115, -85], [7, 20, -92, -77],
  [-55, 12, -82, -35], [36, 71, -10, 40], [-35, 37, -17, 52],
  [12, 42, 25, 60], [10, 55, 60, 140], [55, 72, 40, 180],
  [8, 35, 68, 90], [-10, 20, 95, 140], [30, 46, 125, 146],
  [-40, -12, 112, 154], [-47, -34, 166, 179], [50, 59, -11, 2],
] as const;

function isLand(lat: number, lng: number) {
  for (const [latMin, latMax, lngMin, lngMax] of CONTINENTS) {
    if (lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax) return true;
  }
  return false;
}

function latLngToXYZ(lat: number, lng: number, r: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return [
    -(r * Math.sin(phi) * Math.cos(theta)),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  ];
}

/* ------------------------------------------------------------------ */
/*  Cities                                                             */
/* ------------------------------------------------------------------ */
const CITIES = [
  [40.7, -74], [51.5, -0.1], [35.7, 139.7], [1.35, 103.8],
  [22.3, 114.2], [19.1, 72.9], [-23.5, -46.6], [25.2, 55.3],
  [-33.9, 151.2], [37.6, 127], [49.4, 8.7], [48.9, 2.3],
] as const;

/* ------------------------------------------------------------------ */
/*  Star field                                                         */
/* ------------------------------------------------------------------ */
function StarField() {
  const geo = useMemo(() => {
    const positions = new Float32Array(2000 * 3);
    const sizes = new Float32Array(2000);
    for (let i = 0; i < 2000; i++) {
      const r = 15 + Math.random() * 35;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = 0.3 + Math.random() * 1.2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1));
    return g;
  }, []);

  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: "#ffffff",
        size: 0.08,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      }),
    []
  );

  const points = useMemo(() => new THREE.Points(geo, mat), [geo, mat]);

  return <primitive object={points} />;
}

/* ------------------------------------------------------------------ */
/*  Dotted globe                                                       */
/* ------------------------------------------------------------------ */
function DottedGlobe() {
  const groupRef = useRef<THREE.Group>(null!);

  // Generate globe points
  const globePoints = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];
    const landColor = new THREE.Color("#8B95A8");
    const oceanColor = new THREE.Color("#2A2E3E");
    const blueHighlight = new THREE.Color("#4D8AFF");

    const N = 4500;
    let placed = 0;
    for (let i = 0; i < N * 4 && placed < N; i++) {
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const lat = Math.asin(u) * (180 / Math.PI);
      const lng = (t / Math.PI) * 180 - 180;
      const onLand = isLand(lat, lng);

      if (!onLand && Math.random() > 0.2) continue;

      const [x, y, z] = latLngToXYZ(lat, lng, 2);
      positions.push(x, y, z);

      if (onLand) {
        const highlight = Math.random() < 0.1;
        const c = highlight ? blueHighlight : landColor;
        colors.push(c.r, c.g, c.b);
      } else {
        colors.push(oceanColor.r, oceanColor.g, oceanColor.b);
      }
      placed++;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return geo;
  }, []);

  const globeMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        vertexColors: true,
        size: 0.03,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  // City markers
  const cityGeo = useMemo(() => {
    const positions: number[] = [];
    CITIES.forEach(([lat, lng]) => {
      const [x, y, z] = latLngToXYZ(lat, lng, 2.02);
      positions.push(x, y, z);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return g;
  }, []);

  const cityGlowMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: "#4D8AFF",
        size: 0.12,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  const cityCoreMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: "#ffffff",
        size: 0.06,
        sizeAttenuation: true,
        transparent: true,
        opacity: 1,
        depthWrite: false,
      }),
    []
  );

  const globe = useMemo(() => new THREE.Points(globePoints, globeMat), [globePoints, globeMat]);
  const cityGlow = useMemo(() => new THREE.Points(cityGeo, cityGlowMat), [cityGeo, cityGlowMat]);
  const cityCore = useMemo(() => new THREE.Points(cityGeo, cityCoreMat), [cityGeo, cityCoreMat]);

  // Rotation
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.06;
    }
    // Pulse city glow
    cityGlowMat.size = 0.12 + Math.sin(Date.now() * 0.002) * 0.04;
    cityGlowMat.opacity = 0.6 + Math.sin(Date.now() * 0.002) * 0.2;
  });

  return (
    <group ref={groupRef} rotation={[0.15, 0, 0.1]}>
      <primitive object={globe} />
      <primitive object={cityGlow} />
      <primitive object={cityCore} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Atmosphere glow rings                                              */
/* ------------------------------------------------------------------ */
function AtmosphereGlow() {
  const ringRef = useRef<THREE.Mesh>(null!);

  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.02;
    }
  });

  return (
    <>
      {/* Blue atmospheric shell */}
      <mesh>
        <sphereGeometry args={[2.15, 64, 64]} />
        <meshBasicMaterial
          color="#2962FF"
          transparent
          opacity={0.03}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Purple outer shell */}
      <mesh>
        <sphereGeometry args={[2.3, 64, 64]} />
        <meshBasicMaterial
          color="#AB47BC"
          transparent
          opacity={0.015}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Glow ring 1 — blue */}
      <mesh ref={ringRef} rotation={[Math.PI / 2.1, 0.2, 0]}>
        <torusGeometry args={[2.35, 0.008, 16, 128]} />
        <meshBasicMaterial
          color="#2962FF"
          transparent
          opacity={0.25}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Glow ring 2 — purple */}
      <mesh rotation={[Math.PI / 1.7, -0.3, 0.25]}>
        <torusGeometry args={[2.4, 0.005, 16, 128]} />
        <meshBasicMaterial
          color="#AB47BC"
          transparent
          opacity={0.15}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Inner rim light */}
      <mesh>
        <sphereGeometry args={[2.05, 64, 64]} />
        <meshBasicMaterial
          color="#4D8AFF"
          transparent
          opacity={0.06}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Exported 3D scene                                                  */
/* ------------------------------------------------------------------ */
export function Globe3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5.5], fov: 40 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent", width: "100%", height: "100%" }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.15} />
      <pointLight position={[6, 4, 6]} intensity={0.6} color="#2962FF" distance={20} />
      <pointLight position={[-6, -3, 4]} intensity={0.3} color="#AB47BC" distance={20} />
      <pointLight position={[0, 6, 2]} intensity={0.15} color="#26A69A" distance={15} />

      <StarField />
      <DottedGlobe />
      <AtmosphereGlow />
    </Canvas>
  );
}
