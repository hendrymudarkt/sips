'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { cookieStore } from '@/utils/auth/cookieStore';
import { getMenuForUserLevel, MenuItem } from '@/lib/constants/menuConfig';
import { Icon } from '@/app/components/ui/icons';

export const Drawer = () => {
  const t = useTranslations('Navbar');
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState<string | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  // Dynamic dropdown states based on menu config
  const [dropdownStates, setDropdownStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Initialize userLevel from cookie and filter menu items
    const currentLevel = cookieStore.getLevel();
    setMenuItems(getMenuForUserLevel(currentLevel));
  }, []);

  useEffect(() => {
    const newStates: Record<string, boolean> = {};
    const walk = (items: MenuItem[]) => {
      items.forEach(item => {
        if (item.children && item.children.length > 0) {
          const hasActiveDescendant = item.children.some(child =>
            pathname === child.href || pathname.startsWith(child.href + '/')
          );
          newStates[item.id] = hasActiveDescendant;
          walk(item.children);
        }
      });
    };
    walk(menuItems);
    setDropdownStates(newStates);
    setIsNavigating(null);
  }, [pathname, menuItems]);

  // Close the drawer.
  const closeDrawer = () => {
    setOpen(false);
  };

  // 🎨 Palette Improvement: Focus management for accessibility
  useEffect(() => {
    if (open) {
      // Focus first interactive element when opened
      const firstItem = sidebarRef.current?.querySelector('a, button, summary');
      if (firstItem instanceof HTMLElement) {
        // small delay to ensure it's rendered
        setTimeout(() => firstItem.focus(), 50);
      }
      isFirstRender.current = false;
    } else if (!isFirstRender.current) {
      // Return focus to trigger when closed (skip on first mount)
      triggerRef.current?.focus();
    }
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  // Navigate and mark the clicked item as loading.
  const handleNavigate = (href: string) => {
    if (pathname === href) {
      closeDrawer();
      return;
    }
    setIsNavigating(href);
    closeDrawer();
    router.push(href);
  };

  // Active menu item helper.
  const isActive = (href: string) => (pathname === href ? 'active bg-base-300' : '');

  // Helper: toggle dropdown state
  const toggleDropdown = (itemId: string) => {
    setDropdownStates(prev => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  // Render menu icon
  const renderIcon = (iconPath: string, size: string = 'h-5 w-5') => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`${size} shrink-0`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
    </svg>
  );

  // Render single menu item
  const renderMenuItem = (item: MenuItem) => {
    if (item.children && item.children.length > 0) {
      const isOpen = dropdownStates[item.id] || false;
      return (
        <li key={item.id}>
          <button
            type="button"
            className="flex items-center justify-between w-full cursor-pointer px-3 py-2 hover:bg-base-300 focus-visible:ring-2 focus-visible:ring-primary rounded-lg transition-colors"
            onClick={() => toggleDropdown(item.id)}
          >
            <div className="flex items-center gap-3">
              {renderIcon(item.icon)}
              <span>{t(item.label)}</span>
            </div>
            <Icon name="chevron-down" className={`h-4 w-4 opacity-60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          {isOpen && (
            <ul className="mt-1">
              {item.children.map(child => renderMenuItem(child))}
            </ul>
          )}
        </li>
      );
    }

    // Render simple menu item
    return (
      <li key={item.id}>
        <Link
          href={item.href}
          className={`w-full flex items-center gap-3 px-3 py-2 ${isActive(item.href)}`}
          onClick={() => handleNavigate(item.href)}
        >
          {renderIcon(item.icon, 'h-5 w-5')}
          {t(item.label)}
        </Link>
      </li>
    );
  };

  return (
    <>
      {/* Progress Bar */}
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 z-[9999]">
          <div className="h-1 bg-primary animate-pulse"></div>
        </div>
      )}

      {/* Burger button — always visible */}
      <button
        ref={triggerRef}
        type="button"
        className="btn btn-ghost btn-circle focus-visible:ring-2 focus-visible:ring-primary"
        onClick={() => setOpen(true)}
        aria-label={t('openSidebar')}
        aria-expanded={open}
        aria-controls="drawer-sidebar"
      >
        <Icon name="menu" className="h-5 w-5" />
      </button>

      {/* Overlay + sidebar */}
      {open && (
        <div className="fixed inset-0 z-[9999] flex">
          {/* Backdrop */}
          <button
            type="button"
            className="fixed inset-0 bg-black/40 border-none w-full h-full cursor-default"
            onClick={closeDrawer}
            aria-label={t('close')}
          />

          {/* Sidebar panel — positioned fixed, no GPU transform */}
          <aside
            id="drawer-sidebar"
            ref={sidebarRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('openSidebar')}
            className="fixed left-0 top-0 h-full bg-base-200 text-base-content shadow-2xl overflow-y-auto"
          >
            <ul className="menu p-4 gap-1 min-h-full">
              {/* Header/brand */}
              <li className="pointer-events-none mb-4">
                <div className="flex flex-col items-center justify-center gap-3 py-4 bg-base-100 rounded-xl shadow-sm border border-base-300">
                  <div className="text-center">
                    <span className="block font-bold text-lg leading-tight text-base-content">
                      Sentosa Kalimantan Jaya
                    </span>
                    <span className="text-xs text-base-content/60 font-medium tracking-wide uppercase mt-1 block">
                      SIPS Mobile Web
                    </span>
                  </div>
                </div>
              </li>

              {/* Render menu items from config */}
              {menuItems.map(item => renderMenuItem(item))}
            </ul>
          </aside>
        </div>
      )}
    </>
  );
};


