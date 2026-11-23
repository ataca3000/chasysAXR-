import { useEffect, useRef } from "react";
import * as THREE from "three";

export type ThermalShaderPalette = "ironbow" | "hotspot" | "arctic";

interface ARThermalHeatmapShaderProps {
  temperature: number;
  vibration?: number;
  load?: number;
  opacity?: number;
  palette?: ThermalShaderPalette;
  enabled?: boolean;
}

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;

  varying vec2 vUv;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uTempNorm;
  uniform float uVibNorm;
  uniform float uLoadNorm;
  uniform float uOpacity;
  uniform float uPalette;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      v += amp * valueNoise(p);
      p = p * 2.03 + vec2(17.1, 31.7);
      amp *= 0.5;
    }
    return v;
  }

  vec3 ironbowPalette(float t) {
    vec3 c0 = vec3(0.05, 0.06, 0.24);
    vec3 c1 = vec3(0.38, 0.05, 0.52);
    vec3 c2 = vec3(0.86, 0.14, 0.22);
    vec3 c3 = vec3(0.98, 0.58, 0.06);
    vec3 c4 = vec3(1.00, 0.96, 0.72);

    if (t < 0.25) return mix(c0, c1, t / 0.25);
    if (t < 0.55) return mix(c1, c2, (t - 0.25) / 0.30);
    if (t < 0.82) return mix(c2, c3, (t - 0.55) / 0.27);
    return mix(c3, c4, (t - 0.82) / 0.18);
  }

  vec3 arcticPalette(float t) {
    vec3 c0 = vec3(0.02, 0.08, 0.22);
    vec3 c1 = vec3(0.04, 0.38, 0.65);
    vec3 c2 = vec3(0.14, 0.82, 0.92);
    vec3 c3 = vec3(0.92, 0.98, 1.00);

    if (t < 0.33) return mix(c0, c1, t / 0.33);
    if (t < 0.72) return mix(c1, c2, (t - 0.33) / 0.39);
    return mix(c2, c3, (t - 0.72) / 0.28);
  }

  void main() {
    float aspect = uResolution.x / max(1.0, uResolution.y);
    vec2 uv = vUv;
    vec2 centered = (uv - 0.5) * vec2(aspect, 1.0);

    // Primary CNC spindle/workpiece thermal focal plume + secondary motor & bearing hotspots
    float vibJitterX = sin(uTime * (8.0 + uVibNorm * 14.0)) * (0.008 + uVibNorm * 0.02);
    float vibJitterY = cos(uTime * (6.5 + uVibNorm * 12.0)) * (0.006 + uVibNorm * 0.015);

    vec2 spindleCenter = vec2(sin(uTime * 0.45) * 0.16 + vibJitterX, 0.04 + vibJitterY);
    vec2 motorLeft = vec2(-0.42, -0.18);
    vec2 motorRight = vec2(0.40, 0.22);

    float dSpindle = length(centered - spindleCenter);
    float dMotorL = length(centered - motorLeft);
    float dMotorR = length(centered - motorRight);

    // Heat radius & intensity scale smoothly with real-time temperature telemetry
    float tempBoost = clamp(uTempNorm, 0.0, 1.0);
    float spindleSpread = mix(0.20, 0.52, tempBoost);
    float plumeSpindle = exp(-(dSpindle * dSpindle) / (spindleSpread * spindleSpread));
    float plumeMotorL = exp(-(dMotorL * dMotorL) / 0.065) * (0.35 + 0.45 * uLoadNorm);
    float plumeMotorR = exp(-(dMotorR * dMotorR) / 0.055) * (0.28 + 0.40 * tempBoost);

    // Convective heat shimmer & thermal turbulence
    vec2 flowUv = centered * (3.2 + uVibNorm * 1.5) - vec2(0.0, uTime * (0.35 + tempBoost * 0.55));
    float turb = fbm(flowUv);
    float fineNoise = valueNoise(centered * 11.0 + uTime * 0.8);

    // Combined normalized thermal field
    float field = plumeSpindle * (0.55 + 0.65 * tempBoost)
                + plumeMotorL * 0.55
                + plumeMotorR * 0.48
                + (turb - 0.35) * (0.22 + 0.32 * tempBoost)
                + (fineNoise - 0.5) * 0.06;

    // Ambient baseline shifts up slightly as machine runs hotter
    field = clamp(field + tempBoost * 0.22, 0.0, 1.0);

    // Isothermal contour rings (stepped every 12% of thermal scale)
    float contourWave = abs(fract(field * 8.0) - 0.5);
    float contourLine = 1.0 - smoothstep(0.0, 0.055, contourWave);
    float contourMask = smoothstep(0.28, 0.65, field) * contourLine * 0.28;

    // Subtle AR infrared scanline sweep
    float scanY = fract(uTime * 0.16);
    float scanBeam = exp(-abs(uv.y - scanY) * 95.0) * 0.18;

    vec3 heatColor;
    float alpha;

    if (uPalette > 1.5) {
      // Arctic Thermal
      heatColor = arcticPalette(field);
      alpha = smoothstep(0.10, 0.85, field) * uOpacity;
    } else if (uPalette > 0.5) {
      // Hotspot Isolate: transparent cool zones, bright crimson-amber hotspots above threshold
      float hotThreshold = mix(0.62, 0.32, tempBoost);
      float hotMask = smoothstep(hotThreshold, hotThreshold + 0.22, field);
      heatColor = ironbowPalette(clamp((field - hotThreshold * 0.6) * 1.45, 0.0, 1.0));
      alpha = hotMask * min(0.92, uOpacity * 1.35);
    } else {
      // Ironbow IR Overlay
      heatColor = ironbowPalette(field);
      alpha = mix(0.14, 0.82, smoothstep(0.08, 0.88, field)) * uOpacity;
    }

    // Add isothermal contours and subtle AR scan beam
    heatColor += vec3(1.0, 0.92, 0.78) * contourMask;
    heatColor += vec3(0.35, 0.85, 1.0) * scanBeam;
    alpha = clamp(alpha + contourMask * 0.4 + scanBeam * 0.45, 0.0, 0.92);

    gl_FragColor = vec4(heatColor, alpha);
  }
