import { defineQuery } from '@temporalio/workflow';

export interface TopicSearchResult {
  topic: string;
  findings: string;
  sources?: string[];
  timestamp: Date;
}

export interface TopicSummary {
  topic: string;
  summary: string;
  keyPoints: string[];
}

export interface DailyBriefing {
  date: string;
  topics: TopicSummary[];
  briefingText: string;
  totalSources: number;
}

export type PhaseStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface PhaseInfo {
  phase: number;
  label: string;
  status: PhaseStatus;
}

export interface WorkflowProgress {
  currentPhase: number;
  phases: PhaseInfo[];
  retryCount: number;
}

export const getProgressQuery = defineQuery<WorkflowProgress>('getProgress');
