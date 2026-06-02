'use client';

import { useEffect, useState, Suspense, forwardRef } from 'react';
import MotorcycleScene from '@/components/3d/MotorcycleScene';
import type { SceneRef } from '@/components/3d/MotorcycleScene';

function LoadingFallback() {
  return (
    <div className="fixed top-0 left-0 w-screen h-screen -z-10 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-muted-foreground text-sm font-medium tracking-wider">LOADING 3D MODEL</span>
      </div>
    </div>
  );
}

const MotorcycleSceneClient = forwardRef<SceneRef>(function MotorcycleSceneClient(_props, ref) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <LoadingFallback />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <MotorcycleScene ref={ref} />
    </Suspense>
  );
});

export default MotorcycleSceneClient;
