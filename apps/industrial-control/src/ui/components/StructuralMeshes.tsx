import { Suspense, useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";
// @ts-ignore
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
// @ts-ignore
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
// @ts-ignore
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { AxisAutomation, AxisName, AssemblyNode } from "../../store/assemblyStore";

let cachedBrushedTex: THREE.CanvasTexture | null = null;

function getBrushedMetalTexture(): THREE.CanvasTexture {
  if (cachedBrushedTex) return cachedBrushedTex;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#b8c2cc";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 650; i++) {
      const y = Math.random() * 512;
      ctx.strokeStyle =
        i % 2 === 0 ? "rgba(255,255,255,0.14)" : "rgba(15,23,42,0.14)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  cachedBrushedTex = tex;
  return tex;
}

const CustomModel = ({ url, fileExt }: { url: string; fileExt: string }) => {
  const isGLTF = fileExt === "gltf" || fileExt === "glb";
  const isSTL = fileExt === "stl";
  const Loader = isGLTF ? GLTFLoader : isSTL ? STLLoader : OBJLoader;

  try {
    const object = useLoader(Loader as any, url);
    if (isSTL) {
      return (
        <mesh castShadow receiveShadow>
          <primitive object={object} attach="geometry" />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.28} />
        </mesh>
      );
    }
    const scene = isGLTF ? (object as any).scene : object;
    return <primitive object={scene.clone()} />;
  } catch {
    return (
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.9, 0.9, 0.9]} />
        <meshStandardMaterial color="#ef4444" roughness={0.5} metalness={0.2} />
      </mesh>
    );
  }
};

const AXIS_COLORS: Record<AxisName, string> = {
  x: "#ef4444",
  y: "#22c55e",
  z: "#3b82f6",
};

const AXIS_ROTATIONS: Record<AxisName, [number, number, number]> = {
  x: [0, 0, Math.PI / 2],
  y: [0, 0, 0],
  z: [Math.PI / 2, 0, 0],
};

export function AxisAutomationGuide({
  automation,
  visible,
}: {
  automation: AxisAutomation;
  visible: boolean;
}) {
  if (!visible || !automation.enabled || automation.mode === "static") {
    return null;
  }

  const color = AXIS_COLORS[automation.axis];
  const rot = AXIS_ROTATIONS[automation.axis];
  const isLinear = automation.mode === "translate" || automation.mode === "helical";
  const isRotary =
    automation.mode === "rotate" ||
    automation.mode === "oscillate" ||
    automation.mode === "helical";

  return (
    <group rotation={rot}>
      {/* Central axis spine */}
      <mesh>
        <cylinderGeometry args={[0.015, 0.015, isLinear ? Math.max(1.4, automation.amplitude * 2) : 1.5, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.85} />
      </mesh>
      {/* Positive direction cone */}
      <mesh position={[0, (isLinear ? Math.max(1.4, automation.amplitude * 2) : 1.5) / 2 + 0.08, 0]}>
        <coneGeometry args={[0.055, 0.16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Rotation ring indicator */}
      {isRotary && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.72, 0.018, 12, 48]} />
          <meshBasicMaterial color={color} transparent opacity={0.75} />
        </mesh>
      )}
      {/* Linear travel end-stops */}
      {isLinear && (
        <>
          <mesh position={[0, automation.amplitude, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.02, 16]} />
            <meshBasicMaterial color={color} transparent opacity={0.65} />
          </mesh>
          <mesh position={[0, -automation.amplitude, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.02, 16]} />
            <meshBasicMaterial color={color} transparent opacity={0.65} />
          </mesh>
        </>
      )}
    </group>
  );
}

