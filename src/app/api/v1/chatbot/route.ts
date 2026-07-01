import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { withSecurityHeaders } from '@/lib/security';
import { z } from 'zod';

const FAQ: Record<string, { en: string; ar: string }> = {
  'working_hours': {
    en: 'We are open Saturday to Thursday, 10:00 AM to 10:00 PM. Friday is a holiday.',
    ar: 'نعمل من السبت إلى الخميس، من 10 صباحاً إلى 10 مساءً. الجمعة إجازة.',
  },
  'maintenance_time': {
    en: 'Standard maintenance takes 1-2 hours. Major repairs may take 1-3 days depending on parts availability.',
    ar: 'الصيانة العادية تستغرق 1-2 ساعة. الإصلاحات الكبيرة قد تستغرق 1-3 أيام حسب توفر قطع الغيار.',
  },
  'booking': {
    en: 'You can book a service appointment through our website booking page, or call us directly.',
    ar: 'يمكنك حجز موعد صيانة من خلال صفحة الحجز على موقعنا، أو الاتصال بنا مباشرة.',
  },
  'parts': {
    en: 'We stock genuine Bajaj spare parts and accessories. Visit our market page or contact us for availability.',
    ar: 'نوفر قطع غيار وإكسسوارات باجاج الأصلية. زر صفحة المتجر أو تواصل معنا للاستعلام عن التوفر.',
  },
  'warranty': {
    en: 'All services and parts come with a warranty. Please contact us for specific warranty terms.',
    ar: 'جميع الخدمات وقطع الغيار تأتي مع ضمان. يرجى التواصل معنا لمعرفة شروط الضمان.',
  },
  'contact': {
    en: 'For urgent inquiries, please contact us directly on WhatsApp and we will respond as soon as possible.',
    ar: 'للاستفسارات العاجلة، يرجى التواصل معنا مباشرة على WhatsApp وسنرد في أقرب وقت.',
  },
};

const chatSchema = z.object({
  message: z.string().min(1).max(500),
  lang: z.enum(['en', 'ar']).optional().default('ar'),
});

const keywords: Record<string, string[]> = {
  working_hours: ['hour', 'time', 'open', 'close', 'work', 'مواعيد', 'ساعات', 'وقت', 'فتح', 'قفل', 'دوام', 'شغل'],
  maintenance_time: ['how long', 'duration', 'take', 'wait', 'maintenance', 'service', 'كم', 'مدة', 'يستغرق', 'انتظار', 'صيانة', 'خدمة', 'وقت'],
  booking: ['book', 'appointment', 'reserve', 'حجز', 'موعد'],
  parts: ['part', 'spare', 'accessory', 'قطع', 'غيار', 'اكسسوارات', 'زيت'],
  warranty: ['warranty', 'guarantee', 'ضمان', 'كفالة'],
  contact: ['contact', 'call', 'speak', 'human', 'agent', 'تواصل', 'اتصال', 'كلم', 'موظف', 'خدمة عملاء'],
};

function findBestMatch(message: string): string | null {
  const lower = message.toLowerCase();
  let bestKey: string | null = null;
  let bestScore = 0;

  for (const [key, kws] of Object.entries(keywords)) {
    let score = 0;
    for (const kw of kws) {
      if (lower.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }

  return bestScore > 0 ? bestKey : null;
}

export async function POST(req: NextRequest) {
  const rateLimit = await checkRateLimit(req, 'public');
  if (!rateLimit.allowed) return withSecurityHeaders(rateLimit.response!);

  try {
    const body = await req.json();
    const { message, lang } = chatSchema.parse(body);

    const matchedKey = findBestMatch(message);
    const contactWhatsApp = process.env.WHATSAPP_NUMBER || '201015544084';

    if (matchedKey === 'contact') {
      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: {
          reply: lang === 'ar'
            ? 'يمكنك التواصل مع خدمة العملاء مباشرة عبر واتساب:'
            : 'You can contact customer service directly on WhatsApp:',
          action: 'whatsapp',
          whatsapp: `https://wa.me/${contactWhatsApp.replace(/\D/g, '')}`,
        },
      }));
    }

    if (matchedKey && FAQ[matchedKey]) {
      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: { reply: FAQ[matchedKey][lang], action: 'text' },
      }));
    }

    const fallback = lang === 'ar'
      ? 'لم أتمكن من فهم سؤالك. يمكنك التواصل مع خدمة العملاء مباشرة عبر واتساب.'
      : 'I could not understand your question. You can contact customer service directly on WhatsApp.';

    return withSecurityHeaders(NextResponse.json({
      success: true,
      data: {
        reply: fallback,
        action: 'whatsapp',
        whatsapp: `https://wa.me/${contactWhatsApp.replace(/\D/g, '')}`,
      },
    }));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    return withSecurityHeaders(NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }));
  }
}
