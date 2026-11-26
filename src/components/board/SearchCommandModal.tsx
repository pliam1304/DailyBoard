'use client';

import React, { useMemo, useState } from 'react';
import {
  Camera,
  CheckSquare,
  Mic,
  NotebookPen,
  Search,
  Wallet,
  X,
} from 'lucide-react';
import { formatShortDate } from '@/lib/date';
import { searchAcrossBoard, type SearchHit } from '@/lib/search';
import type { CatyStoreData } from '@/types/catyboard';

interface SearchCommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: CatyStoreData;
  onSelectHit: (hit: SearchHit) => void;
}

export function SearchCommandModal({
  isOpen,
  onClose,
  store,
  onSelectHit,
}: SearchCommandModalProps) {
  const [query, setQuery] = useState('');

  const hits = useMemo(
    () => searchAcrossBoard(store, query),
    [store, query]
  );

  if (!isOpen) return null;

  const iconFor = (kind: SearchHit['kind']) => {
    switch (kind) {
      case 'photo':
        return <Camera className="h-4 w-4 text-[#3a75a8]" />;
      case 'note':
        return <NotebookPen className="h-4 w-4 text-[#b57a29]" />;
      case 'reminder':
        return <CheckSquare className="h-4 w-4 text-[#3d7c57]" />;
      case 'finance':
        return <Wallet className="h-4 w-4 text-[#b95567]" />;
      case 'voice':
        return <Mic className="h-4 w-4 text-[#8d4f8f]" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/65 p-4 pt-16 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-3xl border-2 border-[#b98d61] bg-[#fbf5e9] p-4 text-[#382619] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 rounded-2xl border border-[#d5bc99] bg-white px-3 py-2">
          <Search className="h-4 w-4 text-[#7c614a]" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm ảnh, tâm thư, ghi chú, nhắc nhở, khoản chi..."
            className="flex-1 bg-transparent text-xs font-medium text-[#382619] outline-none placeholder:text-[#9c826b]"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#efe4d1] p-1 text-[#382619] hover:bg-[#e5d6bc]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-3 max-h-80 space-y-1.5 overflow-y-auto pr-1">
          {!query.trim() ? (
            <p className="py-8 text-center text-xs text-[#6b5340]">
              Gõ từ khóa (ví dụ: <em>matcha, biển, uống nước, tâm thư...</em>) để nhảy thẳng tới ngày kỷ niệm đó.
            </p>
          ) : hits.length === 0 ? (
            <p className="py-8 text-center text-xs text-[#6b5340]">
              Chưa tìm thấy mục nào khớp với “{query}”.
            </p>
          ) : (
            hits.map((hit) => (
              <button
                key={hit.id}
                type="button"
                onClick={() => {
                  onSelectHit(hit);
                  onClose();
                }}
                className="flex w-full items-start justify-between gap-3 rounded-2xl border border-[#e5d4ba] bg-white px-3 py-2.5 text-left transition hover:bg-[#f4ead8]"
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">{iconFor(hit.kind)}</div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-extrabold">
                      {hit.title}
                    </div>
                    <div className="truncate text-[11px] text-[#6b5340]">
                      {hit.snippet}
                    </div>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-[#efe4d1] px-2 py-0.5 text-[10px] font-bold text-[#4b3525]">
                  {formatShortDate(hit.entryDate)}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
