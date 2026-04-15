"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useOperatorSession } from "@/components/OperatorSessionProvider";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/store", label: "Store" },
  { href: "/regional", label: "Regional" },
  { href: "/chat", label: "Chat" },
];

const stores = [
  { id: "STR-101", name: "Greenfield" },
  { id: "STR-102", name: "Elm St" },
  { id: "STR-103", name: "Harbor" },
  { id: "STR-104", name: "Riverside" },
  { id: "STR-105", name: "College" },
  { id: "STR-106", name: "Downtown" },
  { id: "STR-107", name: "Lakeside" },
  { id: "STR-108", name: "Westfield" },
];

export function Sidebar() {
  return (
    <Suspense fallback={<SidebarFallback />}>
      <SidebarInner />
    </Suspense>
  );
}

function SidebarFallback() {
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[220px] flex-col border-r border-gray-200 bg-white">
      <div className="px-4 py-4">
        <p className="text-[13px] font-bold text-gray-900">FloorAI</p>
      </div>
    </aside>
  );
}

function SidebarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeStoreParam = searchParams.get("store");
  const { operator } = useOperatorSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const operatorProfile = useQuery(
    api.users.getById,
    operator?.operatorId ? { operatorId: operator.operatorId } : "skip"
  );

  // Filter stores based on operator role
  const visibleStores = (() => {
    if (!operator || !operatorProfile) return stores;
    if (operatorProfile.role === "store_manager") {
      const allowed = operatorProfile.storeIds ?? [];
      return stores.filter((s) => allowed.includes(s.id));
    }
    // regional_manager sees all
    return stores;
  })();

  const hasAccess = !!operator;

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-50 rounded-md border border-gray-200 bg-white p-2 shadow-sm md:hidden"
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M3 5h14M3 10h14M3 15h14" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`fixed left-0 top-0 z-40 flex h-screen w-[220px] flex-col border-r border-gray-200 bg-white transition-transform duration-200 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      } md:translate-x-0`}>
        <div className="flex items-center justify-between px-4 py-4">
          <p className="text-[13px] font-bold text-gray-900">FloorAI</p>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded p-1 text-gray-400 hover:text-gray-600 md:hidden"
            aria-label="Close menu"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-2">
          <div className="space-y-0.5">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block rounded-md px-3 py-1.5 text-[13px] font-medium transition ${
                    isActive
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="mt-6">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Stores
            </p>
            <div className="mt-2 space-y-0.5">
              {visibleStores.map((store) => {
                const isActiveStore = activeStoreParam === store.id;
                const targetPath = pathname.startsWith("/regional")
                  ? `/regional?store=${store.id}`
                  : `/store?store=${store.id}`;
                return hasAccess ? (
                  <Link
                    key={store.id}
                    href={targetPath}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center justify-between rounded-md px-3 py-1 text-[13px] transition ${
                      isActiveStore
                        ? "bg-indigo-50 text-indigo-600 font-medium"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <span>{store.name}</span>
                    <span className={`text-[11px] ${isActiveStore ? "text-indigo-400" : "text-gray-400"}`}>{store.id}</span>
                  </Link>
                ) : (
                  <div
                    key={store.id}
                    className="flex items-center justify-between rounded-md px-3 py-1 text-[13px] text-gray-300 cursor-not-allowed"
                  >
                    <span>{store.name}</span>
                    <span className="text-[11px] text-gray-300">{store.id}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </nav>

        {operator ? (
          <div className="border-t border-gray-200 px-4 py-3">
            <p className="truncate text-[13px] font-medium text-gray-900">
              {operator.name}
            </p>
            <p className="text-[11px] text-gray-400">
              {operator.role.replace("_", " ")}
            </p>
          </div>
        ) : (
          <div className="border-t border-gray-200 px-4 py-3">
            <p className="text-[13px] text-gray-400">No session</p>
          </div>
        )}
      </aside>
    </>
  );
}
