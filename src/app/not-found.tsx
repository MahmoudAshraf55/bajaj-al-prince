import Link from 'next/link';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found | El Prince Bajaj',
};

export default async function NotFound() {
  const cookieStore = await cookies();
  const isAr = cookieStore.get('el-prince-lang')?.value === 'ar';

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-black gradient-text">404</h1>
        <h2 className="text-2xl font-bold">{isAr ? 'الصفحة غير موجودة' : 'Page Not Found'}</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          {isAr ? 'الصفحة التي تبحث عنها غير موجودة أو تم نقلها.' : 'The page you are looking for does not exist or has been moved.'}
        </p>
        <Link
          href="/"
          className="inline-flex px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all"
        >
          {isAr ? 'العودة للرئيسية' : 'Go Home'}
        </Link>
      </div>
    </div>
  );
}
