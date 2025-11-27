
import React, { useRef } from 'react';
import Draggable from 'react-draggable';
import { X } from 'lucide-react';

interface DraggableWindowProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  defaultPosition?: { x: number, y: number };
  width?: number;
  height?: number;
}

const DraggableWindow: React.FC<DraggableWindowProps> = ({ title, isOpen, onClose, icon, children, className, defaultPosition, width = 350, height = 500 }) => {
  const nodeRef = useRef(null);
  
  if (!isOpen) return null;

  return (
    <Draggable handle=".window-header" nodeRef={nodeRef} defaultPosition={defaultPosition || {x: 100, y: 100}}>
      <div 
        ref={nodeRef} 
        className={`absolute z-40 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl flex flex-col overflow-hidden ${className}`} 
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        <div className="window-header bg-slate-800 p-2 flex items-center justify-between cursor-move border-b border-slate-700 select-none hover:bg-slate-750 transition-colors">
          <div className="flex items-center gap-2 text-slate-200 font-medium text-sm">
            {icon}
            <span>{title}</span>
          </div>
          <div className="flex items-center gap-1">
            <button 
                onClick={(e) => { e.stopPropagation(); onClose(); }} 
                className="p-1 hover:bg-red-900/50 hover:text-red-200 rounded text-slate-400 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-slate-900/95 custom-scrollbar relative">
          {children}
        </div>
      </div>
    </Draggable>
  );
};

export default DraggableWindow;
