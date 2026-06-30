'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard, Mail, Calendar, ShoppingCart, DollarSign, Package,
  Users, Car, List, Wrench, MessageCircle, ScanLine, Settings,
  LogOut, Menu, X, ClipboardList, PanelLeft, PanelRight, Truck, Building2,
} from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { useTranslation } from '@/components/useTranslation';
import { cn } from '@/lib/utils';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface SidebarLink {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  isActive?: (pathname: string, searchParams: URLSearchParams) => boolean;
}

interface SidebarSection {
  labelKey?: string;
  links: SidebarLink[];
}

const sections: SidebarSection[] = [
  {
    links: [
      {
        href: '/admin/dashboard',
        icon: LayoutDashboard,
        labelKey: 'admin_overview',
        isActive: (pathname, searchParams) => pathname === '/admin/dashboard' && !searchParams.get('tab'),
      },
    ],
  },
  {
    labelKey: 'admin_quick_links',
    links: [
      {
        href: '/admin/dashboard/?tab=messages',
        icon: Mail,
        labelKey: 'admin_messages',
        isActive: (pathname, searchParams) => pathname === '/admin/dashboard' && searchParams.get('tab') === 'messages',
      },
      {
        href: '/admin/dashboard/?tab=bookings',
        icon: Calendar,
        labelKey: 'admin_bookings',
        isActive: (pathname, searchParams) => pathname === '/admin/dashboard' && searchParams.get('tab') === 'bookings',
      },
    ],
  },
  {
    labelKey: 'admin_pos_wh',
    links: [
      { href: '/admin/pos', icon: ShoppingCart, labelKey: 'pos_title' },
      { href: '/admin/accounting', icon: DollarSign, labelKey: 'admin_accounting' },
      { href: '/admin/accounts', icon: DollarSign, labelKey: 'acct_chart_title' },
      { href: '/admin/journal-entries', icon: DollarSign, labelKey: 'je_title' },
      { href: '/admin/reports', icon: DollarSign, labelKey: 'rpt_title' },
      { href: '/admin/warehouse', icon: Package, labelKey: 'wh_title' },
      { href: '/admin/inventory-counts', icon: ClipboardList, labelKey: 'ic_title' },
      { href: '/admin/purchase-orders', icon: Package, labelKey: 'po_title' },
    ],
  },
  {
    labelKey: 'admin_crm',
    links: [
      { href: '/admin/market', icon: Package, labelKey: 'admin_market' },
      { href: '/admin/customers', icon: Users, labelKey: 'admin_customers' },
      { href: '/admin/vehicles', icon: Car, labelKey: 'admin_vehicles' },
      { href: '/admin/vehicle-models', icon: List, labelKey: 'admin_vehicle_models' },
      { href: '/admin/manufacturers', icon: Building2, labelKey: 'admin_manufacturers' },
      { href: '/admin/work-orders', icon: Wrench, labelKey: 'wo_title' },
      { href: '/admin/suppliers', icon: Truck, labelKey: 'admin_suppliers' },
      { href: '/admin/whatsapp', icon: MessageCircle, labelKey: 'admin_whatsapp' },
    ],
  },
  {
    labelKey: 'admin_system',
    links: [
      { href: '/admin/devices', icon: ScanLine, labelKey: 'admin_devices' },
      { href: '/admin/settings', icon: Settings, labelKey: 'admin_settings' },
    ],
  },
];

const SIDEBAR_COLLAPSED_KEY = 'admin-sidebar-collapsed';

export default function AdminSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) : null;
    setCollapsed(saved === 'true');
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mounted) {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    }
  }, [collapsed, mounted]);

  const isLogin = pathname === '/admin' || pathname === '/admin/';
  if (isLogin) return null;

  const normalizedPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  const isLinkActive = (link: SidebarLink) => {
    if (link.isActive) {
      return link.isActive(normalizedPath, searchParams);
    }
    const h = link.href.endsWith('/') ? link.href.slice(0, -1) : link.href;
    if (h === '/admin/dashboard') {
      return normalizedPath === h;
    }
    return normalizedPath.startsWith(h);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout/', { method: 'POST', credentials: 'include' });
    } catch {
      // ignore
    }
    router.push('/admin/');
  };

  const ToggleIcon = collapsed ? PanelRight : PanelLeft;

  const sidebarContent = (
    <div
      className={cn(
        'flex flex-col h-full bg-background/95 backdrop-blur-xl',
        isRTL ? 'border-l' : 'border-r',
        'border-border/50'
      )}
    >
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div className={cn('overflow-hidden transition-all duration-200', collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100')}>
          <Logo size="sm" />
        </div>
        <button
          onClick={() => setOpen(false)}
          className="md:hidden text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-white/5"
          aria-label={t('admin_close_menu') || 'Close menu'}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-3 overflow-y-auto">
        {sections.map((section, i) => (
          <div key={i}>
            {section.labelKey && !collapsed && (
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                {t(section.labelKey)}
              </div>
            )}
            <div className="space-y-0.5">
              {section.links.map((link) => {
                const active = isLinkActive(link);
                const Icon = link.icon;
                const isExternal = link.href.startsWith('http');
                const Comp = isExternal ? 'a' : Link;
                const extraProps = isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {};
                return (
                  <Comp
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center rounded-xl text-sm font-medium transition-all',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
                      collapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3 py-2.5'
                    )}
                    aria-current={active ? 'page' : undefined}
                    title={collapsed ? t(link.labelKey) : undefined}
                    {...extraProps}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!collapsed && <span className="truncate">{t(link.labelKey)}</span>}
                  </Comp>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-border/50 space-y-1">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            'w-full flex items-center rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all',
            collapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3 py-2.5'
          )}
          title={collapsed ? t('admin_expand_sidebar') : t('admin_collapse_sidebar')}
          aria-label={collapsed ? t('admin_expand_sidebar') : t('admin_collapse_sidebar')}
        >
          <ToggleIcon className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="truncate">{t('admin_collapse_sidebar')}</span>}
        </button>
        <div className={cn('flex', collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2')}>
          <LanguageSwitcher className="w-full justify-center text-xs" />
        </div>
        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all',
            collapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3 py-2.5'
          )}
          title={collapsed ? t('admin_sign_out') : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="truncate">{t('admin_sign_out')}</span>}
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
        aria-label={t('admin_open_menu') || 'Open menu'}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar - mobile: fixed overlay, desktop: fixed side */}
      <div
        className={cn(
          'fixed inset-y-0 z-50 transform transition-all duration-200 ease-in-out',
          isRTL ? 'right-0 border-l' : 'left-0 border-r',
          open ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full',
          'md:translate-x-0',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {sidebarContent}
      </div>

      {/* Desktop spacer */}
      <div className={cn('hidden md:block flex-shrink-0 transition-all duration-200', collapsed ? 'w-16' : 'w-64')} />
    </>
  );
}
