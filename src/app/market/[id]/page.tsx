import { prisma } from '@/lib/prisma';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Package, ArrowLeft, ShoppingCart } from 'lucide-react';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await prisma.product.findFirst({
    where: { id, isDeleted: false, available: true },
    select: { name: true, nameAr: true, description: true, category: true, price: true },
  });

  if (!product) {
    return { title: 'Product Not Found | El Prince Bajaj' };
  }

  return {
    title: `${product.name} | El Prince Bajaj Market`,
    description: product.description || `Buy ${product.name} at El Prince Bajaj. Genuine ${product.category}.`,
    alternates: { canonical: `/market/${id}` },
    openGraph: {
      title: product.name,
      description: product.description || '',
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;

  const product = await prisma.product.findFirst({
    where: { id, isDeleted: false, available: true },
    select: {
      id: true,
      name: true,
      nameAr: true,
      description: true,
      category: true,
      price: true,
      stock: true,
      image: true,
      barcode: true,
      sku: true,
      unit: true,
    },
  });

  if (!product) notFound();

  const price = Number(product.price);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || '',
    category: product.category,
    sku: product.sku || product.id,
    offers: {
      '@type': 'Offer',
      price: price.toFixed(2),
      priceCurrency: 'EGP',
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <Link href="/market/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back to Market
        </Link>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Image */}
          <div className="glass rounded-2xl overflow-hidden aspect-square bg-white/5 relative">
            {product.image ? (
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Package className="w-20 h-20 text-muted-foreground/20" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col gap-4">
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{product.category}</span>
              <h1 className="text-2xl font-bold mt-1">{product.name}</h1>
              {product.nameAr && (
                <p className="text-muted-foreground text-lg mt-1">{product.nameAr}</p>
              )}
            </div>

            <p className="text-3xl font-bold text-primary">{price.toFixed(2)} EGP</p>

            <div className="flex items-center gap-2">
              {product.stock > 0 ? (
                <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-sm font-medium">
                  In Stock ({product.stock} {product.unit})
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-sm font-medium">
                  Out of Stock
                </span>
              )}
            </div>

            {product.description && (
              <p className="text-muted-foreground text-sm leading-relaxed mt-2">
                {product.description}
              </p>
            )}

            {product.sku && (
              <p className="text-xs text-muted-foreground/60">SKU: {product.sku}</p>
            )}

            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-border">
              <p className="text-sm text-muted-foreground mb-2">
                Visit our store or call us to purchase this item.
              </p>
              <Link
                href="/#contact"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                Contact to Buy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
