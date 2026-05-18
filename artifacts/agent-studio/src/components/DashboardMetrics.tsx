import { Bot, Star, Package } from "lucide-react";

export function DashboardMetrics({ activeAgents, upgradesApplied, appsBuilt }: {
  activeAgents: number;
  upgradesApplied: number;
  appsBuilt: number;
}) {
  return (
    <div className="premium-metrics-grid">
      <div className="premium-metric-card metric-violet">
        <div>
          <p className="premium-metric-label">ACTIVE AGENTS</p>
          <p className="premium-metric-number">{activeAgents}</p>
        </div>
        <Bot className="premium-metric-icon" />
      </div>

      <div className="premium-metric-card metric-emerald">
        <div>
          <p className="premium-metric-label">UPGRADES APPLIED</p>
          <p className="premium-metric-number">{upgradesApplied}</p>
        </div>
        <Star className="premium-metric-icon" />
      </div>

      <div className="premium-metric-card metric-amber">
        <div>
          <p className="premium-metric-label">APPS BUILT</p>
          <p className="premium-metric-number">{appsBuilt}</p>
        </div>
        <Package className="premium-metric-icon" />
      </div>
    </div>
  );
}
