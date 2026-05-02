export type Platform = "web" | "android";
export type BuildStatus = "building" | "ready" | "failed";
export type AgentRole = "architect" | "builder" | "designer" | "qa" | "packager";

export interface AgentStep {
  role: AgentRole;
  name: string;
  status: "queued" | "running" | "done" | "error";
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
  selectedPlatform: Platform;
}

export interface AssistantAction {
  type: "addMemory" | "upgradeAgent" | "updateSetting" | "featureRequest" | "addTemplate";
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

export interface UpgradeProposal {
  id: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  type: "agent_prompt" | "system_behavior";
  agentRole?: string;
  before: string;
  after: string;
  appliedAt?: number;
}

export type AgentPrompts = Record<string, string>;
