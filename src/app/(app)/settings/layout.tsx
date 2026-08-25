"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { User, Building2, CreditCard, Receipt, ShieldCheck } from "lucide-react";
import { hasPermission } from "@/lib/permissions";

const TABS = [
  { href: "/settings",              icon: User,        label: "Profile"      },
  { href: "/settings/organization", icon: Building2,   label: "Organization" },
  { href: "/settings/billing",      icon: CreditCard,  label: "Billing", tourId: "tour-billing" },
  { href: "/settings/audit",        icon: Receipt,     label: "Audit Log"    },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role ?? "MEMBER";
  const isAdmin = hasPermission(userRole, "admin:access");

  const tabs = isAdmin
    ? [...TABS, { href: "/settings/admin", icon: ShieldCheck, label: "Admin Panel" }]
    : TABS;

  const isActive = (href: string) =>
    href === "/settings" ? pathname === "/settings" : pathname.startsWith(href);

  return (
    <div>
      <div
        className="flex items-center gap-1 overflow-x-auto no-scrollbar px-6 pt-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              data-tour-id={(tab as { tourId?: string }).tourId}
              className="flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-semibold whitespace-nowrap transition-colors"
              style={{
                color: active ? "var(--accent)" : "var(--text-muted)",
                borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
