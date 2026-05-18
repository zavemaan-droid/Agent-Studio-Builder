import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/studio", label: "Build", icon: "⚡" },
  { href: "/repair", label: "Repair", icon: "🔧" },
  { href: "/assets", label: "Assets", icon: "🖼️" },
  { href: "/projects", label: "Projects", icon: "📁" },
  { href: "/assistant", label: "Chat", icon: "💬" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
  { href: "/constraints", label: "Constraints", icon: "🎚️" },
  { href: "/legal", label: "Legal Gate", icon: "🛡️" },
  { href: "/agents", label: "Agents", icon: "🤖" },
  { href: "/memory", label: "Memory", icon: "🧠" },
];

export function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();

  return (
    <div className="mobile-hamburger-wrap md:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="mobile-hamburger-button"
        aria-label="Menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div className="mobile-app-title-wrap" aria-label="App name">
        <span className="mobile-app-title">Agent Studio</span>
        <span className="mobile-app-subtitle">AI Builder</span>
      </div>

      {isOpen && (
        <>
          <button
            className="mobile-hamburger-backdrop"
            aria-label="Close menu"
            onClick={() => setIsOpen(false)}
          />
          <div className="mobile-hamburger-menu">
            {NAV_ITEMS.map(({ href, label, icon }) => {
              const isActive = location === href || location.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "mobile-hamburger-item",
                    isActive && "mobile-hamburger-item-active"
                  )}
                >
                  <span className="mobile-hamburger-icon">{icon}</span>
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
