import { useSyncExternalStore } from 'react';

export type AxisName = 'x' | 'y' | 'z';
export type MotionMode = 'static' | 'rotate' | 'oscillate' | 'translate' | 'helical';
export type AssemblyRenderMode = 'studio' | 'camera-ar' | 'vr-stereo';
export type TransformMode = 'translate' | 'rotate' | 'scale';

export interface AxisAutomation {
  mode: MotionMode;
  axis: AxisName;
  speed: number; // rad/s or cycles/s
  amplitude: number; // degrees for oscillate, meters for translate/helical
  phase: number; // radians offset
  inverted: boolean;
  enabled: boolean;
}

export interface AssemblyNode {
  id: string;
  label: string;
  type:
    | 'cnc_gantry'
    | 'robot_arm'
    | 'rotary_table'
    | 'linear_rail'
    | 'motor'
    | 'servo'
    | 'valve'
    | 'roller'
    | 'sensor'
    | 'prototype'
    | 'custom';
  parentId: string | null;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  automation: AxisAutomation;
  sensors: string[];
  suggestedPin?: string;
  url?: string;
  fileExt?: string;
  images?: string[];
}

export interface AssemblyConnection {
  id: string;
  fromId: string;
  toId: string;
}

export interface AssemblyState {
  nodes: AssemblyNode[];
  connections: AssemblyConnection[];
  selectedNodeId: string | null;
  renderMode: AssemblyRenderMode;
  transformMode: TransformMode;
  isPlaying: boolean;
  globalSpeed: number;
  showAxisGuides: boolean;
  showGridInAR: boolean;
}

const DEFAULT_AUTOMATION: AxisAutomation = {
  mode: 'static',
  axis: 'y',
  speed: 1.5,
  amplitude: 45,
  phase: 0,
  inverted: false,
  enabled: true,
};

