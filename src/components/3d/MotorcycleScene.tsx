'use client';

import { Suspense, useRef, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, ContactShadows, useGLTF, Html, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

export interface SceneRef {
  getCamera: () => THREE.PerspectiveCamera | null;
  getModel: () => THREE.Group | null;
  setOpacity: (opacity: number) => void;
}

const modelRef = { current: null as THREE.Group | null };

function LensFlare({ position, color, size = 1, speed = 1 }: { position: [number, number, number]; color: string; size?: number; speed?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);

  const flareTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Create radial gradient for soft glow
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.3, color + '88');
    gradient.addColorStop(0.6, color + '22');
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, [color]);

  const streakTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    // Anamorphic streak gradient
    const gradient = ctx.createLinearGradient(0, 16, 256, 16);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.2, color + '11');
    gradient.addColorStop(0.5, color + '66');
    gradient.addColorStop(0.8, color + '11');
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 32);

    // Add bright center line
    const lineGrad = ctx.createLinearGradient(0, 15, 256, 15);
    lineGrad.addColorStop(0, 'transparent');
    lineGrad.addColorStop(0.45, color + 'CC');
    lineGrad.addColorStop(0.55, color + 'CC');
    lineGrad.addColorStop(1, 'transparent');

    ctx.fillStyle = lineGrad;
    ctx.fillRect(0, 14, 256, 4);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, [color]);

  useFrame((_, delta) => {
    timeRef.current += delta * speed;
    if (groupRef.current) {
      // Subtle breathing animation
      groupRef.current.children.forEach((child, i) => {
        const sprite = child as THREE.Sprite;
        const breathe = Math.sin(timeRef.current + i * 1.5) * 0.15 + 1;
        sprite.scale.setScalar((0.5 + i * 0.4) * size * breathe);
      });
      // Slow rotation of the streak
      groupRef.current.rotation.y += delta * 0.1;
    }
  });

  return (
    <group position={position} ref={groupRef}>
      {/* Main glow */}
      <sprite scale={[size * 2, size * 2, 1]}>
        <spriteMaterial map={flareTexture} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>

      {/* Inner bright core */}
      <sprite scale={[size * 0.6, size * 0.6, 1]}>
        <spriteMaterial map={flareTexture} transparent blending={THREE.AdditiveBlending} depthWrite={false} color="#ffffff" />
      </sprite>

      {/* Horizontal anamorphic streak */}
      <sprite scale={[size * 6, size * 0.3, 1]}>
        <spriteMaterial map={streakTexture} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>

      {/* Vertical anamorphic streak */}
      <sprite scale={[size * 0.2, size * 5, 1]} rotation={[0, 0, Math.PI / 2]}>
        <spriteMaterial map={streakTexture} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>

      {/* Secondary ghost flares */}
      <sprite position={[size * 2, size * 0.5, 0]} scale={[size * 0.8, size * 0.8, 1]}>
        <spriteMaterial map={flareTexture} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      <sprite position={[-size * 1.5, -size * 0.3, 0]} scale={[size * 0.5, size * 0.5, 1]}>
        <spriteMaterial map={flareTexture} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
    </group>
  );
}

function Model() {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/bajaj180.glb');

  useEffect(() => {
    if (scene) {
      const box = new THREE.Box3().setFromObject(scene);
      const center = box.getCenter(new THREE.Vector3());
      scene.position.sub(center);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2 / maxDim;
      scene.scale.setScalar(scale);

      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          if (mesh.material) {
            const mat = mesh.material as THREE.MeshStandardMaterial;
            if (mat.metalness !== undefined) {
              mat.metalness = Math.max(mat.metalness, 0.8);
              mat.roughness = Math.min(mat.roughness, 0.25);
            }
          }
        }
      });

      modelRef.current = group.current;
    }
  }, [scene]);

  useEffect(() => {
    modelRef.current = group.current;
  });

  return (
    <group ref={group} position={[0, -0.02, 0]}>
      <primitive object={scene} />
    </group>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.15} />
      <spotLight
        position={[8, 12, 8]}
        angle={0.4}
        penumbra={0.8}
        intensity={1.2}
        castShadow
        shadow-mapSize={2048}
        color="#ffffff"
      />
      <spotLight
        position={[-8, 6, -5]}
        angle={0.5}
        penumbra={1}
        intensity={0.6}
        color="#c9a84c"
      />
      <pointLight position={[0, 4, 6]} intensity={0.4} color="#c9a84c" />
      <pointLight position={[-4, 2, -4]} intensity={0.3} color="#a0c8ff" />
      <directionalLight position={[0, 5, -5]} intensity={0.3} color="#ffffff" />
    </>
  );
}

function CameraController({ cameraRef }: { cameraRef: React.RefObject<THREE.PerspectiveCamera | null> }) {
  const { camera } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    // Start position: front 3/4 view, ~30° orbit (matches GSAP animation start)
    cam.position.set(2.1, 1.2, 3.63);
    cam.lookAt(0, 0.3, 0);
    cam.fov = 32;
    cam.updateProjectionMatrix();
    if (cameraRef) {
      (cameraRef as React.MutableRefObject<THREE.PerspectiveCamera | null>).current = cam;
    }
  }, [camera, cameraRef]);

  useFrame(() => {
    if (cameraRef?.current) {
      cameraRef.current.updateProjectionMatrix();
    }
  });

  return null;
}

function LoadingFallback() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-muted-foreground text-sm font-medium tracking-wider">LOADING 3D MODEL</span>
      </div>
    </Html>
  );
}

useGLTF.preload('/models/bajaj180.glb');

const MotorcycleScene = forwardRef<SceneRef>((_, ref) => {
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    getCamera: () => cameraRef.current,
    getModel: () => modelRef.current,
    setOpacity: (opacity: number) => {
      if (containerRef.current) {
        containerRef.current.style.opacity = String(opacity);
      }
    },
  }));

  return (
    <div ref={containerRef} className="fixed top-0 left-0 w-screen h-screen -z-10">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 2.0,
          alpha: true,
        }}
      >
        <PerspectiveCamera makeDefault position={[2.1, 1.2, 3.63]} fov={32} near={0.1} far={100} />
        <CameraController cameraRef={cameraRef} />
        <Lights />
        <Suspense fallback={<LoadingFallback />}>
          <Model />

          {/* Cinematic Anamorphic Lens Flares */}
          <LensFlare position={[8, 12, 8]} color="#ffaa44" size={0.8} speed={0.5} />
          <LensFlare position={[-8, 6, -5]} color="#ffdd88" size={0.5} speed={0.7} />
          <LensFlare position={[0, 4, 6]} color="#ffcc66" size={0.4} speed={0.9} />
          <LensFlare position={[-4, 2, -4]} color="#88ccff" size={0.3} speed={1.2} />

          <ContactShadows
            position={[0, -0.8, 0]}
            opacity={0.5}
            scale={12}
            blur={3}
            far={5}
            color="#000000"
          />
          <Environment preset="city" environmentIntensity={0.3} />
        </Suspense>
      </Canvas>
    </div>
  );
});

MotorcycleScene.displayName = 'MotorcycleScene';

export default MotorcycleScene;
