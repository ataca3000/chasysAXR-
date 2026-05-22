import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';

export function PrototypeBox({ images, position }: { images: string[], position: [number, number, number] }) {
  // If we have at least one image, we use it for all sides if less than 6 are provided
  const textureList = images.length > 0 ? images : [''];
  const textures = useLoader(
    THREE.TextureLoader, 
    textureList.length >= 6 ? textureList.slice(0, 6) : Array(6).fill(textureList[0])
  );

  return (
    <mesh position={position}>
      <boxGeometry args={[1.5, 1.5, 1.5]} />
      {Array.isArray(textures) ? textures.map((tex, i) => (
        <meshStandardMaterial key={i} attach={`material-${i}`} map={tex} />
      )) : (
        <meshStandardMaterial map={textures} />
      )}
    </mesh>
  );
}
