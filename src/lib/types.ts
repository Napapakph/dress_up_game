export type Anchor = {
  x: number;
  y: number;
};

export type CharacterCanvas = {
  width: number;
  height: number;
};

export type Character = {
  id: string;
  name: string;
  baseImage: string;
  canvas: CharacterCanvas;
  anchors: Record<string, Anchor>;
};

export type RawItem = {
  id: string;
  name: string;
  image: string; // URL
  layer: number;
  anchor: string; // key in Character.anchors
  offset?: { x: number; y: number };
  scale?: number;
  width?: number;
  height?: number;
};

export type Item = RawItem & {
  category: string; 
};

export type PlacedItem = Item & {
  uuid: string; // unique instance id
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export type WardrobeData = {
  version: number;
  characters: Record<string, Character>;
  categoryOrder: string[]; 
  items: Record<string, RawItem[]>;
};

export type EquippedState = Record<string, Item | null>; // Deprecated in favor of PlacedItem[] for new logic
