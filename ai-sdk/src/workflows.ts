import '@temporalio/ai-sdk/lib/load-polyfills';
import type * as activities from './activities';
import { proxyActivities } from '@temporalio/workflow';
import { DailyBriefing } from './shared';

const { searchTopicActivity, summarizeTopicActivity, generateBriefingActivity } = proxyActivities<typeof activities>({
  startToCloseTimeout: '3 minutes',
  retry: {
    maximumAttempts: 3,
    initialInterval: '2s',
    backoffCoefficient: 2,
    maximumInterval: '30s',
  },
});

// ==========================================
// MAIN WORKFLOW: Orchestrates all steps
// ==========================================
export async function dailyBriefingWorkflow(topics: string[]): Promise<DailyBriefing> {
  console.log(`\n🚀 Starting Daily Tech Briefing Generation`);
  console.log(`📋 Topics: ${topics.join(', ')}\n`);
  
  // PHASE 1: Search all topics (in parallel)
  console.log(`\n━━━ PHASE 1: Searching Topics ━━━`);
  const searchResults = await Promise.all(
    topics.map(topic => searchTopicActivity(topic))
  );
  
  const totalSources = searchResults.reduce((acc, r) => acc + (r.sources?.length || 0), 0);
  console.log(`\n✅ Phase 1 Complete: Found ${totalSources} sources across ${topics.length} topics`);
  
  // PHASE 2: Summarize all findings (in parallel)
  console.log(`\n━━━ PHASE 2: Summarizing Findings ━━━`);
  const summaries = await Promise.all(
    searchResults.map(result => summarizeTopicActivity(result))
  );
  console.log(`\n✅ Phase 2 Complete: Summarized all topics`);
  
  // PHASE 3: Generate final briefing
  console.log(`\n━━━ PHASE 3: Generating Briefing ━━━`);
  const briefingText = await generateBriefingActivity(summaries);
  console.log(`\n✅ Phase 3 Complete: Final briefing ready`);
  
  return {
    date: new Date().toISOString().split('T')[0],
    topics: summaries,
    briefingText,
    totalSources,
  };  
} 
