import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useStudio } from "@/contexts/StudioContext";
import {
  Zap, MessageSquare, FolderOpen, Brain, GraduationCap, Settings,
  ChevronLeft, ChevronRight, Circle, LayoutDashboard, Bot, BookOpen, Plus
} from "lucide-react";
import { useState } from "react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/studio",    label: "Studio",    icon: Zap },
  { href: "/projects",  label: "Projects",  icon: FolderOpen },
  { href: "/agents",    label: "Agents",    icon: Bot },
  { href: "/memory",    label: "Memory",    icon: Brain },
  { href: "/library",   label: "Library",   icon: BookOpen },
  { href: "/training",  label: "Training",  icon: GraduationCap },
  { href: "/settings",  label: "Settings",  icon: Settings },
];

function Avatar({ name, color, size = "sm" }: { name: string; color: string; size?: "sm" | "md" }) {
  const initials = name
    ? name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  const dim = size === "sm" ? "w-6 h-6 text-[9px]" : "w-8 h-8 text-xs";
  return (
    <div
      className={cn("rounded-full flex items-center justify-center shrink-0 font-semibold text-white", dim)}
      style={{ background: color }}
    >
      {initials}
    </div>
  );
}

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const { projects, activeBuildId, settings } = useStudio();
  const [collapsed, setCollapsed] = useState(false);

  const activeCount = projects.filter(p => p.status === "building").length;
  const displayName = settings.userName.trim() || "You";
  const userColor = settings.userColor || "#6366f1";

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
          <p className="text-sm font-semibold text-sidebar-foreground leading-none">Agent Studio</p>
        )}
      </div>

      {/* + New Build button */}
      <div className="px-2 pt-2 pb-1">
        <button
          onClick={() => setLocation("/studio")}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-card border border-border hover:border-primary/50 hover:bg-primary/5 text-xs font-medium text-muted-foreground hover:text-foreground transition-all",
            collapsed && "px-0"
          )}
          title="New Build"
        >
          <Plus className="w-3.5 h-3.5" />
          {!collapsed && "New Build"}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-1 px-2 flex flex-col gap-0.5 overflow-y-auto">
        {/* Assistant */}
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
        {/* Build status */}
        <div className={cn(
          "rounded-lg bg-card border border-border p-2",
          collapsed && "p-1.5"
        )}>
          <div className={cn("flex items-center gap-1.5", collapsed && "justify-center")}>
            <Circle className={cn(
              "w-2 h-2 shrink-0",
              activeCount > 0
                ? "fill-amber-400 text-amber-400 animate-pulse"
                : "fill-emerald-400 text-emerald-400"
            )} />
            {!collapsed && (
              <span className={cn(
                "text-[10px] font-medium",
                activeCount > 0 ? "text-amber-400" : "text-emerald-400"
              )}>
                {activeCount > 0 ? `${activeCount} build${activeCount > 1 ? "s" : ""} running` : "Ready"}
              </span>
            )}
          </div>
        </div>

        {/* User profile */}
        {!collapsed ? (
          <Link
            href="/settings"
            className="flex items-center gap-2 pt-0.5 hover:opacity-80 transition-opacity"
          >
            <Avatar name={displayName} color={userColor} size="sm" />
            <p className="text-[11px] font-medium text-foreground truncate flex-1">{displayName}</p>
          </Link>
        ) : (
          <Link href="/settings" className="flex justify-center pt-0.5">
            <Avatar name={displayName} color={userColor} size="sm" />
          </Link>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="w-full flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed
            ? <ChevronRight className="w-3 h-3" />
            : <><ChevronLeft className="w-3 h-3" /><span>Collapse</span></>
          }
        </button>
      </div>
    </aside>
  );
}