`;

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement("canvas");
    const gl = probeCanvas.getContext("webgl2") || probeCanvas.getContext("webgl");
    if (!gl) return true;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const rendererStr = String(gl.getParameter(param) || "");
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererStr);
  } catch {
    return false;
  }
}

export function ARThermalHeatmapShader({
  temperature,
  vibration = 1.2,
  load = 45,
  opacity = 0.68,
  palette = "ironbow",
  enabled = true,
}: ARThermalHeatmapShaderProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  const targetsRef = useRef({
    tempNorm: 0.3,
    vibNorm: 0.12,
    loadNorm: 0.45,
    opacity,
    paletteIdx: 0,
  });

  useEffect(() => {
    // Map realistic industrial temperature 20°C..1000°C -> 0..1
    const tNorm = Math.min(1, Math.max(0, (temperature - 20) / 980));
    const vNorm = Math.min(1, Math.max(0, vibration / 10));
    const lNorm = Math.min(1, Math.max(0, load / 100));
    const pIdx = palette === "hotspot" ? 1 : palette === "arctic" ? 2 : 0;

    targetsRef.current = {
      tempNorm: tNorm,
      vibNorm: vNorm,
      loadNorm: lNorm,
      opacity,
      paletteIdx: pIdx,
    };
  }, [temperature, vibration, load, opacity, palette]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container || !enabled) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isSoftwareGl,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.pointerEvents = "none";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(width, height) },
        uTempNorm: { value: targetsRef.current.tempNorm },
        uVibNorm: { value: targetsRef.current.vibNorm },
        uLoadNorm: { value: targetsRef.current.loadNorm },
        uOpacity: { value: targetsRef.current.opacity },
        uPalette: { value: targetsRef.current.paletteIdx },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    const quad = new THREE.Mesh(geometry, material);
    scene.add(quad);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(1, Math.floor(entry.contentRect.width));
      const h = Math.max(1, Math.floor(entry.contentRect.height));
      renderer.setSize(w, h, false);
      material.uniforms.uResolution.value.set(w, h);
    });
    resizeObserver.observe(container);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl.fenceSync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (st === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const targets = targetsRef.current;

      material.uniforms.uTime.value += delta;
      material.uniforms.uTempNorm.value = THREE.MathUtils.damp(
        material.uniforms.uTempNorm.value,
        targets.tempNorm,
        4.5,
        delta,
      );
      material.uniforms.uVibNorm.value = THREE.MathUtils.damp(
        material.uniforms.uVibNorm.value,
        targets.vibNorm,
        4.5,
        delta,
      );
      material.uniforms.uLoadNorm.value = THREE.MathUtils.damp(
        material.uniforms.uLoadNorm.value,
        targets.loadNorm,
        4.5,
        delta,
      );
      material.uniforms.uOpacity.value = THREE.MathUtils.damp(
        material.uniforms.uOpacity.value,
        targets.opacity,
        6.0,
        delta,
      );
      material.uniforms.uPalette.value = targets.paletteIdx;

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      tick();
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 z-20 pointer-events-none"
      aria-hidden="true"
    />
  );
}
