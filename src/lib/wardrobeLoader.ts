import yaml from 'js-yaml';
import { WardrobeData, Item } from './types';

export async function loadWardrobe(manifestUrl: string, basePath: string = ''): Promise<{ 
  wardrobe: WardrobeData;
  allItems: Item[];
}> {
  try {
    const res = await fetch(manifestUrl);
    if (!res.ok) {
      throw new Error(`Failed to load manifest: ${res.statusText}`);
    }
    const text = await res.text();
    const data = yaml.load(text) as WardrobeData;

    // Prepend basePath to character images
    Object.values(data.characters).forEach((char) => {
      if (char.baseImage && char.baseImage.startsWith('/')) {
        char.baseImage = `${basePath}${char.baseImage}`;
      }
    });

    // Flatten items with category and prepend basePath to item images
    const allItems: Item[] = [];
    const defaults = data.categoryDefaults || {};
    Object.entries(data.items).forEach(([category, rawItems]) => {
      const catDefaults = defaults[category] || {};
      rawItems.forEach((raw) => {
        const item: Item = {
          ...raw,
          category,
          width: raw.width ?? catDefaults.width,
          height: raw.height ?? catDefaults.height,
          scale: raw.scale ?? catDefaults.scale,
          layer: raw.layer ?? catDefaults.layer ?? 10,
          anchor: raw.anchor ?? catDefaults.anchor ?? 'torso',
          offset: raw.offset ?? catDefaults.offset ?? { x: 0, y: 0 },
        };
        if (item.image && item.image.startsWith('/')) {
          item.image = `${basePath}${item.image}`;
        }
        allItems.push(item);
      });
    });

    return { wardrobe: data, allItems };
  } catch (error) {
    console.error("Error loading wardrobe:", error);
    throw error;
  }
}
