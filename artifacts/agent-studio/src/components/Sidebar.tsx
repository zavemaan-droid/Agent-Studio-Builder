import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useStudio } from "@/contexts/StudioContext";
import {
  Zap, MessageSquare, FolderOpen, Brain, GraduationCap, Settings,
  ChevronLeft, ChevronRight, Circle, LayoutDashboard, Bot, BookOpen, Plus, User
} from "lucide-react";
import { useState } from "react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/studio", label: "Studio", icon: Zap },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/library", label: "Library", icon: BookOpen },
  { href: "/training", label: "Training", icon: GraduationCap },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const { projects, trainingPercent, activeBuildId, memories } = useStudio();
  const [collapsed, setCollapsed] = useState(false);

  const activeCount = projects.filter(p => p.status === "building").length;

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-200 shrink-0",
        collapsed ? "w-14" : "w-56"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-2.5 px-3 py-3.5 border-b border-sidebar-border",
        collapsed && "justify-center"
      )}>
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-semibold text-sidebar-foreground leading-none">Agent Studio</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Free AI Builder</p>
          </div>
        )}
      </div>

      {/* + New Build button */}
      {!collapsed ? (
        <div className="px-2 pt-2 pb-1">
          <button
            onClick={() => setLocation("/studio")}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-card border border-border hover:border-primary/50 hover:bg-primary/5 text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
            data-testid="new-build-btn"
          >
            <Plus className="w-3.5 h-3.5" />
            New Build
          </button>
        </div>
      ) : (
        <div className="px-2 pt-2 pb-1">
          <button
            onClick={() => setLocation("/studio")}
            className="w-full flex items-center justify-center py-2 rounded-lg bg-card border border-border hover:border-primary/50 transition-all"
            title="New Build"
          >
            <Plus className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-1 px-2 flex flex-col gap-0.5 overflow-y-auto">
        {/* Assistant link above nav */}
        <Link
          href="/assistant"
          className={cn(
            "flex items-center gap-3 px-2.5 py-2 rounded-md text-sm font-medium transition-colors relative mb-1",
            location === "/assistant" || location === "/"
              ? "bg-primary/15 text-primary"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed && "justify-center px-2"
          )}
        >
          <MessageSquare className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Assistant</span>}
        </Link>

        <div className={cn("border-t border-sidebar-border mb-1", collapsed && "mx-1")} />

        {NAV.map(({ href, label, icon: Icon }) => {
          const isActive = location === href || (href !== "/" && location.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-2.5 py-2 rounded-md text-sm font-medium transition-colors relative",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "justify-center px-2"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
              {label === "Studio" && activeBuildId && (
                <span className={cn(
                  "ml-auto w-1.5 h-1.5 rounded-full bg-amber-400",
                  collapsed && "absolute top-1.5 right-1.5"
                )} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={cn(
        "px-3 py-3 border-t border-sidebar-border space-y-2",
        collapsed && "px-2"
      )}>
        {/* Build System Ready */}
        <div className={cn(
          "rounded-lg bg-card border border-border p-2 space-y-0.5",
          collapsed && "p-1.5"
        )}>
          <div className={cn("flex items-center gap-1.5", collapsed && "justify-center")}>
            <Circle className="w-2 h-2 fill-emerald-400 text-emerald-400 shrink-0" />
            {!collapsed && <span className="text-[10px] font-medium text-emerald-400">Build System Ready</span>}
          </div>
          {!collapsed && (
            <p className="text-[9px] text-muted-foreground">Pollinations AI · Free · No Limits</p>
          )}
        </div>

        {/* Active builds */}
        {activeCount > 0 && !collapsed && (
          <div className="text-[10px] text-amber-400 flex items-center gap-1.5">
            <Circle className="w-2 h-2 fill-amber-400 animate-pulse" />
            {activeCount} build{activeCount > 1 ? "s" : ""} running
          </div>
        )}

        {/* Developer profile */}
        {!collapsed && (
          <div className="flex items-center gap-2 pt-1">
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
              <User className="w-3 h-3 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium text-foreground truncate">Developer</p>
              <p className="text-[9px] text-muted-foreground">Free Plan</p>
            </div>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="w-full flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          data-testid="sidebar-collapse"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <><ChevronLeft className="w-3 h-3" /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}
