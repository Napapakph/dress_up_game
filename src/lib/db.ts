
const DB_NAME = 'DressUpDB';
const DB_VERSION = 2; // Incremented for schema change
const STORE_CHARACTERS = 'characters';
const STORE_ITEMS = 'items';
const STORE_SETTINGS = 'settings';

export interface CustomItem {
  id: string;
  name: string;
  image: string; // Base64 data URI
  category: string;
  layer: number;
  anchor: string;
  offset: { x: number; y: number };
  scale: number;
}

export interface CustomCharacter {
  id: string;
  name: string;
  baseImage: string; // Base64 data URI
  canvas: { width: number; height: number };
  anchors: Record<string, { x: number; y: number }>;
}

export interface BackgroundSettings {
    type: 'color' | 'image';
    value: string;
}

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_CHARACTERS)) {
        db.createObjectStore(STORE_CHARACTERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_ITEMS)) {
        db.createObjectStore(STORE_ITEMS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS); // Key-value store, no keyPath needed (we use out-of-line keys like 'background')
      }
    };
  });
};

export const saveCharacter = async (char: CustomCharacter) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_CHARACTERS, 'readwrite');
    const store = tx.objectStore(STORE_CHARACTERS);
    const req = store.put(char);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const getCharacters = async (): Promise<CustomCharacter[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHARACTERS, 'readonly');
    const store = tx.objectStore(STORE_CHARACTERS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

export const deleteCharacter = async (id: string) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_CHARACTERS, 'readwrite');
    const store = tx.objectStore(STORE_CHARACTERS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const saveItem = async (item: CustomItem) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, 'readwrite');
    const store = tx.objectStore(STORE_ITEMS);
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const getItems = async (): Promise<CustomItem[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, 'readonly');
    const store = tx.objectStore(STORE_ITEMS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

export const deleteItem = async (id: string) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, 'readwrite');
    const store = tx.objectStore(STORE_ITEMS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

// Background Settings
export const saveBackground = async (bg: BackgroundSettings) => {
    const db = await initDB();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_SETTINGS, 'readwrite');
        const store = tx.objectStore(STORE_SETTINGS);
        const req = store.put(bg, 'background');
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
};

export const getBackground = async (): Promise<BackgroundSettings | null> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_SETTINGS, 'readonly');
        const store = tx.objectStore(STORE_SETTINGS);
        const req = store.get('background');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
    });
};

// Helper for file to base64
export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};
