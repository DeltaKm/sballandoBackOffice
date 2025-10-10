import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from "~/store/auth";
import { FaChevronDown, FaChevronRight } from 'react-icons/fa';

type SubMenuItem = {
  title: string;
  href: string;
};

type MenuItem = {
  title: string;
  href: string;
  icon: string;
  subItems: SubMenuItem[];
};

const menuItems: MenuItem[] = [
  {
    title: "Eventi",
    href: "/event",
    icon: "🎉",
    subItems: [
      // Example: { title: "Sub Evento", href: "/event/sub" }
    ]
  },
  {
    title: "Eventi Collaboratore",
    href: "/collaborator-events",
    icon: "👥",
    subItems: []
  },
  {
    title: "Locali",
    href: "/locations",
    icon: "🏢",
    subItems: [
      // Example: { title: "Sub Locale", href: "/locations/sub" }
    ]
  },
  {
    title: "Statistiche",
    href: "/dashboard",
    icon: "📊",
    subItems: []
  },
  {
    title: "Notifiche",
    href: "/notifications",
    icon: "🔔",
    subItems: []
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpand = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
    );
  };

  return (
    <aside className="w-64 bg-white/5 border-r border-white/10 h-screen fixed left-0 top-0">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <h1 className="text-xl font-bold text-white">Sballando Admin</h1>
        <div className="mt-2 text-sm text-white/60">{user?.email}</div>
      </div>

      {/* Navigation */}
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.href}>
              <div className="relative">
                <button
                  onClick={() => {
                    if (item.subItems.length > 0) {
                      toggleExpand(item.href);
                    } else {
                      router.push(item.href);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2 rounded-lg transition-colors ${
                    pathname.startsWith(item.href)
                      ? 'bg-[#FC0045]/20 text-[#FC0045]'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span>{item.icon}</span>
                    <span>{item.title}</span>
                  </div>
                  {item.subItems.length > 0 && (
                    <span className="text-sm">
                      {expandedItems.includes(item.href) ? (
                        <FaChevronDown />
                      ) : (
                        <FaChevronRight />
                      )}
                    </span>
                  )}
                </button>

                {/* Sottomenu */}
                {item.subItems.length > 0 && expandedItems.includes(item.href) && (
                  <ul className="mt-1 ml-8 space-y-1">
                    {item.subItems.map((subItem) => (
                      <li key={subItem.href }>
                        <Link
                          href={subItem.href}
                          className={`block px-4 py-2 rounded-lg transition-colors ${
                            pathname === subItem.href
                              ? 'text-[#FC0045]'
                              : 'text-white/60 hover:text-white'
                          }`}
                        >
                          {subItem.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout Button */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
        <button
          onClick={() => {
            useAuthStore.getState().logout();
            router.push("/");
          }}
          className="w-full px-4 py-2 bg-white/5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}

import type { PropsWithChildren } from 'react';

export default function MainLayout({ children }: PropsWithChildren) {
  return (
    <main className="min-h-screen bg-[#212938] flex">
      <Sidebar />
      <div className="flex-1 ml-64">
        {children}
      </div>
    </main>
  );
}