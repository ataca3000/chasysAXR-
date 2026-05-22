export function generateGcode({ x, y, z = 0 }: { x: number, y: number, z?: number }) {
  return `G0 X${x} Y${y} Z${z}`;
}
