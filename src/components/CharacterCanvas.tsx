import React, { useMemo, useRef } from 'react';
// @ts-ignore
import Draggable from 'react-draggable';
import { Character, PlacedItem } from '../lib/types';
import { X } from 'lucide-react';

interface CharacterCanvasProps {
  character: Character | null;
  items: PlacedItem[];
  onUpdate: (uuid: string, data: Partial<PlacedItem>) => void;
  onRemove: (uuid: string) => void;
  onSelect?: (uuid: string) => void;
  onDeselect?: () => void;
  selectedId?: string | null;
  className?: string;
  scale?: number;
}

// Sub-component to manage nodeRef for Draggable (required for React 18/19 strict mode)
const DraggableItem = ({ 
    item, 
    onUpdate, 
    onRemove,
    onSelect,
    isSelected,
    scale = 1
}: { 
    item: PlacedItem; 
    onUpdate: (uuid: string, data: Partial<PlacedItem>) => void; 
    onRemove: (uuid: string) => void;
    onSelect?: (uuid: string) => void;
    isSelected?: boolean;
    scale?: number;
}) => {
    const nodeRef = useRef<HTMLDivElement>(null);
    const startScaleRef = useRef<number>(1);
    const startPosRef = useRef<{x: number, y: number} | null>(null);

    const handleRotateStart = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        e.preventDefault();
        
        if (!nodeRef.current) return;
        
        const rect = nodeRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const startRotation = item.rotation || 0;
        
        const getAngle = (clientX: number, clientY: number) => {
            const dx = clientX - centerX;
            const dy = clientY - centerY;
            return Math.atan2(dy, dx) * (180 / Math.PI);
        };

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const startAngle = getAngle(clientX, clientY);

        const handleMouseMove = (moveEvent: MouseEvent | TouchEvent) => {
            const moveX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const moveY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
            
            const currentAngle = getAngle(moveX, moveY);
            const deltaAngle = currentAngle - startAngle;
            
            onUpdate(item.uuid, { rotation: startRotation + deltaAngle });
        };
        
        const handleMouseUp = () => {
             window.removeEventListener('mousemove', handleMouseMove);
             window.removeEventListener('mouseup', handleMouseUp);
             window.removeEventListener('touchmove', handleMouseMove);
             window.removeEventListener('touchend', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchmove', handleMouseMove);
        window.addEventListener('touchend', handleMouseUp);
    };

    const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation(); // Prevent drag
        e.preventDefault();
        
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        
        startScaleRef.current = item.scale || 1;
        startPosRef.current = { x: clientX, y: clientY };
        
        const handleMouseMove = (moveEvent: MouseEvent | TouchEvent) => {
            if (!startPosRef.current) return;
            
            const moveX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
            // For resizing, we just take distance from start point
            const deltaX = moveX - startPosRef.current.x;
            
            // Sensitivity factor
            const newScale = Math.max(0.1, startScaleRef.current + (deltaX * 0.01));
            
            onUpdate(item.uuid, { scale: newScale });
        };
        
        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('touchend', handleMouseUp);
            startPosRef.current = null;
        };
        
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchmove', handleMouseMove);
        window.addEventListener('touchend', handleMouseUp);
    };



    return (
        <Draggable
            nodeRef={nodeRef}
            key={item.uuid}
            defaultPosition={{ x: item.x, y: item.y }}
            onStop={(_e: any, data: any) => {
                onUpdate(item.uuid, { x: data.x, y: data.y });
            }}
            onStart={() => {
                if (onSelect) onSelect(item.uuid);
            }}
            scale={scale} 
        >
            <div 
                ref={nodeRef}
                className="absolute cursor-move"
                style={{ 
                    zIndex: item.layer,
                    left: 0, 
                    top: 0,
                    width: 0, 
                    height: 0 
                }}
                onMouseDown={(e) => {
                    e.stopPropagation();
                    if (onSelect) onSelect(item.uuid);
                }}
                onTouchStart={(e) => {
                    e.stopPropagation();
                    if (onSelect) onSelect(item.uuid);
                }}
            >
                {/* Visual Wrapper: Handles Frame Size & Scaling */}
                <div 
                    className={`relative group rounded-sm ${item.width ? '' : 'inline-flex leading-none'} 
                        ${isSelected ? 'ring-2 ring-indigo-500 ring-dashed' : 'hover:ring-1 hover:ring-indigo-400 hover:ring-dashed'}`}
                    style={{
                        transform: `translate(-50%, -50%) scale(${item.scale}) rotate(${item.rotation || 0}deg)`,
                        width: item.width ? `${item.width}px` : undefined,
                        height: item.height ? `${item.height}px` : undefined,
                        display: item.width ? 'flex' : undefined,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <img
                        src={item.image}
                        alt={item.name}
                        className="pointer-events-none select-none block"
                        style={{
                            maxWidth: 'none', 
                            maxHeight: 'none',
                            width: item.width ? '100%' : 'auto', 
                            height: item.height ? '100%' : 'auto',
                            objectFit: (item.width || item.height) ? 'contain' : undefined,
                        }}
                        draggable={false} 
                    />
                    
                    {/* Remove Button */}
                    <button
                        className={`absolute -top-5 -right-5 bg-red-500 text-white rounded-full p-1 
                            transition-opacity transform hover:scale-110 shadow-sm z-50 pointer-events-auto
                            ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                        `}
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove(item.uuid);
                        }}
                        onTouchEnd={(e) => {
                            e.stopPropagation(); 
                            onRemove(item.uuid);
                        }}
                    >
                        <X size={14} />
                    </button>

                     {/* Resize Handles (Corners) & Rotation - Visible on hover and selected */}
                     <div className={`transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            {/* Rotation Handle (Top Center) */}
                            <div 
                                className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-2 border-indigo-500 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing z-50 shadow-sm pointer-events-auto"
                                onMouseDown={handleRotateStart}
                                onTouchStart={handleRotateStart}
                            >
                                <div className="w-1 h-3 bg-indigo-500 rounded-full" />
                            </div>
                            {/* Connector line for rotation */}
                            <div className="absolute -top-4 left-1/2 w-0.5 h-4 bg-indigo-500 -translate-x-1/2" />

                            {/* Resize Handles */}
                            {['top-left', 'bottom-left', 'bottom-right'].map((pos) => (
                                <div
                                    key={pos}
                                    className={`absolute w-3 h-3 bg-white border-2 border-indigo-500 rounded-full z-50 pointer-events-auto
                                        ${pos === 'top-left' ? '-top-1.5 -left-1.5 cursor-nw-resize' : ''}
                                        ${pos === 'bottom-left' ? '-bottom-1.5 -left-1.5 cursor-sw-resize' : ''}
                                        ${pos === 'bottom-right' ? '-bottom-1.5 -right-1.5 cursor-se-resize' : ''}
                                    `}
                                    onMouseDown={handleResizeStart}
                                    onTouchStart={handleResizeStart}
                                />
                            ))}
                     </div>
                </div>
            </div>
        </Draggable>
    );
};

const CharacterCanvas = React.forwardRef<HTMLDivElement, CharacterCanvasProps>(
  ({ character, items, onUpdate, onRemove, onSelect, onDeselect, selectedId, className, scale = 1 }, ref) => {
    
    // Sort items by layer
    const sortedItems = useMemo(() => {
      // Create a new array to sort, avoiding mutation of props
      return [...items].sort((a, b) => (a.layer || 0) - (b.layer || 0));
    }, [items]);

    if (!character) {
        return <div className="w-full h-full flex items-center justify-center text-gray-400">Select a character</div>;
    }

    const { width, height } = character.canvas;

    return (
      <div 
        ref={ref}
        className={`relative shadow-xl rounded-lg overflow-hidden mx-auto ${className}`}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor: 'transparent',
        }}
        onMouseDown={() => { if (onDeselect) onDeselect(); }}
        onTouchStart={() => { if (onDeselect) onDeselect(); }}
      >
        {/* Base Character */}
        <img 
          src={character.baseImage} 
          alt={character.name || 'Character'} 
          className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none select-none"
        />

        {/* Draggable Items */}
        {sortedItems.map((item) => (
            <DraggableItem 
                key={item.uuid} 
                item={item} 
                onUpdate={onUpdate} 
                onRemove={onRemove}
                onSelect={onSelect}
                isSelected={selectedId === item.uuid} 
                scale={scale}
            />
        ))}
      </div>
    );
  }
);

CharacterCanvas.displayName = 'CharacterCanvas';

export default CharacterCanvas;
