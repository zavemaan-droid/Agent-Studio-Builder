import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Zap, FolderOpen, Bot, Wrench, ImageIcon, Settings } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Home",     icon: LayoutDashboard },
  { href: "/studio",    label: "Build",    icon: Zap },
  { href: "/repair",    label: "Repair",   icon: Wrench },
  { href: "/assets",    label: "Assets",   icon: ImageIcon },
  { href: "/projects",  label: "Projects", icon: FolderOpen },
  { href: "/assistant", label: "Jarvis",   icon: Bot },
  { href: "/settings",  label: "Settings", icon: Settings },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch h-14">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = location === href || (href !== "/" && location.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors active:scale-95",
                active ? "text-primary" : "text-sidebar-foreground/50"
              )}
            >
              <Icon className={cn("w-5 h-5 transition-all", active && "scale-110")} />
              <span className={cn(
                "text-[9px] font-medium tracking-wide transition-all",
                active ? "opacity-100" : "opacity-60"
              )}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
