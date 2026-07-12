'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isAr, setIsAr] = useState(false);

  useEffect(() => {
    console.error(error);
    const match = document.cookie.match(/el-prince-lang=([^;]+)/);
    setIsAr(match?.[1] === 'ar');
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-black gradient-text">500</h1>
        <h2 className="text-2xl font-bold">{isAr ? 'حدث خطأ ما' : 'Something went wrong'}</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          {isAr ? 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى أو العودة للصفحة الرئيسية.' : 'We encountered an unexpected error. Please try again or return to the homepage.'}
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all"
          >
            {isAr ? 'حاول مرة أخرى' : 'Try Again'}
          </button>
          <Link
            href="/"
            className="px-6 py-3 border border-border rounded-xl font-semibold hover:bg-white/5 transition-all"
          >
            {isAr ? 'العودة للرئيسية' : 'Go Home'}
          </Link>
        </div>
      </div>
    </div>
  );
}
