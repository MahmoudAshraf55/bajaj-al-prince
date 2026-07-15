'use client';

import { ReactNode } from 'react';

const statusStyles: Record<string, string> = {
  pending:     'bg-amber-500/10 text-amber-400 border-amber-500/20',
  in_progress: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  completed:   'bg-green-500/10 text-green-400 border-green-500/20',
  cancelled:   'bg-red-500/10 text-red-400 border-red-500/20',
  accepted:    'bg-green-500/10 text-green-400 border-green-500/20',
  rejected:    'bg-red-500/10 text-red-400 border-red-500/20',
  draft:       'bg-amber-500/10 text-amber-400 border-amber-500/20',
  draft_inventory: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  open:        'bg-green-500/10 text-green-400 border-green-500/20',
  closed:      'bg-amber-500/10 text-amber-400 border-amber-500/20',
  locked:      'bg-red-500/10 text-red-400 border-red-500/20',
  confirmed:   'bg-green-500/10 text-green-400 border-green-500/20',
};

const fallbackStyle = 'bg-gray-500/10 text-gray-400 border-gray-500/20';

interface StatusBadgeProps {
  status: string;
  label: ReactNode;
  className?: string;
}

export default function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
  const style = statusStyles[status] || fallbackStyle;

  return (
    <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full border font-medium ${style} ${className}`}>
      {label}
    </span>
  );
}
