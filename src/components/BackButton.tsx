import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  fallback?: string;
  label?: string;
}

export default function BackButton({ fallback = '/', label }: BackButtonProps) {
  const router = useRouter();
  const handleBack = () => {
    // If there is history to go back to, use router.back(), else navigate to fallback
    if (typeof window !== 'undefined' && window.history.length > 2) {
      router.back();
    } else {
      router.push(fallback);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
    >
      <ArrowLeft className="w-4 h-4" />
      {label ?? 'Back'}
    </button>
  );
}
