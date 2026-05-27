import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function ScanningLaser({ active }: { active: boolean }) {
  const laserRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!active || !laserRef.current) return;
    const t = state.clock.getElapsedTime();
    laserRef.current.position.z = Math.sin(t * 1.5) * 10;
    if (meshRef.current) {
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.4 + Math.random() * 0.2;
    }
  });

  if (!active) return null;

  return (
    <group ref={laserRef}>
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.05, 0]}
      >
        <planeGeometry args={[20, 0.2]} />
        <meshBasicMaterial
          color="#4285F4"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      <pointLight
        position={[0, 0.5, 0]}
        intensity={2}
        distance={5}
        color="#4285F4"
      />
    </group>
  );
}