export function CompositeStructureMesh({
  node,
  isSelected,
}: {
  node: AssemblyNode;
  isSelected: boolean;
}) {
  const metalTex = useMemo(() => getBrushedMetalTexture(), []);
  const accent = isSelected ? "#60a5fa" : "#3b82f6";

  switch (node.type) {
    case "cnc_gantry":
      return (
        <group>
          {/* Left & Right extruded rails */}
          <mesh position={[-1.4, 0.1, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.24, 0.2, 3.2]} />
            <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.35} />
          </mesh>
          <mesh position={[1.4, 0.1, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.24, 0.2, 3.2]} />
            <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.35} />
          </mesh>
          {/* Base cross plates */}
          <mesh position={[0, 0.05, -1.4]} receiveShadow>
            <boxGeometry args={[3.04, 0.1, 0.28]} />
            <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.45} />
          </mesh>
          <mesh position={[0, 0.05, 1.4]} receiveShadow>
            <boxGeometry args={[3.04, 0.1, 0.28]} />
            <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.45} />
          </mesh>
          {/* Vertical gantry columns */}
          <mesh position={[-1.4, 1.1, 0]} castShadow>
            <boxGeometry args={[0.22, 1.85, 0.34]} />
            <meshStandardMaterial
              map={metalTex}
              color={isSelected ? "#93c5fd" : "#cbd5e1"}
              metalness={0.88}
              roughness={0.25}
            />
          </mesh>
          <mesh position={[1.4, 1.1, 0]} castShadow>
            <boxGeometry args={[0.22, 1.85, 0.34]} />
            <meshStandardMaterial
              map={metalTex}
              color={isSelected ? "#93c5fd" : "#cbd5e1"}
              metalness={0.88}
              roughness={0.25}
            />
          </mesh>
          {/* Dual bridge beam */}
          <mesh position={[0, 2.05, -0.1]} castShadow>
            <boxGeometry args={[3.15, 0.26, 0.16]} />
            <meshStandardMaterial color="#0f172a" metalness={0.75} roughness={0.45} />
          </mesh>
          <mesh position={[0, 2.05, 0.1]} castShadow>
            <boxGeometry args={[3.15, 0.26, 0.16]} />
            <meshStandardMaterial color="#0f172a" metalness={0.75} roughness={0.45} />
          </mesh>
          {/* Linear guide rod */}
          <mesh position={[0, 2.05, 0.22]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.035, 0.035, 2.8, 16]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.15} />
          </mesh>
          {/* Accent anchor badge */}
          <mesh position={[0, 2.22, 0]}>
            <boxGeometry args={[0.45, 0.06, 0.22]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.35} roughness={0.4} metalness={0.2} />
          </mesh>
        </group>
      );

    case "robot_arm":
      return (
        <group>
          {/* Lower turret collar */}
          <mesh position={[0, 0.18, 0]} castShadow>
            <cylinderGeometry args={[0.36, 0.42, 0.36, 24]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.32} />
          </mesh>
          {/* Shoulder hinge */}
          <mesh position={[0, 0.48, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.44, 24]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.45} roughness={0.42} />
          </mesh>
          {/* Primary boom link */}
          <mesh position={[0.32, 0.96, 0]} rotation={[0, 0, -0.45]} castShadow>
            <boxGeometry args={[0.22, 1.08, 0.22]} />
            <meshStandardMaterial
              map={metalTex}
              color={isSelected ? "#fde68a" : "#e2e8f0"}
              metalness={0.85}
              roughness={0.24}
            />
          </mesh>
          {/* Elbow servo drum */}
          <mesh position={[0.62, 1.44, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.16, 0.16, 0.36, 24]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Forearm extension */}
          <mesh position={[0.92, 1.48, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.09, 0.11, 0.65, 20]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.22} />
          </mesh>
          {/* Wrist mount */}
          <mesh position={[1.26, 1.48, 0]}>
            <boxGeometry args={[0.14, 0.22, 0.22]} />
            <meshStandardMaterial color={accent} metalness={0.35} roughness={0.45} />
          </mesh>
        </group>
      );

    case "rotary_table":
      return (
        <group>
          {/* Base flange */}
          <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.95, 1.08, 0.2, 32]} />
            <meshStandardMaterial color="#0f172a" metalness={0.82} roughness={0.42} />
          </mesh>
          {/* Bearing collar */}
          <mesh position={[0, 0.26, 0]} castShadow>
            <cylinderGeometry args={[0.72, 0.78, 0.12, 32]} />
            <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.2} />
          </mesh>
          {/* Machined platter */}
          <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.85, 0.85, 0.14, 32]} />
            <meshStandardMaterial
              map={metalTex}
              color={isSelected ? "#93c5fd" : "#cbd5e1"}
              metalness={0.92}
              roughness={0.18}
            />
          </mesh>
          {/* 4-Jaw chuck blocks */}
          {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, idx) => (
            <mesh
              key={idx}
              position={[Math.cos(angle) * 0.52, 0.53, Math.sin(angle) * 0.52]}
              rotation={[0, -angle, 0]}
              castShadow
            >
              <boxGeometry args={[0.24, 0.14, 0.16]} />
              <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.4} />
            </mesh>
          ))}
          {/* Center alignment index marker */}
          <mesh position={[0, 0.49, 0.65]}>
            <boxGeometry args={[0.08, 0.05, 0.24]} />
            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.6} />
          </mesh>
        </group>
      );

    case "linear_rail":
      return (
        <group>
          {/* Extruded T-slot base */}
          <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.8, 0.24, 0.56]} />
            <meshStandardMaterial
              map={metalTex}
              color="#64748b"
              metalness={0.82}
              roughness={0.32}
            />
          </mesh>
          {/* Dual chrome guide shafts */}
          <mesh position={[0, 0.28, -0.16]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.035, 0.035, 2.65, 16]} />
            <meshStandardMaterial color="#f1f5f9" metalness={0.96} roughness={0.12} />
          </mesh>
          <mesh position={[0, 0.28, 0.16]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.035, 0.035, 2.65, 16]} />
            <meshStandardMaterial color="#f1f5f9" metalness={0.96} roughness={0.12} />
          </mesh>
          {/* End stop blocks */}
          <mesh position={[-1.34, 0.28, 0]} castShadow>
            <boxGeometry args={[0.14, 0.28, 0.6]} />
            <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.5} />
          </mesh>
          <mesh position={[1.34, 0.28, 0]} castShadow>
            <boxGeometry args={[0.14, 0.28, 0.6]} />
            <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.5} />
          </mesh>
          {/* Stepper motor block on left */}
          <mesh position={[-1.56, 0.28, 0]} castShadow>
            <boxGeometry args={[0.3, 0.34, 0.34]} />
            <meshStandardMaterial color="#1e293b" metalness={0.75} roughness={0.38} />
          </mesh>
        </group>
      );

    case "motor":
      return (
        <group>
          <mesh position={[0, 0.34, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.32, 0.32, 0.85, 24]} />
            <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.28} />
          </mesh>
          {/* Cooling fins collar */}
          <mesh position={[0, 0.34, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.36, 0.36, 0.45, 12]} />
            <meshStandardMaterial color="#1e293b" metalness={0.75} roughness={0.48} />
          </mesh>
          {/* Mounting foot */}
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[0.72, 0.1, 0.52]} />
            <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.5} />
          </mesh>
          {/* Output shaft */}
          <mesh position={[0.58, 0.34, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.08, 0.08, 0.4, 16]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.95} roughness={0.14} />
          </mesh>
          {/* Junction box */}
          <mesh position={[-0.1, 0.68, 0]}>
            <boxGeometry args={[0.26, 0.16, 0.26]} />
            <meshStandardMaterial color={accent} metalness={0.3} roughness={0.5} />
          </mesh>
        </group>
      );

    case "servo":
      return (
        <group>
          <mesh position={[0, 0.24, 0]} castShadow>
            <boxGeometry args={[0.64, 0.44, 0.36]} />
            <meshStandardMaterial color="#1e293b" metalness={0.45} roughness={0.55} />
          </mesh>
          {/* Mounting ears */}
          <mesh position={[0, 0.32, 0]}>
            <boxGeometry args={[0.84, 0.06, 0.34]} />
            <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.45} />
          </mesh>
          {/* Spline gear horn */}
          <mesh position={[0.16, 0.52, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.12, 20]} />
            <meshStandardMaterial color="#60a5fa" metalness={0.85} roughness={0.2} />
          </mesh>
          <mesh position={[0.16, 0.61, 0.16]}>
            <boxGeometry args={[0.12, 0.05, 0.38]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      );

    case "valve":
      return (
        <group>
          <mesh position={[0, 0.28, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.22, 0.56, 20]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.88} roughness={0.24} />
          </mesh>
          <mesh position={[0, 0.28, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.12, 0.12, 0.72, 16]} />
            <meshStandardMaterial color="#64748b" metalness={0.85} roughness={0.28} />
          </mesh>
          <mesh position={[0, 0.68, 0]}>
            <boxGeometry args={[0.34, 0.3, 0.34]} />
            <meshStandardMaterial color="#ef4444" metalness={0.25} roughness={0.5} />
          </mesh>
        </group>
      );

    case "roller":
      return (
        <group>
          <mesh position={[0, 0.24, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.2, 1.6, 24]} />
            <meshStandardMaterial map={metalTex} color="#cbd5e1" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.24, -0.88]}>
            <boxGeometry args={[0.32, 0.44, 0.14]} />
            <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.45} />
          </mesh>
          <mesh position={[0, 0.24, 0.88]}>
            <boxGeometry args={[0.32, 0.44, 0.14]} />
            <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.45} />
          </mesh>
        </group>
      );

    case "sensor":
      return (
        <group>
          <mesh position={[0, 0.18, 0]}>
            <boxGeometry args={[0.32, 0.28, 0.32]} />
            <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.45} />
          </mesh>
          <mesh position={[0, 0.18, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 0.08, 20]} />
            <meshStandardMaterial color="#22d3ee" emissive="#06b6d4" emissiveIntensity={0.8} roughness={0.1} metalness={0.2} />
          </mesh>
        </group>
      );

    case "prototype":
      return (
        <group>
          <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              map={metalTex}
              color="#38bdf8"
              metalness={0.4}
              roughness={0.35}
            />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[1.03, 1.03, 1.03]} />
            <meshBasicMaterial color="#0284c7" wireframe transparent opacity={0.35} />
          </mesh>
        </group>
      );

    case "custom":
      if (node.url && node.fileExt) {
        return (
          <Suspense
            fallback={
              <mesh position={[0, 0.5, 0]}>
                <boxGeometry args={[0.8, 0.8, 0.8]} />
                <meshStandardMaterial color="#64748b" wireframe />
              </mesh>
            }
          >
            <CustomModel url={node.url} fileExt={node.fileExt} />
          </Suspense>
        );
      }
      return null;

    default:
      return null;
  }
}
