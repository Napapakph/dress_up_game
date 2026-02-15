'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { QRCodeCanvas } from 'qrcode.react';
import LZString from 'lz-string';
import { 
  RotateCcw, 
  Download, 
  FileText, 
  Share2, 
  Shirt, 
  AlertCircle,
  Trash2,

  Pencil,
  Image as ImageIcon
} from 'lucide-react';

import { getCharacters, getItems, saveCharacter, saveItem, deleteItem, deleteCharacter, fileToBase64, CustomCharacter, CustomItem, saveBackground, getBackground, BackgroundSettings } from '../lib/db';
import { loadWardrobe } from '../lib/wardrobeLoader';
import { WardrobeData, Item, PlacedItem } from '../lib/types';
import CharacterCanvas from '../components/CharacterCanvas';
import WardrobeShelf from '../components/WardrobeShelf';

export default function DressUpPage() {
  const [wardrobe, setWardrobe] = useState<WardrobeData | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedGender, setSelectedGender] = useState<string>('female');
  const [selectedCategory, setSelectedCategory] = useState<string>('top');
  
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>([]);
  const [background, setBackground] = useState<{ type: 'color' | 'image', value: string }>({ type: 'color', value: '#ffffff' });

  // For export logic
  const stageRef = useRef<HTMLDivElement>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [exportType, setExportType] = useState<'png' | 'pdf'>('png');


  // Load Wardrobe & URL State & DB
  useEffect(() => {
    const init = async () => {
        try {
            const { wardrobe: data, allItems } = await loadWardrobe('/manifests/wardrobe.yaml');
            
            // Load custom data from DB
            const customChars = await getCharacters();
            const customItems = await getItems();
            const savedBg = await getBackground(); // Load Saved BG

            // Merge Custom Characters
            customChars.forEach(c => {
                data.characters[c.id] = {
                    id: c.id,
                    name: c.name,
                    baseImage: c.baseImage,
                    canvas: c.canvas,
                    anchors: c.anchors
                };
            });

            setWardrobe(data);
            setItems([...allItems, ...customItems.map(i => ({
                id: i.id,
                name: i.name,
                image: i.image,
                category: i.category,
                layer: i.layer,
                anchor: i.anchor,
                offset: i.offset,
                scale: i.scale
            }))]);
            
            if (savedBg) {
                setBackground(savedBg);
            }
            
            if (data.categoryOrder.length > 0) {
              setSelectedCategory(data.categoryOrder[2] || data.categoryOrder[0]); 
            }

            // ... (URL State logic logic remains same)
            // Check URL for shared state
            if (typeof window !== 'undefined') {
              const params = new URLSearchParams(window.location.search);
              const state = params.get('s');
              if (state) {
                try {
                  const decompressed = LZString.decompressFromEncodedURIComponent(state);
                  if (decompressed) {
                    const parsed = JSON.parse(decompressed);
                    setPlacedItems(parsed);
                  }
                } catch (e) {
                  console.error('Failed to load shared state', e);
                }
              }
            }

            setLoading(false);
        } catch (err) {
            console.error(err);
            setError('Failed to load data.');
            setLoading(false);
        }
    };
    
    init();
  }, []);


  const currentCharacter = wardrobe ? wardrobe.characters[selectedGender] : null;

  // Sync share link when state changes
  const shareLink = useMemo(() => {
    if (typeof window !== 'undefined') {
       const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(placedItems));
       return `${window.location.origin}${window.location.pathname}?s=${compressed}`;
    }
    return '';
  }, [placedItems]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Handlers
  const handleSelect = (uuid: string) => {
    setSelectedId(uuid);
  };

  const handleLayerChange = (direction: 'up' | 'down') => {
    if (!selectedId) return;
    
    setPlacedItems((prev) => {
        return prev.map(item => {
            if (item.uuid === selectedId) {
                return {
                    ...item,
                    layer: Math.max(0, item.layer + (direction === 'up' ? 10 : -10))
                };
            }
            return item;
        });
    });
  };

  const handleAdd = (item: Item) => {
    if (!currentCharacter) return;

    // Determine initial position
    const anchorName = item.anchor || 'body';
    const anchor = currentCharacter.anchors[anchorName] || { x: 210, y: 320 };
    
    // Apply offset
    const startX = anchor.x + (item.offset?.x || 0);
    const startY = anchor.y + (item.offset?.y || 0);

    const newItem: PlacedItem = {
      ...item,
      uuid: crypto.randomUUID(),
      x: startX,
      y: startY,
      scale: item.scale || 1.0,
      rotation: 0
    };

    setPlacedItems((prev) => [...prev, newItem]);
    // Auto Select newly selected item
    setSelectedId(newItem.uuid); 
  };

  const handleUpdateItem = (uuid: string, data: Partial<PlacedItem>) => {
      setPlacedItems((prev) => prev.map(p => p.uuid === uuid ? { ...p, ...data } : p));
  };

  const handleRemoveItem = (uuid: string) => {
      setPlacedItems((prev) => prev.filter(p => p.uuid !== uuid));
      if (selectedId === uuid) setSelectedId(null);
  };

  const handleReset = () => {
    if (confirm('Reset all items?')) {
      setPlacedItems([]);
      setSelectedId(null);
      // Clear URL param?
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const handleAddCharacter = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const base64 = await fileToBase64(file);
          const newId = `custom_char_${Date.now()}`;
          
          const newChar: CustomCharacter = {
              id: newId,
              name: file.name.replace(/\.[^/.]+$/, "").substring(0, 10),
              baseImage: base64,
              canvas: { width: 420, height: 640 }, // Default size matching others
              anchors: {
                 head:   { x: 210, y: 120 },
                 torso:  { x: 210, y: 270 },
                 bottom: { x: 210, y: 420 },
                 feet:   { x: 210, y: 560 }
              }
          };
          
          await saveCharacter(newChar);
          
          // Update State
          setWardrobe(prev => {
              if (!prev) return null;
              return {
                  ...prev,
                  characters: {
                      ...prev.characters,
                      [newId]: {
                          id: newId,
                          name: newChar.name,
                          baseImage: newChar.baseImage,
                          canvas: newChar.canvas,
                          anchors: newChar.anchors
                      }
                  }
              };
          });
          setSelectedGender(newId);
      }
  };

  const handleUpdateCharacterImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedGender.startsWith('custom_')) return;
      
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const base64 = await fileToBase64(file);
          
          const charToUpdate = wardrobe?.characters[selectedGender];
          if (!charToUpdate) return;

          const updatedChar: CustomCharacter = {
              id: charToUpdate.id,
              name: charToUpdate.name,
              baseImage: base64,
              canvas: charToUpdate.canvas,
              anchors: charToUpdate.anchors
          };

          await saveCharacter(updatedChar);

           setWardrobe(prev => {
              if (!prev) return null;
              return {
                  ...prev,
                  characters: {
                      ...prev.characters,
                      [updatedChar.id]: {
                          ...prev.characters[updatedChar.id],
                          baseImage: base64
                      }
                  }
              };
          });
      }
  };

  const handleDeleteCharacter = async () => {
      // Logic: If custom -> Delete. If default -> Reset (Delete from DB)
      const isCustom = selectedGender.startsWith('custom_');
      const message = isCustom 
        ? 'Delete this character? This cannot be undone.' 
        : 'Reset this character to original default?';
      
      if (confirm(message)) {
          await deleteCharacter(selectedGender);
          
          if (isCustom) {
              setWardrobe(prev => {
                  if (!prev) return null;
                  const newChars = { ...prev.characters };
                  delete newChars[selectedGender];
                  return {
                      ...prev,
                      characters: newChars
                  };
              });
              setSelectedGender('female');
          } else {
              // Reload default from YAML logic? 
              // Simplest is to reload page or re-fetch wardrobe, 
              // but we can just locally revert if we had the original data. 
              // Since we don't keep "original" separate, we might need to reload.
              // OR, we just let the user reload. 
              // Better: Re-fetch manifest for just this char? 
              // Let's just reload the page for now or re-trigger load.
              window.location.reload();
          }
      }
  };
  
  const handleRenameCharacter = async () => {
       // Remove restriction
       const char = wardrobe?.characters[selectedGender];
       if (!char) return;
       
       const newName = prompt("Rename Character:", char.name);
       if (newName && newName !== char.name) {
           const updatedChar: CustomCharacter = {
              id: char.id,
              name: newName,
              baseImage: char.baseImage,
              canvas: char.canvas,
              anchors: char.anchors
           };
           await saveCharacter(updatedChar);
           
           setWardrobe(prev => {
              if (!prev) return null;
              return {
                  ...prev,
                  characters: {
                      ...prev.characters,
                      [char.id]: { ...char, name: newName }
                  }
              };
          });
       }
  };

  const handleUpload = async (newItem: Item) => {
    // Save to DB
    const dbItem: CustomItem = {
        id: newItem.id,
        name: newItem.name,
        image: newItem.image, // URL blob? No, WardrobeShelf uses createObjectURL which is temporary.
        // WardrobeShelf needs to give us the File or Base64. 
        // We need to modify WardrobeShelf or handle it here. 
        // Actually, WardrobeShelf in current code uses createObjectURL.
        // We'll fix this by asking WardrobeShelf to pass the File or Base64, OR better:
        // We update handleUpload signature to accept the file/base64?
        // Let's assume for now we change WardrobeShelf to pass base64.
        // Wait, I can't easily change the signature without changing WardrobeShelf first.
        // But I need to provide `onUpload` to WardrobeShelf.
        category: newItem.category,
        layer: newItem.layer || 50,
        anchor: newItem.anchor || 'body',
        offset: newItem.offset || {x:0,y:0},
        scale: newItem.scale || 1
    };
    
    // Check if image is blob url, if so, we can't save it easily to DB unless we fetch it.
    // Better to handle file conversion inside WardrobeShelf or pass File up.
    // Let's Fetch the blob to get base64 if needed.
    if (newItem.image.startsWith('blob:')) {
        const response = await fetch(newItem.image);
        const blob = await response.blob();
        const base64 = await fileToBase64(new File([blob], 'temp'));
        dbItem.image = base64;
    }

    await saveItem(dbItem);
    
    setItems((prev) => [...prev, { ...newItem, image: dbItem.image }]);
    handleAdd({ ...newItem, image: dbItem.image });
  };
  
  const handleDeleteCustomItem = async (ids: string[]) => {
      for (const id of ids) {
          await deleteItem(id);
      }
      setItems(prev => prev.filter(i => !ids.includes(i.id)));
  };

  // Background Handlers
  const handleBgColorChange = async (color: string) => {
      const newBg: BackgroundSettings = { type: 'color', value: color };
      setBackground(newBg);
      await saveBackground(newBg);
  };

  const handleBgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const base64 = await fileToBase64(e.target.files[0]);
          const newBg: BackgroundSettings = { type: 'image', value: base64 };
          setBackground(newBg);
          await saveBackground(newBg);
      }
  };

  // Export
  const generateExport = async (type: 'png' | 'pdf') => {
    // ... same as before
    if (!stageRef.current) return;
    
    // Deselect before export to hide highlight
    const tempSelected = selectedId;
    setSelectedId(null);
    
    // Wait a tick for render
    await new Promise(r => setTimeout(r, 50));
    
    try {
      const dataUrl = await toPng(stageRef.current, { cacheBust: true, pixelRatio: 2 });
      
      // Restore selection
      setSelectedId(tempSelected);

      setExportUrl(shareLink); 

      if (type === 'png') {
        const link = document.createElement('a');
        link.download = `medi-dressup-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
        setExportType('png');
        setShowExportModal(true);
      } else {
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });
        
        const imgProps = pdf.getImageProperties(dataUrl);
        const imgRatio = imgProps.width / imgProps.height;
        const printWidth = 180; 
        const printHeight = printWidth / imgRatio;
        
        pdf.addImage(dataUrl, 'PNG', 15, 15, printWidth, printHeight);
        pdf.save(`medi-dressup-${Date.now()}.pdf`);
        
        setExportType('pdf');
        setShowExportModal(true);
      }

    } catch (err) {
      console.error('Export failed', err);
      alert('Export failed. See console.');
    }
  };

  // Scale logic
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !wardrobe) return;
      const { clientWidth, clientHeight } = containerRef.current;
      const targetW = 420; 
      const targetH = 640;
      const scaleW = clientWidth / targetW;
      const scaleH = clientHeight / targetH;
      const newScale = Math.min(scaleW, scaleH, 1.0); 
      setScale(newScale * 0.95); 
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [wardrobe, loading]);


  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading wardrobe...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;
  if (!wardrobe) return null;

  const categories = wardrobe.categoryOrder || ['head', 'top', 'bottom', 'shoes'];

  return (
    <div className="min-h-screen flex flex-col bg-[#fff5f8] text-gray-900 font-sans selection:bg-pink-200">
      {/* Header - Title always, controls only on desktop */}
      <header className="px-4 md:px-6 py-3 flex justify-between items-center z-10 gap-4 bg-white/50 backdrop-blur-sm border-b border-pink-100 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-pink-100 rounded-full text-pink-500">
             <Shirt size={24} />
          </div>
          <h1 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" style={{ letterSpacing: '-0.5px' }}>
            DRESS UP GAME
          </h1>
        </div>
        
        {/* Desktop: Character selector */}
        <div className="hidden md:flex items-center gap-2 bg-white p-1.5 rounded-full shadow-sm border border-pink-100 overflow-x-auto max-w-none no-scrollbar">
          {Object.values(wardrobe.characters).map((char) => {
             const isCustom = char.id.startsWith('custom_');
             const isSelected = selectedGender === char.id;
             
             return (
             <div 
               key={char.id}
               className={`relative group flex items-center px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap cursor-pointer select-none ${
                 isSelected
                   ? 'bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow-md transform scale-105' 
                   : 'text-gray-400 hover:text-pink-400 hover:bg-pink-50'
               }`}
               onClick={() => setSelectedGender(char.id)}
             >
               <span>{char.name}</span>
               
               {/* Controls for Active Character */}
               {isSelected && (
                   <div className="flex items-center gap-1 ml-2 pl-2 border-l border-white/30">
                       <button 
                         onClick={(e) => { e.stopPropagation(); handleRenameCharacter(); }}
                         title="Rename"
                         className="p-1 hover:bg-white/20 rounded-full"
                       >
                           <Pencil size={12} />
                       </button>
                       <label className="p-1 hover:bg-white/20 rounded-full cursor-pointer relative" title="Change Image">
                           <ImageIcon size={12} />
                           <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleUpdateCharacterImage} onClick={e => e.stopPropagation()} />
                       </label>
                       <button 
                         onClick={(e) => { e.stopPropagation(); handleDeleteCharacter(); }}
                         title={isCustom ? "Delete Character" : "Reset to Default"}
                         className="p-1 hover:bg-red-500/20 rounded-full"
                       >
                           {isCustom ? <Trash2 size={12} /> : <RotateCcw size={12} />}
                       </button>
                   </div>
               )}
             </div>
          )})}
          <label className="cursor-pointer px-4 py-2 rounded-full text-sm font-bold text-indigo-500 hover:bg-indigo-50 border-2 border-dashed border-indigo-200 flex items-center gap-1 transition-all whitespace-nowrap relative hover:shadow-sm">
              <span className="text-lg leading-none">+</span> New
              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleAddCharacter} />
          </label>
        </div>

        {/* Desktop: Export buttons */}
        <div className="hidden md:flex gap-2">
          <button onClick={handleReset} className="p-2 text-gray-400 hover:text-pink-500 hover:bg-pink-50 rounded-full transition" title="Reset Clothing">
            <RotateCcw size={20} />
          </button>
          <div className="h-6 w-px bg-gray-200 my-auto mx-1" />
          <button onClick={() => generateExport('png')} className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-white text-indigo-500 border-2 border-indigo-100 rounded-full hover:bg-indigo-50 transition shadow-sm">
            <Download size={16} /> PNG
          </button>
          <button onClick={() => generateExport('pdf')} className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition shadow-md">
            <FileText size={16} /> PDF
          </button>
        </div>
      </header>

      {/* Mobile Bottom Toolbar - Character selector + Export */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-pink-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        {/* Row 1: Character selector */}
        <div className="flex items-center gap-2 px-3 pt-2 pb-1 overflow-x-auto no-scrollbar">
          {Object.values(wardrobe.characters).map((char) => {
             const isCustom = char.id.startsWith('custom_');
             const isSelected = selectedGender === char.id;
             return (
             <div 
               key={char.id}
               className={`relative flex items-center px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer select-none flex-shrink-0 ${
                 isSelected
                   ? 'bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow-md' 
                   : 'text-gray-400 bg-gray-100'
               }`}
               onClick={() => setSelectedGender(char.id)}
             >
               <span>{char.name}</span>
               {isSelected && (
                   <div className="flex items-center gap-0.5 ml-1.5 pl-1.5 border-l border-white/30">
                       <button onClick={(e) => { e.stopPropagation(); handleRenameCharacter(); }} className="p-0.5 hover:bg-white/20 rounded-full"><Pencil size={10} /></button>
                       <label className="p-0.5 hover:bg-white/20 rounded-full cursor-pointer relative">
                           <ImageIcon size={10} />
                           <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleUpdateCharacterImage} onClick={e => e.stopPropagation()} />
                       </label>
                       <button onClick={(e) => { e.stopPropagation(); handleDeleteCharacter(); }} className="p-0.5 hover:bg-red-500/20 rounded-full">
                           {isCustom ? <Trash2 size={10} /> : <RotateCcw size={10} />}
                       </button>
                   </div>
               )}
             </div>
          )})}
          <label className="cursor-pointer px-3 py-1.5 rounded-full text-xs font-bold text-indigo-500 border border-dashed border-indigo-200 flex items-center gap-0.5 flex-shrink-0 relative">
              <span className="text-sm leading-none">+</span>
              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleAddCharacter} />
          </label>
        </div>
        {/* Row 2: Actions */}
        <div className="flex items-center justify-center gap-3 px-3 pb-2 pt-1">
          <button onClick={handleReset} className="p-1.5 text-gray-400 hover:text-pink-500 rounded-full transition" title="Reset">
            <RotateCcw size={16} />
          </button>
          <div className="h-4 w-px bg-gray-200" />
          <button onClick={() => generateExport('png')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white text-indigo-500 border border-indigo-100 rounded-full shadow-sm">
            <Download size={14} /> PNG
          </button>
          <button onClick={() => generateExport('pdf')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-indigo-500 text-white rounded-full shadow-sm">
            <FileText size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <main className="flex-1 flex flex-col md:flex-row overflow-auto md:overflow-hidden relative p-0 md:p-4 gap-0 md:gap-6 items-center justify-start md:justify-center">
        
        {/* Left: Wardrobe Shelf - Floating Overlay on Mobile, Panel on Desktop */}
        <section className="absolute inset-0 z-20 pointer-events-none md:static md:pointer-events-auto md:w-[320px] lg:w-[380px] md:h-[85vh] order-2 md:order-1 flex-shrink-0">
          <WardrobeShelf 
             categories={categories}
             selectedCategory={selectedCategory}
             onSelectCategory={setSelectedCategory}
             items={items}
             onAdd={handleAdd}
             onUpload={handleUpload}
             onDeleteItems={handleDeleteCustomItem}
          />
        </section>

        {/* Center: Stage */}
        <section className="relative w-full min-h-[70vh] md:min-h-0 md:flex-1 md:h-[85vh] flex items-start md:items-center justify-center order-1 md:order-2 bg-gray-50 md:bg-transparent overflow-auto md:overflow-hidden pb-36 md:pb-0">
           <div 
             className="relative w-full h-full md:max-w-[500px] flex items-center justify-center md:rounded-3xl overflow-hidden shadow-none md:shadow-2xl transition-all"
             style={{ 
                 background: background.type === 'color' ? background.value : `url(${background.value}) center/cover no-repeat`
             }}
           >
                {/* Character Canvas */}
                <CharacterCanvas 
                    ref={stageRef}
                    character={currentCharacter}
                    items={placedItems}
                    onUpdate={handleUpdateItem}
                    onRemove={handleRemoveItem}
                    onSelect={handleSelect}
                    selectedId={selectedId}
                    scale={scale}
                />
           </div>
        </section>

        {/* Background Tools - Bottom bar on mobile, Right sidebar on desktop */}
        <section className="absolute bottom-20 left-0 right-0 z-20 pointer-events-auto md:bottom-0 md:static md:w-[200px] md:h-[85vh] md:order-3 md:flex-shrink-0">
             {/* Mobile: Compact bottom bar */}
             <div className="flex md:hidden items-center gap-3 bg-white/90 backdrop-blur-md px-4 py-3 border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
                 <ImageIcon size={16} className="text-gray-500 flex-shrink-0" />
                 <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1">
                     {['#ffffff', '#fff0f5', '#e6e6fa', '#f0f8ff', '#f5f5dc', '#000000'].map(c => (
                         <button 
                            key={c}
                            onClick={() => handleBgColorChange(c)}
                            className={`w-7 h-7 rounded-full border-2 flex-shrink-0 ${background.value === c ? 'border-pink-500 scale-110' : 'border-gray-200'} shadow-sm transition-all`}
                            style={{ backgroundColor: c }}
                         />
                     ))}
                     <label className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-pink-400 bg-white flex-shrink-0 relative">
                         <span className="text-xs text-gray-400">+</span>
                         <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleBgColorChange(e.target.value)} />
                     </label>
                 </div>
                 <label className="flex-shrink-0 bg-indigo-50 text-indigo-500 px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer hover:bg-indigo-100 transition-colors">
                     📷
                     <input type="file" accept="image/*" className="hidden" onChange={handleBgImageUpload} />
                 </label>
             </div>

             {/* Desktop: Full sidebar panel */}
             <div className="hidden md:flex bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-white shadow-lg flex-col gap-4 h-full overflow-y-auto">
                 <h3 className="font-bold text-gray-700 flex items-center gap-2"><ImageIcon size={18}/> Background</h3>
                 
                 <div className="space-y-2">
                     <p className="text-xs font-bold text-gray-500 uppercase">Color</p>
                     <div className="flex flex-wrap gap-2">
                         {['#ffffff', '#fff0f5', '#e6e6fa', '#f0f8ff', '#f5f5dc', '#000000'].map(c => (
                             <button 
                                key={c}
                                onClick={() => handleBgColorChange(c)}
                                className={`w-8 h-8 rounded-full border-2 ${background.value === c ? 'border-pink-500 scale-110' : 'border-gray-200'} shadow-sm transition-all`}
                                style={{ backgroundColor: c }}
                                title={c}
                             />
                         ))}
                         <label className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-pink-400 bg-white">
                             <span className="text-xs text-gray-400">+</span>
                             <input type="color" className="absolute opacity-0 w-8 h-8 cursor-pointer" onChange={(e) => handleBgColorChange(e.target.value)} />
                         </label>
                     </div>
                 </div>

                 <div className="space-y-2">
                     <p className="text-xs font-bold text-gray-500 uppercase">Image</p>
                     <label className="block w-full text-center p-3 border-2 border-dashed border-indigo-200 rounded-xl cursor-pointer hover:bg-indigo-50 transition-colors text-indigo-500 text-xs font-bold focus-within:ring-2 focus-within:ring-indigo-300">
                         Upload Image
                         <input type="file" accept="image/*" className="hidden" onChange={handleBgImageUpload} />
                     </label>
                 </div>
             </div>
        </section>

        {/* Layer Controls - Fixed bottom on mobile (above bottom bars), Right side on desktop */}
        {selectedId && (
            <div className="fixed z-30 bg-white/90 backdrop-blur-sm border border-indigo-100 shadow-lg flex items-center justify-center
                          bottom-[140px] left-1/2 -translate-x-1/2 flex-row gap-4 p-2 rounded-full w-auto
                          md:absolute md:bottom-auto md:left-auto md:top-1/2 md:right-4 md:-translate-y-1/2 md:translate-x-0 md:flex-col md:gap-2 md:p-3 md:rounded-lg">
                <span className="text-[10px] font-bold text-gray-400 mb-0 md:mb-1 hidden md:block">LAYER</span>
                <button onMouseDown={() => handleLayerChange('up')} className="p-2 bg-indigo-50 text-indigo-500 rounded-full md:rounded hover:bg-indigo-100 transition shadow-sm" title="Bring Forward">▲</button>
                <div className="w-px h-4 bg-gray-300 md:hidden"></div>
                <button onMouseDown={() => handleLayerChange('down')} className="p-2 bg-indigo-50 text-indigo-500 rounded-full md:rounded hover:bg-indigo-100 transition shadow-sm" title="Send Backward">▼</button>
            </div>
        )}

      </main>

      {/* Export Modal */}
      {showExportModal && exportUrl && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Share2 className="text-indigo-600" /> 
              {exportType === 'png' ? 'Image Downloaded!' : 'PDF Downloaded!'}
            </h3>
            
            <ExportModalContent exportUrl={exportUrl} />
            
            <div className="flex gap-2 mt-6">
               <button 
                 onClick={() => setShowExportModal(false)}
                 className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 font-medium transition"
               >
                 Close
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component to handle IP replacement logic cleanly
const ExportModalContent = ({ exportUrl }: { exportUrl: string }) => {
    const [localIp, setLocalIp] = useState('');
    const isLocalhost = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    const qrValue = useMemo(() => {
        if (isLocalhost && localIp) {
            return exportUrl.replace('localhost', localIp).replace('127.0.0.1', localIp);
        }
        return exportUrl;
    }, [exportUrl, isLocalhost, localIp]);

    const isTooLong = qrValue.length > 2000;

    return (
        <div className="flex flex-col items-center">
             <div className="bg-white p-2 rounded border border-gray-100 shadow-sm mb-4">
               <QRCodeCanvas 
                 value={isTooLong ? window.location.href : qrValue} 
                 size={200}
                 level={'L'}
                 includeMargin
               />
            </div>

            {isLocalhost && (
                <div className="w-full mb-4bg-orange-50 p-3 rounded-lg border border-orange-100 text-sm mb-2">
                    <p className="text-orange-800 font-bold mb-1 flex items-center gap-1">
                        <AlertCircle size={14}/> Mobile Connection Fix
                    </p>
                    <p className="text-orange-600 text-xs mb-2">
                        &quot;localhost&quot; won&apos;t work on your phone. Enter your computer&apos;s IP (e.g. 192.168.1.x) to fix the QR code.
                    </p>
                    <input 
                        type="text" 
                        placeholder="e.g. 192.168.1.35"
                        value={localIp}
                        onChange={(e) => setLocalIp(e.target.value)}
                        className="w-full text-xs p-2 border border-orange-200 rounded focus:ring-1 focus:ring-orange-400 outline-none bg-orange-50/50"
                    />
                </div>
            )}

            {isTooLong ? (
               <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-700 text-xs rounded mb-4 w-full">
                 <AlertCircle size={16} />
                 <span>Link too long for QR. Showing current page URL instead.</span>
               </div>
            ) : (
                <p className="text-xs text-center text-gray-500">
                    Scan to open this look on your mobile device!
                </p>
            )}
        </div>
    );
};
