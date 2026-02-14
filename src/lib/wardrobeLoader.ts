import yaml from 'js-yaml';
import { WardrobeData, Item, RawItem } from './types';

export async function loadWardrobe(manifestUrl: string): Promise<{ 
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

    // Flatten items with category
    const allItems: Item[] = [];
    Object.entries(data.items).forEach(([category, rawItems]) => {
      rawItems.forEach((raw) => {
        allItems.push({
          ...raw,
          category,
        });
      });
    });

    return { wardrobe: data, allItems };
  } catch (error) {
    console.error("Error loading wardrobe:", error);
    throw error;
  }
}
