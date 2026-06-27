'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Mail, Calendar, ShoppingCart, DollarSign, TrendingUp,
  Package, Users, Car, List, Wrench, MessageCircle, Camera, Settings,
  LogOut, Menu, X,
} from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { useTranslation } from '@/components/useTranslation';

interface SidebarLink {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
}

interface SidebarSection {
  labelKey?: string;
  links: SidebarLink[];
}

const sections: SidebarSection[] = [
  {
    links: [
      { href: '/admin/dashboard', icon: LayoutDashboard, labelKey: 'admin_overview' },
    ],
  },
  {
    labelKey: 'admin_quick_links',
    links: [
      { href: '/admin/dashboard/?tab=messages', icon: Mail, labelKey: 'admin_messages' },
      { href: '/admin/dashboard/?tab=bookings', icon: Calendar, labelKey: 'admin_bookings' },
    ],
  },
  {
    labelKey: 'admin_pos_wh',
    links: [
      { href: '/admin/pos', icon: ShoppingCart, labelKey: 'pos_title' },
      { href: '/admin/accounting', icon: DollarSign, labelKey: 'admin_accounting' },
      { href: '/admin/warehouse', icon: TrendingUp, labelKey: 'wh_title' },
    ],
  },
  {
    labelKey: 'admin_crm',
    links: [
      { href: '/admin/market', icon: Package, labelKey: 'admin_market' },
      { href: '/admin/customers', icon: Users, labelKey: 'admin_customers' },
      { href: '/admin/vehicles', icon: Car, labelKey: 'admin_vehicles' },
      { href: '/admin/vehicle-models', icon: List, labelKey: 'admin_vehicle_models' },
      { href: '/admin/work-orders', icon: Wrench, labelKey: 'wo_title' },
      { href: '/admin/whatsapp', icon: MessageCircle, labelKey: 'admin_whatsapp' },
    ],
  },
  {
    labelKey: 'admin_system',
    links: [
      { href: '/admin/devices', icon: Camera, labelKey: 'admin_devices' },
      { href: '/admin/settings', icon: Settings, labelKey: 'admin_settings' },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isLogin = pathname === '/admin' || pathname === '/admin/';
  if (isLogin) return null;

  const normalizedPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  const isActive = (href: string) => {
    const h = href.endsWith('/') ? href.slice(0, -1) : href;
    if (h === '/admin/dashboard') {
      return normalizedPath === h;
    }
    return normalizedPath.startsWith(h);
  };

  const handleNav = (href: string) => {
    router.push(href);
    setOpen(false);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout/', { method: 'POST', credentials: 'include' });
    } catch {
      // ignore
    }
    router.push('/admin/');
  };

  const sidebarContent = (
    <div className={`flex flex-col h-full ${isRTL ? 'border-l' : 'border-r'} border-border/50 bg-background/95 backdrop-blur-xl`}>
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <Logo size="sm" />
        <button onClick={() => setOpen(false)} className="md:hidden text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>
      <nav className="flex-1 p-3 space-y-3 overflow-y-auto">
        {sections.map((section, i) => (
          <div key={i}>
            {section.labelKey && (
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                {t(section.labelKey)}
              </div>
            )}
            <div className="space-y-0.5">
              {section.links.map((link) => {
                const active = isActive(link.href);
                const Icon = link.icon;
                return (
                  <button
                    key={link.href}
                    onClick={() => handleNav(link.href)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {t(link.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-border/50">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {t('admin_sign_out')}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 z-40 md:hidden text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-white/5"
        style={{ [isRTL ? 'right' : 'left']: '1rem' }}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar - mobile: fixed overlay, desktop: fixed side */}
      <div
        className={`fixed inset-y-0 z-50 w-64 transform transition-transform duration-200 ease-in-out ${
          isRTL ? 'right-0 border-l' : 'left-0 border-r'
        } ${open ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'} md:translate-x-0`}
      >
        {sidebarContent}
      </div>

      {/* Desktop spacer */}
      <div className="hidden md:block w-64 flex-shrink-0" />
    </>
  );
}
