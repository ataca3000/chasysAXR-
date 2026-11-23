import React, { useEffect, useRef, useState } from "react";
import { createRoot, Root } from "react-dom/client";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

const _objPos = new THREE.Vector3();
const _camPos = new THREE.Vector3();
const _camDir = new THREE.Vector3();
const _deltaVec = new THREE.Vector3();

interface SafeHtmlProps {
  position?: [number, number, number] | THREE.Vector3;
  center?: boolean;
  distanceFactor?: number;
  zIndexRange?: [number, number];
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/**
 * React 19-safe replacement for @react-three/drei <Html>.
 * Defers root.unmount() to a macrotask so React never throws
 * "Attempted to synchronously unmount a root while React was already rendering".
 */
export function SafeHtml({
  position = [0, 0, 0],
  center = false,
  distanceFactor,
  zIndexRange = [100, 0],
  className,
  style,
  children,
}: SafeHtmlProps) {
  const { gl, camera, size, events } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const rootRef = useRef<Root | null>(null);
  const disposedRef = useRef(false);
  const [el] = useState(() => document.createElement("div"));

  const target = (events.connected as HTMLElement | null) || gl.domElement.parentElement;

  useEffect(() => {
    disposedRef.current = false;
    el.style.position = "absolute";
    el.style.top = "0";
    el.style.left = "0";
    el.style.pointerEvents = "none";
    el.style.transformOrigin = "0 0";
    if (className) el.className = className;

    if (target) {
      target.appendChild(el);
    }

    // Create a dedicated fresh mount node per effect lifecycle so StrictMode
    // remounts never call createRoot() on an already-rooted DOM container.
    const mountNode = document.createElement("div");
    el.appendChild(mountNode);

    const currentRoot = createRoot(mountNode);
    rootRef.current = currentRoot;

    return () => {
      disposedRef.current = true;
      if (rootRef.current === currentRoot) {
        rootRef.current = null;
      }
      if (mountNode.parentNode === el) {
        el.removeChild(mountNode);
      }
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
      window.setTimeout(() => {
        try {
          currentRoot.unmount();
        } catch {
          // Ignore unmount race on already-torn-down containers
        }
      }, 0);
    };
  }, [el, target]);

  useEffect(() => {
    if (className) el.className = className;
  }, [el, className]);

  useEffect(() => {
    const activeRoot = rootRef.current;
    if (!activeRoot || disposedRef.current) return;

    const innerStyle: React.CSSProperties = {
      position: "absolute",
      transform: center ? "translate3d(-50%, -50%, 0)" : "none",
      ...style,
    };

    queueMicrotask(() => {
      if (disposedRef.current || rootRef.current !== activeRoot) return;
      activeRoot.render(<div style={innerStyle}>{children}</div>);
    });
  }, [children, center, style]);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;

    g.updateWorldMatrix(true, false);
    camera.updateMatrixWorld();

    _objPos.setFromMatrixPosition(g.matrixWorld);
    _camPos.setFromMatrixPosition(camera.matrixWorld);
    camera.getWorldDirection(_camDir);

    _deltaVec.copy(_objPos).sub(_camPos);
    const isBehind = _deltaVec.angleTo(_camDir) > Math.PI / 2;

    if (isBehind) {
      el.style.display = "none";
      return;
    }

    el.style.display = "block";
    const dist = _objPos.distanceTo(_camPos);

    _objPos.project(camera);
    const x = _objPos.x * (size.width / 2) + size.width / 2;
    const y = -(_objPos.y * (size.height / 2)) + size.height / 2;

    let scaleStr = "";
    if (distanceFactor && camera instanceof THREE.PerspectiveCamera) {
      const fovRad = (camera.fov * Math.PI) / 180;
      const scaleFactor = distanceFactor / (2 * Math.tan(fovRad / 2) * Math.max(0.1, dist));
      scaleStr = ` scale(${Math.max(0.35, Math.min(2.5, scaleFactor)).toFixed(3)})`;
    }

    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)${scaleStr}`;

    if (camera instanceof THREE.PerspectiveCamera || camera instanceof THREE.OrthographicCamera) {
      const A = (zIndexRange[1] - zIndexRange[0]) / (camera.far - camera.near);
      const B = zIndexRange[1] - A * camera.far;
      el.style.zIndex = `${Math.max(0, Math.round(A * dist + B))}`;
    }
  });

  return <group ref={groupRef} position={position} />;
}
