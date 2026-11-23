export interface LevelCalculation {
  pitchDeg: number;
  rollDeg: number;
  totalTiltDeg: number;
  isLevel: boolean;
}

/**
 * Computes digital spirit-level tilt angles and balanced state
 * from device orientation (beta = front/back pitch, gamma = left/right roll).
 */
export function computeBubbleLevel(
  betaDeg: number | null,
  gammaDeg: number | null,
  toleranceDeg = 1.5,
): LevelCalculation {
  const pitch = betaDeg !== null && Number.isFinite(betaDeg) ? Math.max(-90, Math.min(90, betaDeg)) : 0;
  const roll = gammaDeg !== null && Number.isFinite(gammaDeg) ? Math.max(-90, Math.min(90, gammaDeg)) : 0;
  const totalTiltDeg = Number(Math.hypot(pitch, roll).toFixed(2));
  return {
    pitchDeg: Number(pitch.toFixed(1)),
    rollDeg: Number(roll.toFixed(1)),
    totalTiltDeg,
    isLevel: Math.abs(pitch) <= toleranceDeg && Math.abs(roll) <= toleranceDeg,
  };
}

/**
 * Estimates vibration magnitude in mm/s proxy from real 3-axis accelerometer delta
 * after removing standard Earth gravity (9.80665 m/s^2) when using accelerationIncludingGravity.
 */
export function computeLinearVibrationFromImu(
  ax: number,
  ay: number,
  az: number,
  includesGravity = true,
): number {
  const mag = Math.hypot(ax || 0, ay || 0, az || 0);
  const linearAccel = includesGravity ? Math.abs(mag - 9.80665) : mag;
  // Convert m/s^2 dynamic delta to industrial mm/s vibration readout
  return Number(Math.max(0, linearAccel * 1.15).toFixed(2));
}
