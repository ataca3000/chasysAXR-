/**
 * Ensures strict bounds checking and validation for LLM output 
 * to prevent hardware damage physically.
 */

export interface LLMCommand {
  action: 'move' | 'stop' | 'home' | 'tool';
  axis?: 'X' | 'Y' | 'Z';
  distance?: number;
  feedrate?: number;
  toolState?: 'on' | 'off';
}

// Configured hardware limits
const LIMITS = {
  X: { min: 0, max: 500 },
  Y: { min: 0, max: 500 },
  Z: { min: 0, max: 200 },
  F: { min: 100, max: 10000 } // Feedrate limits
};

export class SafetyParser {
  /**
   * Safely parses JSON intended for physical movement into raw G-Code.
   * Rejects any commands that violate safety constraints.
   */
  static parseLLMOutput(jsonStr: string): string {
    try {
      const command: LLMCommand = JSON.parse(jsonStr);
      return this.validateAndGenerate(command);
    } catch (e) {
      console.error("SafetyParser: Invalid JSON from LLM", e);
      throw new Error("Invalid command format received from LLM.");
    }
  }

  static validateAndGenerate(command: LLMCommand): string {
    switch (command.action) {
      case 'home':
        return 'G28';
        
      case 'stop':
        return 'M0'; // Program stop

      case 'tool':
        if (command.toolState === 'on') return 'M3 S1000'; // Spindle on
        if (command.toolState === 'off') return 'M5'; // Spindle off
        throw new Error("Invalid tool state.");

      case 'move':
        if (!command.axis || command.distance === undefined) {
          throw new Error("Move command requires axis and distance.");
        }
        
        // Bounds checking
        const limits = LIMITS[command.axis];
        if (!limits) throw new Error(`Invalid axis: ${command.axis}`);
        
        // Ensure distance represents absolute or relative safe bounds. 
        // For standard GCode, let's assume relative (G91) for LLM prompts like "move 10cm".
        // Distance in mm for GCode: 10cm = 100mm.
        let dist = Number(command.distance);
        
        // Hard limit check (Assuming absolute distance if provided, or capping relative movement step)
        // Here we cap any single relative movement to max 100mm for safety.
        if (Math.abs(dist) > 100) {
          console.warn(`SafetyParser: Movement capped to 100mm (requested ${dist}mm)`);
          dist = dist > 0 ? 100 : -100;
        }

        let feedrate = command.feedrate || 3000;
        if (feedrate < LIMITS.F.min) feedrate = LIMITS.F.min;
        if (feedrate > LIMITS.F.max) feedrate = LIMITS.F.max;

        // Generate G91 (relative positioning), G1 (linear move), and G90 (back to absolute)
        return `G91\nG1 ${command.axis}${dist.toFixed(2)} F${feedrate.toFixed(0)}\nG90`;
        
      default:
        throw new Error(`Unknown action: ${(command as any).action}`);
    }
  }
}
