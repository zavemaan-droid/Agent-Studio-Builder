import { Link, useLocation } from "wouter";
import { Zap, MessageSquare, LayoutDashboard, FolderOpen, Brain, Settings, Wrench, ImageIcon, Bot, BookOpen, GraduationCap, Code2, PackageOpen, Clapperboard, SlidersHorizontal, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/studio", label: "Studio", icon: Zap },
  { href: "/repair", label: "Repair", icon: Wrench },
  { href: "/assets", label: "Assets", icon: ImageIcon },
  { href: "/constraints", label: "Constraints", icon: SlidersHorizontal },
  { href: "/legal", label: "Legal Gate", icon: ShieldCheck },
  { href: "/rebuild", label: "Rebuild", icon: PackageOpen },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/editor", label: "Editor", icon: Code2 },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/library", label: "Library", icon: BookOpen },
  { href: "/video", label: "Video", icon: Clapperboard },
  { href: "/training", label: "Training", icon: GraduationCap },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const [location, setLocation] = useLocation();
  return (
    <aside className="hidden md:flex md:w-56 flex-col h-full bg-sidebar border-r border-sidebar-border shrink-0">
      <div className="flex items-center gap-2.5 px-3 py-3.5 border-b border-sidebar-border">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <p className="text-sm font-semibold text-sidebar-foreground leading-none">Builder Studio</p>
      </div>

      <div className="px-2 pt-2 pb-1 grid gap-1">
        <button onClick={() => setLocation("/studio")} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-card border border-border hover:border-primary/50 hover:bg-primary/5 text-xs font-medium text-muted-foreground hover:text-foreground transition-all">
          <Zap className="w-3.5 h-3.5" /> New Build
        </button>
        <button onClick={() => setLocation("/repair")} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-amber-500/10 border border-amber-500/25 hover:border-amber-400/60 hover:bg-amber-500/15 text-xs font-medium text-amber-300 transition-all">
          <Wrench className="w-3.5 h-3.5" /> Repair / Upgrade
        </button>
      </div>

      <nav className="flex-1 py-2 px-2 flex flex-col gap-1 overflow-y-auto">
        <Link href="/assistant" className={cn("flex items-center gap-3 px-2.5 py-2 rounded-md text-sm font-medium transition-colors", location === "/assistant" || location === "/" ? "bg-primary/15 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}>
          <MessageSquare className="w-4 h-4 shrink-0" />
          <span>Jarvis</span>
        </Link>
        <div className="border-t border-sidebar-border my-1" />
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={cn("flex items-center gap-3 px-2.5 py-2 rounded-md text-sm font-medium transition-colors", location === href || location.startsWith(href + "/") ? "bg-primary/15 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}>
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
