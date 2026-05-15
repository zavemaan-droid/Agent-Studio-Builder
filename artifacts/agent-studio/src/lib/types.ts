export type Platform = "web" | "android";
export type BuildStatus = "building" | "ready" | "failed";
export type AgentRole = "architect" | "builder" | "designer" | "qa" | "packager" | "analyzer" | "reconstructor" | "polisher";

export interface AgentStep {
  role: AgentRole;
  name: string;
  status: "queued" | "running" | "retrying" | "done" | "error";
  attempt?: number;
  output: string;
  startedAt?: number;
  finishedAt?: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  platform: Platform;
  status: BuildStatus;
  createdAt: number;
  updatedAt: number;
  steps: AgentStep[];
  manifest?: string;
  files?: { path: string; content: string }[];
  uploadedFrom?: string;
  imported?: boolean;
}

export interface MemoryEntry {
  id: string;
  type: "doc" | "issue" | "solution" | "snippet";
  title: string;
  body: string;
  tags: string[];
  autoInclude: boolean;
  createdAt: number;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  trained: boolean;
}

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  agentLabel: string;
  color: string;
  lessons: Lesson[];
}

export interface AppSettings {
  groqKey: string;
  githubToken: string;
  githubRepo: string;
  autoDownload: boolean;
  liveCodeFeed: boolean;
  selfUpgrading: boolean;
  browserEnabled: boolean;
  webResearchEnabled: boolean;
  memoryRecallEnabled: boolean;
  voiceIdentityEnabled: boolean;
  trustedSpeakerName: string;
  selectedPlatform: Platform;
  userName: string;
  userColor: string;
  voiceName: string;
  voiceRate: number;
  voicePitch: number;
  wakeWordEnabled: boolean;
}

export interface AssistantAction {
  type: "addMemory" | "upgradeAgent" | "updateSetting" | "featureRequest" | "addTemplate" | "startBuild" | "scanCode";
  label: string;
  data: Record<string, unknown>;
  appliedAt: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
  actions?: AssistantAction[];
}

export type UpgradeCategory =
  | "Repair"
  | "Optimization"
  | "Enhancement"
  | "New Feature"
  | "UI/Design Improvement"
  | "Security Improvement"
  | "Performance Improvement"
  | "Builder Training Improvement";

export type InstallerStatus = "pending_approval" | "approved" | "installing" | "installed" | "failed" | "rolled_back";

export interface UpgradeProposal {
  id: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  category?: UpgradeCategory;
  riskLevel?: "low" | "medium" | "high";
  affectedAreas?: string[];
  expectedResult?: string;
  rollbackNote?: string;
  installerStatus?: InstallerStatus;
  installerLog?: string[];
  type: "agent_prompt" | "system_behavior";
  agentRole?: string;
  before: string;
  after: string;
  approvedAt?: number;
  installedAt?: number;
  appliedAt?: number;
}

export type AgentPrompts = Record<string, string>;
