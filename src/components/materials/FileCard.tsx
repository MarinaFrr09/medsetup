'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Image as ImageIcon, File, FileAudio, FileVideo, MoreVertical, Edit2, Trash2, Copy, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

type FileType = {
  id: string;
  name: string;
  size: string;
  date: string;
  subject?: string;
  type: string;
};

export function FileCard({ file, viewMode }: { file: FileType; viewMode: 'grid' | 'list' }) {
  const [showMenu, setShowMenu] = useState(false);

  const getIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="text-red-500" />;
      case 'image': return <ImageIcon className="text-blue-500" />;
      case 'audio': return <FileAudio className="text-yellow-500" />;
      case 'video': return <FileVideo className="text-purple-500" />;
      default: return <File className="text-gray-500" />;
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  if (viewMode === 'list') {
    return (
      <motion.div variants={itemVariants} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors group relative">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="p-2 bg-muted rounded-lg shrink-0">
            {getIcon(file.type)}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-sm truncate">{file.name}</h4>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              <span>{file.size}</span>
              <span>•</span>
              <span>{file.date}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 shrink-0 pl-4">
          <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            {file.subject}
          </span>
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              onBlur={() => setTimeout(() => setShowMenu(false), 200)}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
            >
              <MoreVertical size={16} />
            </button>
            <ContextMenu show={showMenu} />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={itemVariants} className="relative group border rounded-xl bg-card overflow-hidden hover:shadow-md transition-all hover:border-primary/30">
      <div className="aspect-[4/3] bg-muted/30 flex items-center justify-center p-6 relative">
        <div className="transform group-hover:scale-110 transition-transform duration-300">
          {getIcon(file.type)}
        </div>
        <div className="absolute top-2 right-2">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            onBlur={() => setTimeout(() => setShowMenu(false), 200)}
            className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm shadow-sm hover:bg-background text-muted-foreground transition-colors"
          >
            <MoreVertical size={16} />
          </button>
          <ContextMenu show={showMenu} align="right" />
        </div>
      </div>
      <div className="p-4">
        <div className="mb-2">
          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary uppercase tracking-wider">
            {file.subject}
          </span>
        </div>
        <h4 className="font-medium text-sm truncate mb-1" title={file.name}>{file.name}</h4>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{file.size}</span>
          <span>{file.date}</span>
        </div>
      </div>
    </motion.div>
  );
}

function ContextMenu({ show, align = 'left' }: { show: boolean, align?: 'left' | 'right' }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "absolute top-full mt-1 w-48 rounded-md bg-popover border shadow-md py-1 z-50",
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted transition-colors">
            <Download size={14} className="text-muted-foreground" /> Baixar
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted transition-colors">
            <Edit2 size={14} className="text-muted-foreground" /> Renomear
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted transition-colors">
            <Copy size={14} className="text-muted-foreground" /> Copiar Link
          </button>
          <div className="h-px bg-border my-1" />
          <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-red-500/10 text-red-500 transition-colors">
            <Trash2 size={14} /> Excluir
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
