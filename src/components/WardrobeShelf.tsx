import React, { useState } from 'react';
import { Item } from '../lib/types';
import { Upload, X, Shirt, Scissors, Footprints, Grid, Smile, Star, Trash2, CheckSquare, Square } from 'lucide-react';

interface WardrobeShelfProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  items: Item[];
  onAdd: (item: Item) => void;
  onUpload: (item: Item) => void;
  onDeleteItems: (ids: string[]) => void;
}

const CategoryIcon = ({ category }: { category: string }) => {
    switch (category) {
        case 'top': return <Shirt size={16} />;
        case 'bottom': return <Scissors size={16} />; 
        case 'shoes': return <Footprints size={16} />;
        case 'head': return <Smile size={16} />;
        case 'accessory': return <Star size={16} />;
        case 'outer': return <Grid size={16} />;
        default: return <Grid size={16} />;
    }
};

export default function WardrobeShelf({
  categories,
  selectedCategory,
  onSelectCategory,
  items,
  onAdd,
  onUpload,
  onDeleteItems
}: WardrobeShelfProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  
  // Delete Mode State
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedToDelete, setSelectedToDelete] = useState<string[]>([]);

  const filteredItems = items.filter((i) => i.category === selectedCategory);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = () => {
    if (!uploadFile) return;
    const newItem: Item = {
      id: `custom_${Date.now()}`,
      name: uploadName || uploadFile.name.replace('.png', ''),
      image: URL.createObjectURL(uploadFile), // Note: Page.tsx will handle converting to Base64 for DB
      category: selectedCategory,
      layer: 50, 
      anchor: 'torso',
      offset: { x: 0, y: 0 },
      scale: 1.0,
    };
    onUpload(newItem);
    setUploadFile(null);
    setUploadName('');
    setIsUploadOpen(false);
  };
  
  const toggleDeleteSelect = (id: string) => {
      setSelectedToDelete(prev => 
          prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
  };

  const handleConfirmDelete = () => {
      if (confirm(`Delete ${selectedToDelete.length} items?`)) {
          onDeleteItems(selectedToDelete);
          setSelectedToDelete([]);
          setIsDeleteMode(false);
      }
  };

  return (
    <div className={`flex flex-col h-full bg-[#fff0f5] border-4 rounded-3xl overflow-hidden shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] font-medium transition-colors ${isDeleteMode ? 'border-red-300' : 'border-[#ffb6c1]'}`}>
      {/* Wardrobe Header/Tabs */}
      <div className="bg-[#ffdae0] px-2 py-3 border-b-4 border-inherit flex items-center gap-2 overflow-x-auto no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            disabled={isDeleteMode} // Disable switching categories in delete mode to avoid confusion, or allowed? Allowed is fine but clearing selection might be needed. Let's allowing it but keep selection.
            className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all transform hover:scale-105 flex-shrink-0
                ${
                  selectedCategory === cat
                    ? 'bg-white text-[#ff69b4] shadow-md ring-2 ring-[#ff69b4] ring-offset-1'
                    : 'bg-[#ffe4e1] text-[#db7093] hover:bg-white/80'
                }
                ${isDeleteMode ? 'opacity-50 grayscale' : ''}
            `}
          >
            <CategoryIcon category={cat} />
            <span className="capitalize">{cat}</span>
          </button>
        ))}
      </div>

      {/* Main Closet Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#fff0f5] relative">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ff69b4 2px, transparent 2px)', backgroundSize: '20px 20px' }} />
        
        <div className="relative z-10">
            {/* Action Bar */}
            <div className={`flex justify-between items-center mb-4 p-2 rounded-xl backdrop-blur-sm border ${isDeleteMode ? 'bg-red-50 border-red-200' : 'bg-white/60 border-white/50'}`}>
              <h3 className={`font-bold capitalize flex items-center gap-2 ${isDeleteMode ? 'text-red-500' : 'text-[#db7093]'}`}>
                {isDeleteMode ? 'Select to Remove' : <><CategoryIcon category={selectedCategory} /> {selectedCategory}</>}
              </h3>
              
              <div className="flex gap-2">
                  {!isDeleteMode ? (
                    <>
                        {/* Only show upload if not in delete mode */}
                        <button
                            onClick={() => setIsUploadOpen(!isUploadOpen)}
                            className="bg-[#87ceeb] hover:bg-[#5f9ea0] text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition-colors flex items-center gap-1"
                            >
                            <Upload size={14} /> Add
                        </button>
                        <button
                            onClick={() => setIsDeleteMode(true)}
                            className="bg-red-100 hover:bg-red-200 text-red-500 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition-colors flex items-center gap-1"
                            title="Remove Items"
                        >
                            <Trash2 size={14} />
                        </button>
                    </>
                  ) : (
                    <>
                         <button
                            onClick={() => { setIsDeleteMode(false); setSelectedToDelete([]); }}
                            className="text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-full text-xs font-bold"
                        >
                            Cancel
                        </button>
                         <button
                            onClick={handleConfirmDelete}
                            disabled={selectedToDelete.length === 0}
                            className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition-colors flex items-center gap-1"
                        >
                            Delete ({selectedToDelete.length})
                        </button>
                    </>
                  )}
              </div>
            </div>

            {/* Upload Panel - Only if not deleting */}
            {!isDeleteMode && isUploadOpen && (
              <div className="mb-4 p-4 bg-white rounded-2xl border-2 border-[#87ceeb] shadow-md animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between mb-2">
                    <span className="text-sm font-bold text-gray-600">New Item</span>
                    <button onClick={() => setIsUploadOpen(false)}><X size={16} className="text-gray-400"/></button>
                </div>
                <input type="file" accept="image/png" onChange={handleFileChange} className="block w-full text-xs mb-2 text-gray-500" />
                {uploadFile && (
                    <button onClick={handleUploadSubmit} className="w-full bg-[#87ceeb] text-white py-1 rounded-lg font-bold text-xs mt-2">
                        Upload & Wear
                    </button>
                )}
              </div>
            )}

            {/* Grid */}
            {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#ffb6c1] space-y-2">
                <Shirt size={48} className="opacity-50" />
                <p className="font-bold">Empty Shelf!</p>
            </div>
            ) : (
            <div className="grid grid-cols-3 gap-3">
                {filteredItems.map((item) => {
                    const isSelectedToDelete = selectedToDelete.includes(item.id);
                    return (
                        <div
                            key={item.id}
                            onClick={() => isDeleteMode ? toggleDeleteSelect(item.id) : onAdd(item)}
                            className={`
                                group relative aspect-square bg-white rounded-xl border-2 
                                ${isDeleteMode 
                                    ? (isSelectedToDelete ? 'border-red-500 bg-red-50' : 'border-dashed border-gray-300')
                                    : 'border-transparent hover:border-[#ff69b4] hover:shadow-lg'
                                }
                                shadow-sm transition-all cursor-pointer 
                                flex items-center justify-center overflow-hidden
                            `}
                        >
                            {!isDeleteMode && <div className="absolute inset-2 bg-gray-50 rounded-lg group-hover:bg-[#fff0f5] transition-colors" />}
                            
                            <img 
                                src={item.image} 
                                alt={item.name} 
                                className={`relative w-full h-full object-contain p-2 transition-transform duration-300 ${!isDeleteMode ? 'group-hover:scale-110' : ''}`}
                            />
                            
                            {/* "Wear" Badge on Hover */}
                            {!isDeleteMode && (
                                <div className="absolute bottom-1 bg-[#ff69b4] text-white text-[10px] px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity font-bold shadow-sm">
                                    Wear
                                </div>
                            )}

                            {/* Delete Checkbox Overlay */}
                            {isDeleteMode && (
                                <div className="absolute top-2 right-2 text-red-500">
                                    {isSelectedToDelete ? <CheckSquare size={18} fill="white" /> : <Square size={18} className="text-gray-300" />}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            )}
        </div>
      </div>
    </div>
  );
}
