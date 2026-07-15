'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  showingLabel?: string;
  ofLabel?: string;
}

export default function Pagination({
  meta,
  onPageChange,
  showingLabel = 'Showing',
  ofLabel = 'of',
}: PaginationProps) {
  if (meta.totalPages <= 1) return null;

  const from = ((meta.page - 1) * meta.limit) + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="flex items-center justify-between px-5 py-4 border-t border-border">
      <span className="text-xs text-muted-foreground">
        {showingLabel} {from}–{to} {ofLabel} {meta.total}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, meta.page - 1))}
          disabled={meta.page <= 1}
          className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium min-w-[3rem] text-center">
          {meta.page} / {meta.totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(meta.totalPages, meta.page + 1))}
          disabled={meta.page >= meta.totalPages}
          className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
