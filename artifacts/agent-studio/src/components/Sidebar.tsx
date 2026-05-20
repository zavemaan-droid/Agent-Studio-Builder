import { Link, useLocation } from "wouter";
import { Zap, MessageSquare, LayoutDashboard, FolderOpen, Brain, Settings, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/studio", label: "Studio", icon: Zap },
  { href: "/repair", label: "Repair", icon: Wrench },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  return (
    <aside className="hidden md:flex md:w-56 flex-col h-full bg-sidebar border-r border-sidebar-border shrink-0">
      <div className="flex items-center gap-2.5 px-3 py-3.5 border-b border-sidebar-border">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <p className="text-sm font-semibold text-sidebar-foreground leading-none">Agent Studio</p>
      </div>
      <nav className="flex-1 py-2 px-2 flex flex-col gap-1 overflow-y-auto">
        <Link href="/assistant" className={cn("flex items-center gap-3 px-2.5 py-2 rounded-md text-sm font-medium transition-colors", location === "/assistant" ? "bg-primary/15 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent")}>
          <MessageSquare className="w-4 h-4 shrink-0" />
          <span>Jarvis</span>
        </Link>
        <div className="border-t border-sidebar-border my-1" />
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={cn("flex items-center gap-3 px-2.5 py-2 rounded-md text-sm font-medium transition-colors", location === href || location.startsWith(href + "/") ? "bg-primary/15 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent")}>
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
