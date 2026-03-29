"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

// Dynamic import for 3D scene to avoid SSR issues
const Scene3D = dynamic(() => import("./3d-scene"), { 
  ssr: false,
  loading: () => null
});

export function CanvasWrapper() {
  return (
    <div className="absolute inset-0 z-0">
      <Scene3D />
    </div>
  );
}
