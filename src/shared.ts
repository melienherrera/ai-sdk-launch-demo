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