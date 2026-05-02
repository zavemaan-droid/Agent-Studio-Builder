import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useStudio } from "@/contexts/StudioContext";
import {
  Zap, MessageSquare, FolderOpen, Brain, GraduationCap, Settings,
  ChevronLeft, ChevronRight, Circle
} from "lucide-react";
import { useState } from "react";

const NAV = [
  { href: "/", label: "Assistant", icon: MessageSquare },
  { href: "/studio", label: "Studio", icon: Zap },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/memory", label: "Memory Bank", icon: Brain },
  { href: "/training", label: "Training", icon: GraduationCap },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { projects, trainingPercent, activeBuildId } = useStudio();
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
        "flex items-center gap-2.5 px-3 py-4 border-b border-sidebar-border",
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

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5 overflow-y-auto">
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
        {/* Training progress */}
        {!collapsed && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>AI Training</span>
              <span>{trainingPercent}%</span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${trainingPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Free AI badge */}
        <div className={cn(
          "flex items-center gap-1.5 text-[10px] text-emerald-400",
          collapsed && "justify-center"
        )}>
          <Circle className="w-2 h-2 fill-emerald-400" />
          {!collapsed && <span>Free AI Active</span>}
        </div>

        {/* Active builds */}
        {activeCount > 0 && !collapsed && (
          <div className="text-[10px] text-amber-400 flex items-center gap-1.5">
            <Circle className="w-2 h-2 fill-amber-400 animate-pulse" />
            {activeCount} build{activeCount > 1 ? "s" : ""} running
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="w-full flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors mt-1"
          data-testid="sidebar-collapse"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <><ChevronLeft className="w-3 h-3" /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}
