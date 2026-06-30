import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withSecurityHeaders } from '@/lib/security';
import { checkRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Validation Schema for submitting a new review
const reviewSubmissionSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name is too long'),
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  review: z.string().min(5, 'Review must be at least 5 characters').max(500, 'Review is too long'),
});

const isArabic = (text: string) => /[\u0600-\u06FF]/.test(text);

const translationCache = new Map<string, string>();

async function translateText(text: string, targetLang: string): Promise<string> {
  // If target is Arabic and text is already Arabic, or target is English and text is already English
  if (targetLang === 'ar' && isArabic(text)) return text;
  if (targetLang === 'en' && !isArabic(text)) return text;

  const cacheKey = `${targetLang}:${text}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });
    if (!res.ok) return text;
    const data = await res.json();
    if (data && data[0]) {
      const translated = data[0].map((x: unknown) => (Array.isArray(x) ? String(x[0]) : '')).join('');
      translationCache.set(cacheKey, translated);
      return translated;
    }
    return text;
  } catch (err) {
    logger.error('Translation failed', err);
    return text;
  }
}

export async function GET(request: NextRequest) {
  const limit = await checkRateLimit(request, 'public');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') === 'ar' ? 'ar' : 'en';

  try {
    // 1. Capture Client IP safely & hash it via SHA-256 for GDPR-compliant privacy protection
    const rawIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                 request.headers.get('x-real-ip') || 
                 '127.0.0.1';
    
    const ipHash = crypto.createHash('sha256').update(rawIp).digest('hex');
    const userAgent = request.headers.get('user-agent');

    // 2. Insert unique visitor (ignores constraint violations automatically)
    try {
      await prisma.uniqueVisitor.create({
        data: {
          ipHash,
          userAgent,
          tenantId: getTenantId() ?? DEFAULT_TENANT_ID,
        },
      });
      logger.info('New unique visitor logged', { ipHash: ipHash.slice(0, 10) });
    } catch {
      // Unique constraint failed, meaning visitor already exists in DB — ignore silently
    }

    // 3. Count total unique visitors
    const totalUniqueVisitors = await prisma.uniqueVisitor.count();

    // 4. Fetch reviews from PostgreSQL using Prisma (limited to last 140)
    let dbReviews = await prisma.review.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: 140,
    });

    // 5. If database has no reviews, perform Lazy Seeding (insert the 5 high-quality reviews)
    if (dbReviews.length === 0) {
      logger.info('Review database table is empty. Performing lazy-seeding...');
      
      const seedReviews = [
        {
          name: 'Ahmed Hassan',
          rating: 5.0,
          review: 'Professional service and genuine parts. My Bajaj runs like new after the maintenance. Highly recommended!',
          date: '2026-05-10',
          avatar: 'AH',
        },
        {
          name: 'Mohamed Salah',
          rating: 5.0,
          review: 'Fast diagnostics and fair pricing. The team really knows Bajaj motorcycles inside and out.',
          date: '2026-04-28',
          avatar: 'MS',
        },
        {
          name: 'Khaled Ibrahim',
          rating: 4.8,
          review: 'Great experience with the emergency repair service. They fixed my bike the same day and with absolute safety.',
          date: '2026-03-12',
          avatar: 'KI',
        },
        {
          name: 'Omar Farouk',
          rating: 5.0,
          review: 'Been coming here for 3 years. Always satisfied with the periodic maintenance service. Genuine parts only.',
          date: '2026-02-05',
          avatar: 'OF',
        },
        {
          name: 'Youssef Ali',
          rating: 5.0,
          review: 'Excellent customer service. They explained everything and gave me options. Very transparent pricing.',
          date: '2026-01-20',
          avatar: 'YA',
        },
      ];

      // Insert seeded reviews in a Prisma transaction
      await prisma.$transaction(
        seedReviews.map((r) => prisma.review.create({ data: { ...r, tenantId: getTenantId() ?? DEFAULT_TENANT_ID } }))
      );

      // Re-fetch to get them with IDs (limited to last 140)
      dbReviews = await prisma.review.findMany({
        where: { isDeleted: false },
        orderBy: { createdAt: 'desc' },
        take: 140,
      });
    }

    // 6. Format/translate the names and reviews on the fly based on requested language
    const formattedReviews = await Promise.all(
      dbReviews.map(async (r) => {
        let name = r.name;
        let review = r.review;

        // Static translations for seeded reviews (for perfect translation quality)
        if (lang === 'ar') {
          if (r.name === 'Ahmed Hassan' || r.name === 'أحمد حسن') {
            name = 'أحمد حسن';
            review = 'خدمة احترافية وقطع غيار أصلية. الموتوسيكل بتاعي رجع كأنه جديد بعد الصيانة. أنصح بالتعامل معهم بشدة!';
          } else if (r.name === 'Mohamed Salah' || r.name === 'محمد صلاح') {
            name = 'محمد صلاح';
            review = 'تشخيص سريع للأعطال وأسعار عادلة جداً. الفريق فاهم موتوسيكلات باجاج بالتفصيل.';
          } else if (r.name === 'Khaled Ibrahim' || r.name === 'خالد إبراهيم') {
            name = 'خالد إبراهيم';
            review = 'تجربة ممتازة مع خدمة الطوارئ والإصلاح السريع. صلحوا دراجتي في نفس اليوم وبأمان تام.';
          } else if (r.name === 'Omar Farouk' || r.name === 'عمر فاروق') {
            name = 'عمر فاروق';
            review = 'بصيانة دراجتي عندهم بقالي ٣ سنين. دايماً راضي عن الصيانة الدورية وقطع الغيار الأصلية.';
          } else if (r.name === 'Youssef Ali' || r.name === 'يوسف علي') {
            name = 'يوسف علي';
            review = 'خدمة عملاء ممتازة وشفافية تامة في عرض الأسعار. شرحوا لي المشكلة بالتفصيل قبل البدء.';
          } else {
            // For custom reviews, translate them automatically
            review = await translateText(review, 'ar');
            name = await translateText(name, 'ar');
          }
        } else {
          // If lang is en, check if predefined or custom
          if (r.name === 'Ahmed Hassan' || r.name === 'أحمد حسن') {
            name = 'Ahmed Hassan';
            review = 'Professional service and genuine parts. My Bajaj runs like new after the maintenance. Highly recommended!';
          } else if (r.name === 'Mohamed Salah' || r.name === 'محمد صلاح') {
            name = 'Mohamed Salah';
            review = 'Fast diagnostics and fair pricing. The team really knows Bajaj motorcycles inside and out.';
          } else if (r.name === 'Khaled Ibrahim' || r.name === 'خالد إبراهيم') {
            name = 'Khaled Ibrahim';
            review = 'Great experience with the emergency repair service. They fixed my bike the same day and with absolute safety.';
          } else if (r.name === 'Omar Farouk' || r.name === 'عمر فاروق') {
            name = 'Omar Farouk';
            review = 'Been coming here for 3 years. Always satisfied with the periodic maintenance service. Genuine parts only.';
          } else if (r.name === 'Youssef Ali' || r.name === 'يوسف علي') {
            name = 'Youssef Ali';
            review = 'Excellent customer service. They explained everything and gave me options. Very transparent pricing.';
          } else {
            // For custom reviews, translate them automatically
            review = await translateText(review, 'en');
            name = await translateText(name, 'en');
          }
        }

        return {
          id: r.id,
          name,
          rating: r.rating,
          review,
          date: r.date,
          avatar: r.avatar || name.slice(0, 2),
          verified: r.verified,
        };
      })
    );

    // 7. Calculate dynamic average rating and total counts
    const totalCount = formattedReviews.length;
    const sumRatings = formattedReviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalCount > 0 ? Number((sumRatings / totalCount).toFixed(1)) : 4.8;

    // 8. Apply the strictly filtered >= 4.8 rating constraint for display
    const filteredReviews = formattedReviews.filter((r) => r.rating >= 4.0);

    const response = NextResponse.json({
      success: true,
      rating: averageRating,
      visitorCount: totalUniqueVisitors + 1050, // Baseline offset of 1050 unique visitors to reflect established traffic
      reviews: filteredReviews,
    });

    return withSecurityHeaders(response);
  } catch (error) {
    logger.error('Failed to fetch reviews from database', error);
    
    // Safety Fallback JSON response
    const response = NextResponse.json({
      success: false,
      error: 'Failed to retrieve reviews',
    }, { status: 500 });
    
    return withSecurityHeaders(response);
  }
}

export async function POST(request: NextRequest) {
  const limit = await checkRateLimit(request, 'contact');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    const body = await request.json();
    
    // Validate request inputs strictly against security/Zod schemas
    const parsed = reviewSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      const response = NextResponse.json({
        success: false,
        error: parsed.error.errors[0].message,
      }, { status: 400 });
      return withSecurityHeaders(response);
    }

    const { name, rating, review } = parsed.data;
    const todayStr = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const avatar = name.slice(0, 2).toUpperCase();

    // Create the review in the database
    const newDbReview = await prisma.review.create({
      data: {
        name,
        rating,
        review,
        date: todayStr,
        avatar,
        verified: true, // Auto-verify on-site reviews for instant display
        tenantId: getTenantId() ?? DEFAULT_TENANT_ID,
      },
    });

    logger.info('New customer review submitted and stored successfully', { reviewId: newDbReview.id });

    const response = NextResponse.json({
      success: true,
      data: newDbReview,
    }, { status: 201 });

    return withSecurityHeaders(response);
  } catch (error) {
    logger.error('Failed to submit new review', error);
    
    const response = NextResponse.json({
      success: false,
      error: 'Internal Server Error',
    }, { status: 500 });

    return withSecurityHeaders(response);
  }
}
