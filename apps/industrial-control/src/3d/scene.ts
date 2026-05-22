import * as THREE from "three";

export function createScene(canvas: HTMLCanvasElement) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  camera.position.set(4, 4, 7);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  const directional = new THREE.DirectionalLight(0xffffff, 0.8);
  directional.position.set(5, 10, 7);
  scene.add(ambient, directional);

  const grid = new THREE.GridHelper(12, 12, 0x3b82f6, 0x334155);
  scene.add(grid);

  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.8, 1.2),
    new THREE.MeshStandardMaterial({ color: "#0ea5e9", metalness: 0.3, roughness: 0.5 })
  );
  box.position.set(0, 0.4, 0);
  scene.add(box);

  function animate() {
    requestAnimationFrame(animate);
    box.rotation.y += 0.003;
    renderer.render(scene, camera);
  }
  animate();

  return { scene, camera, renderer };
}
