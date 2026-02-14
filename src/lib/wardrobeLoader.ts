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
    Object.entries(data.items).forEach(([category, rawItems]) => {
      rawItems.forEach((raw) => {
        const item: Item = {
          ...raw,
          category,
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
