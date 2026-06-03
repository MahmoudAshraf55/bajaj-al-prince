'use client';

import { Suspense, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, ContactShadows, useGLTF, Html, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

export interface SceneRef {
  getCamera: () => THREE.PerspectiveCamera | null;
  getModel: () => THREE.Group | null;
  setOpacity: (opacity: number) => void;
}

const modelRef = { current: null as THREE.Group | null };

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
