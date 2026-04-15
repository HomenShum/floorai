"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useOperatorSession } from "@/components/OperatorSessionProvider";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/store", label: "Store" },
  { href: "/regional", label: "Regional" },
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

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[220px] flex-col border-r border-gray-200 bg-white">
      <div className="px-4 py-4">
        <p className="text-[13px] font-bold text-gray-900">FloorAI</p>
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
            {stores.map((store) => {
              const isActiveStore = activeStoreParam === store.id;
              // Navigate to the current page (store or regional) with store param
              const targetPath = pathname.startsWith("/regional")
                ? `/regional?store=${store.id}`
                : `/store?store=${store.id}`;
              return (
                <Link
                  key={store.id}
                  href={targetPath}
                  className={`flex items-center justify-between rounded-md px-3 py-1 text-[13px] transition ${
                    isActiveStore
                      ? "bg-indigo-50 text-indigo-600 font-medium"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span>{store.name}</span>
                  <span className={`text-[11px] ${isActiveStore ? "text-indigo-400" : "text-gray-400"}`}>{store.id}</span>
                </Link>
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
  );
}
