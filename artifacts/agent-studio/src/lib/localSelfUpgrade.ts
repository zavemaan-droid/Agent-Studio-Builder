import { DEFAULT_AGENT_PROMPTS } from "@/contexts/StudioContext";
import type { AgentPrompts, UpgradeProposal } from "@/lib/types";

export function upgradeFingerprint(proposal: Pick<UpgradeProposal, "type" | "agentRole" | "before" | "after">): string {
  return `${proposal.type}:${proposal.agentRole ?? "system"}:${proposal.before}:::${proposal.after}`;
}

export function buildLocalUpgradeProposals(agentPrompts: AgentPrompts, alreadyInstalled: UpgradeProposal[] = []): UpgradeProposal[] {
  const installedKeys = new Set(alreadyInstalled.map(upgradeFingerprint));
  const roles: (keyof typeof DEFAULT_AGENT_PROMPTS)[] = ["architect", "builder", "designer", "qa", "packager"];

  const candidates: UpgradeProposal[] = roles.map((role, index) => {
    const before = agentPrompts[role] ?? DEFAULT_AGENT_PROMPTS[role] ?? "";
    const after = `${before}\n\nInstalled Builder Studio self-upgrade rules:\n- Check route wiring, button handlers, imports, and removed components before claiming a feature is fixed.\n- Treat approval as an automatic installer trigger, not as instructions for the user.\n- Save the solved problem and final working pattern to memory so the same proposal does not repeat.\n- Optimize layouts for Samsung Galaxy S20 FE 5G touch targets, safe area, and Android PWA behavior.`;

    return {
      id: `local-upgrade-${role}-${index}`,
      title: `${role[0].toUpperCase() + role.slice(1)} installer-aware upgrade`,
      description: `Hardens the ${role} agent so it checks wiring, install behavior, mobile layout, and memory before marking work complete.`,
      impact: index < 2 ? "high" : "medium",
      category: index < 2 ? "Builder Training Improvement" : "Optimization",
      riskLevel: "low",
      affectedAreas: ["Self Analyze", "Approval Installer", `${role} agent`, "Memory Bank"],
      expectedResult: "Approved upgrades install once, get remembered, and stop returning as repeated proposals.",
      rollbackNote: "Use Reset in Self Upgrade to restore default prompts if needed.",
      installerStatus: "pending_approval",
      installerLog: ["Local fallback proposal generated because AI proposal discovery was unavailable or incomplete."],
      type: "agent_prompt",
      agentRole: role,
      before,
      after,
    };
  });

  return candidates.filter(candidate => !installedKeys.has(upgradeFingerprint(candidate)));
}

export function normalizeUpgradeProposals(
  proposals: UpgradeProposal[],
  agentPrompts: AgentPrompts,
  alreadyInstalled: UpgradeProposal[] = []
): UpgradeProposal[] {
  const installedKeys = new Set(alreadyInstalled.map(upgradeFingerprint));

  return proposals
    .map((proposal, index) => {
      const before = proposal.agentRole ? (agentPrompts[proposal.agentRole] ?? proposal.before ?? "") : proposal.before ?? "";
      return {
        ...proposal,
        id: proposal.id || `upgrade-${Date.now()}-${index}`,
        before,
        category: proposal.category ?? "Builder Training Improvement",
        riskLevel: proposal.riskLevel ?? "low",
        affectedAreas: proposal.affectedAreas ?? ["Self Analyze", proposal.agentRole ? `${proposal.agentRole} agent` : "Builder Studio"],
        expectedResult: proposal.expectedResult ?? "Improves build reliability and reduces repeated self-upgrade suggestions.",
        rollbackNote: proposal.rollbackNote ?? "Use Reset in Self Upgrade to restore default prompts.",
        installerStatus: proposal.installerStatus ?? "pending_approval",
        installerLog: proposal.installerLog ?? ["Proposal normalized and ready for approval."],
      } satisfies UpgradeProposal;
    })
    .filter(proposal => !installedKeys.has(upgradeFingerprint(proposal)));
}
