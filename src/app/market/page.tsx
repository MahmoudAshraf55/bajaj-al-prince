import { prisma } from '@/lib/prisma';
import { Metadata } from 'next';
import MarketClient from './market-client';

export const metadata: Metadata = {
  title: 'Market | El Prince Bajaj — Spare Parts & Accessories',
  description: 'Browse our catalog of Bajaj motorcycle spare parts, accessories, and motorcycles. Genuine parts at competitive prices.',
  alternates: { canonical: '/market' },
  openGraph: {
    title: 'Market | El Prince Bajaj',
    description: 'Browse our catalog of Bajaj motorcycle spare parts, accessories, and motorcycles.',
  },
};

export const dynamic = 'force-dynamic';

export default async function MarketPage() {
  const products = await prisma.product.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      name: true,
      nameAr: true,
      category: true,
      price: true,
      stock: true,
      image: true,
      description: true,
      available: true,
    },
    orderBy: { name: 'asc' },
  });

  const serialized = products.map((p) => ({
    ...p,
    price: Number(p.price),
  }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: serialized.slice(0, 20).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.name,
      url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/market/${p.id}/`,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketClient products={serialized} />
    </>
  );
}