function createPresetNodes(preset: 'arm_3dof' | 'cnc_gantry' | 'rotary_station'): {
  nodes: AssemblyNode[];
  connections: AssemblyConnection[];
} {
  if (preset === 'arm_3dof') {
    return {
      nodes: [
        {
          id: 'base-pedestal',
          label: 'Base Rotatoria (Eje Y)',
          type: 'rotary_table',
          parentId: null,
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          automation: {
            mode: 'oscillate',
            axis: 'y',
            speed: 0.9,
            amplitude: 55,
            phase: 0,
            inverted: false,
            enabled: true,
          },
          sensors: ['load', 'vibration'],
          suggestedPin: 'D3',
        },
        {
          id: 'arm-shoulder',
          label: 'Brazo Articulado (Eje Z)',
          type: 'robot_arm',
          parentId: 'base-pedestal',
          position: [0, 0.55, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          automation: {
            mode: 'oscillate',
            axis: 'z',
            speed: 1.3,
            amplitude: 22,
            phase: 0.6,
            inverted: false,
            enabled: true,
          },
          sensors: ['thermal', 'load'],
          suggestedPin: 'D5',
        },
        {
          id: 'wrist-servo',
          label: 'Servo Muñeca (Rotación Continua)',
          type: 'servo',
          parentId: 'arm-shoulder',
          position: [0.95, 1.55, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          automation: {
            mode: 'rotate',
            axis: 'x',
            speed: 2.4,
            amplitude: 360,
            phase: 0,
            inverted: false,
            enabled: true,
          },
          sensors: ['thermal'],
          suggestedPin: 'D6',
        },
      ],
      connections: [
        { id: 'conn-1', fromId: 'base-pedestal', toId: 'arm-shoulder' },
        { id: 'conn-2', fromId: 'arm-shoulder', toId: 'wrist-servo' },
      ],
    };
  }

  if (preset === 'rotary_station') {
    return {
      nodes: [
        {
          id: 'rotary-chuck',
          label: 'Mesa Indexada 360°',
          type: 'rotary_table',
          parentId: null,
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1.1, 1.1, 1.1],
          automation: {
            mode: 'rotate',
            axis: 'y',
            speed: 1.1,
            amplitude: 360,
            phase: 0,
            inverted: false,
            enabled: true,
          },
          sensors: ['load'],
          suggestedPin: 'D3',
        },
        {
          id: 'rail-feeder',
          label: 'Riel de Alimentación X',
          type: 'linear_rail',
          parentId: null,
          position: [2.4, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          automation: {
            mode: 'static',
            axis: 'x',
            speed: 1.0,
            amplitude: 1.0,
            phase: 0,
            inverted: false,
            enabled: true,
          },
          sensors: ['vibration'],
        },
        {
          id: 'actuator-pusher',
          label: 'Actuador Traslación Lineal',
          type: 'valve',
          parentId: 'rail-feeder',
          position: [0, 0.42, 0],
          rotation: [0, 0, Math.PI / 2],
          scale: [1, 1, 1],
          automation: {
            mode: 'translate',
            axis: 'x',
            speed: 1.8,
            amplitude: 1.2,
            phase: 0,
            inverted: false,
            enabled: true,
          },
          sensors: ['flow'],
          suggestedPin: 'D9',
        },
      ],
      connections: [
        { id: 'conn-r1', fromId: 'rotary-chuck', toId: 'actuator-pusher' },
      ],
    };
  }

  // Default: cnc_gantry
  return {
    nodes: [
      {
        id: 'cnc-frame',
        label: 'Pórtico Estructural CNC',
        type: 'cnc_gantry',
        parentId: null,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        automation: {
          mode: 'static',
          axis: 'z',
          speed: 1.0,
          amplitude: 1.0,
          phase: 0,
          inverted: false,
          enabled: true,
        },
        sensors: ['vibration', 'load'],
      },
      {
        id: 'spindle-carriage',
        label: 'Carro Lineal (Traslación X)',
        type: 'motor',
        parentId: 'cnc-frame',
        position: [0, 2.05, 0],
        rotation: [0, 0, Math.PI / 2],
        scale: [0.85, 0.85, 0.85],
        automation: {
          mode: 'translate',
          axis: 'x',
          speed: 1.4,
          amplitude: 1.4,
          phase: 0,
          inverted: false,
          enabled: true,
        },
        sensors: ['thermal', 'vibration'],
        suggestedPin: 'D4',
      },
      {
        id: 'rotary-head',
        label: 'Cabezal Helicoidal (Z + Rot)',
        type: 'servo',
        parentId: 'spindle-carriage',
        position: [0, -0.45, 0],
        rotation: [0, 0, 0],
        scale: [0.9, 0.9, 0.9],
        automation: {
          mode: 'helical',
          axis: 'y',
          speed: 2.2,
          amplitude: 0.45,
          phase: 0,
          inverted: false,
          enabled: true,
        },
        sensors: ['thermal'],
        suggestedPin: 'D7',
      },
    ],
    connections: [
      { id: 'conn-c1', fromId: 'cnc-frame', toId: 'spindle-carriage' },
      { id: 'conn-c2', fromId: 'spindle-carriage', toId: 'rotary-head' },
    ],
  };
}

const initialPreset = createPresetNodes('cnc_gantry');

let state: AssemblyState = {
  nodes: initialPreset.nodes,
  connections: initialPreset.connections,
  selectedNodeId: initialPreset.nodes[1]?.id || null,
  renderMode: 'studio',
  transformMode: 'translate',
  isPlaying: true,
  globalSpeed: 1,
  showAxisGuides: true,
  showGridInAR: true,
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export const assemblyStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return state;
  },
  setRenderMode(renderMode: AssemblyRenderMode) {
    state = { ...state, renderMode };
    notify();
  },
  setTransformMode(transformMode: TransformMode) {
    state = { ...state, transformMode };
    notify();
  },
  setPlaying(isPlaying: boolean) {
    state = { ...state, isPlaying };
    notify();
  },
  setGlobalSpeed(globalSpeed: number) {
    state = { ...state, globalSpeed };
    notify();
  },
  setShowAxisGuides(showAxisGuides: boolean) {
    state = { ...state, showAxisGuides };
    notify();
  },
  setShowGridInAR(showGridInAR: boolean) {
    state = { ...state, showGridInAR };
    notify();
  },
  selectNode(selectedNodeId: string | null) {
    state = { ...state, selectedNodeId };
    notify();
  },
  addNode(partial: Partial<AssemblyNode> & { type: AssemblyNode['type']; label: string }) {
    const id = partial.id || `node-${Math.random().toString(36).substring(2, 7)}`;
    const parentId = partial.parentId ?? null;
    const defaultPos: [number, number, number] = parentId
      ? [0, 0.8, 0]
      : [(Math.random() - 0.5) * 3.5, 0, (Math.random() - 0.5) * 3.5];

    const newNode: AssemblyNode = {
      id,
      label: partial.label,
      type: partial.type,
      parentId,
      position: partial.position || defaultPos,
      rotation: partial.rotation || [0, 0, 0],
      scale: partial.scale || [1, 1, 1],
      automation: partial.automation ? { ...partial.automation } : { ...DEFAULT_AUTOMATION },
      sensors: partial.sensors || [],
      suggestedPin: partial.suggestedPin,
      url: partial.url,
      fileExt: partial.fileExt,
      images: partial.images,
    };

    state = {
      ...state,
      nodes: [...state.nodes, newNode],
      selectedNodeId: newNode.id,
    };
    notify();
    return newNode;
  },
  updateNode(id: string, patch: Partial<AssemblyNode>) {
    state = {
      ...state,
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    };
    notify();
  },
  updateNodeAutomation(id: string, automationPatch: Partial<AxisAutomation>) {
    state = {
      ...state,
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, automation: { ...n.automation, ...automationPatch } } : n,
      ),
    };
    notify();
  },
  removeNode(id: string) {
    // Reparent children to null before removing
    const filtered = state.nodes
      .filter((n) => n.id !== id)
      .map((n) => (n.parentId === id ? { ...n, parentId: null } : n));
    state = {
      ...state,
      nodes: filtered,
      connections: state.connections.filter((c) => c.fromId !== id && c.toId !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    };
    notify();
  },
  addConnection(fromId: string, toId: string) {
    if (fromId === toId) return;
    const exists = state.connections.some(
      (c) => (c.fromId === fromId && c.toId === toId) || (c.fromId === toId && c.toId === fromId),
    );
    if (exists) return;
    state = {
      ...state,
      connections: [
        ...state.connections,
        { id: `conn-${Math.random().toString(36).substring(2, 7)}`, fromId, toId },
      ],
    };
    notify();
  },
  removeConnection(id: string) {
    state = {
      ...state,
      connections: state.connections.filter((c) => c.id !== id),
    };
    notify();
  },
  loadPreset(preset: 'arm_3dof' | 'cnc_gantry' | 'rotary_station') {
    const data = createPresetNodes(preset);
    state = {
      ...state,
      nodes: data.nodes,
      connections: data.connections,
      selectedNodeId: data.nodes[1]?.id || data.nodes[0]?.id || null,
      isPlaying: true,
    };
    notify();
  },
  clearAll() {
    state = {
      ...state,
      nodes: [],
      connections: [],
      selectedNodeId: null,
    };
    notify();
  },
};

export function useAssemblyStore() {
  return useSyncExternalStore(assemblyStore.subscribe, assemblyStore.getSnapshot);
}
