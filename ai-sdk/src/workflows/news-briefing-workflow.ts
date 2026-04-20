import '@temporalio/ai-sdk/lib/load-polyfills';
import { setHandler } from '@temporalio/workflow';
import type * as activities from '../activities/briefing';
import { proxyActivities } from '@temporalio/workflow';
import { generateText } from 'ai';
import { DailyBriefing, TopicSummary, TopicSearchResult, WorkflowProgress, getProgressQuery } from '../shared';
import { temporalProvider } from '@temporalio/ai-sdk';

const { searchTopicActivity } = proxyActivities<typeof activities>({
  startToCloseTimeout: '3 minutes',
  retry: {
    maximumAttempts: 3,
    initialInterval: '2s',
    backoffCoefficient: 2,
    maximumInterval: '30s',
  },
});

// Summarize the findings of a topic, pull out the most important information and key points
export async function summarizeTopic(searchResult: TopicSearchResult): Promise<TopicSummary> {
  console.log(`📝 Summarizing: ${searchResult.topic}...`);

  const { text } = await generateText({
    model: temporalProvider.languageModel('gpt-4o-mini'),
    prompt: `Summarize the following news findings about "${searchResult.topic}" into:
              1. A brief 2-3 sentence summary
              2. 3-5 key bullet points highlighting the most important developments and how it's relevant to AI and Temporal.

              Findings:
              ${searchResult.findings}

              Format your response as:
              SUMMARY: [your summary here]
              KEY POINTS:
              - [point 1]
              - [point 2]
              - [point 3]`,
  });

  const summaryMatch = text.match(/SUMMARY:\s*(.+?)(?=KEY POINTS:|$)/s);
  const keyPointsMatch = text.match(/KEY POINTS:\s*(.+)/s);

  const summary = summaryMatch ? summaryMatch[1].trim() : text;
  const keyPoints = keyPointsMatch
    ? keyPointsMatch[1].split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim().substring(1).trim())
    : [text];

  console.log(`✅ Summarized: ${searchResult.topic}`);

  return {
    topic: searchResult.topic,
    summary,
    keyPoints,
  };
}

// Generate a briefing from the summaries
export async function generateBriefing(summaries: TopicSummary[]): Promise<string> {
  console.log(`📰 Generating final briefing...`);

  const summariesText = summaries.map(s =>
    `Topic: ${s.topic}\nSummary: ${s.summary}\nKey Points:\n${s.keyPoints.map(p => `- ${p}`).join('\n')}`
  ).join('\n\n');

  const { text } = await generateText({
    model: temporalProvider.languageModel('gpt-4o-mini'),
    prompt: `You are creating a daily tech briefing for a Temporal employee working on durable AI solutions.

             Context: Temporal builds durable execution infrastructure for distributed systems. We're focused on
             making AI applications production-ready with reliability, fault tolerance, and long-running workflows.

             Review these topic summaries and create a briefing that highlights:
             - Developments relevant to durable agents, distributed systems, and production AI
             - How these trends might impact or intersect with Temporal's mission
             - Technologies, patterns, or challenges that relate to building reliable, long-running AI applications
             - Any news about workflow orchestration, observability, or developer experience

             Write in a professional but conversational tone. Start with an opening that ties themes to what
             matters for Temporal's AI and durable execution narrative. Present each topic's information through
             this lens, then conclude with key takeaways for someone building production-ready AI systems.

             This is not a letter. This is just a briefing and personal search findings for the day.

             Topic Summaries:
             ${summariesText}`,
  });

  console.log(`✅ Briefing generated!`);
  return text;
}

// MAIN WORKFLOW: Orchestrates all steps
export async function dailyBriefingWorkflow(topics: string[]): Promise<DailyBriefing> {
  // Register query handler as the very first statement — before any awaits —
  // so queries arriving during the first activity are answered correctly.
  const progress: WorkflowProgress = {
    currentPhase: 1,
    phases: [
      { phase: 1, label: 'Searching Topics', status: 'running' },
      { phase: 2, label: 'Summarizing Findings', status: 'pending' },
      { phase: 3, label: 'Generating Briefing', status: 'pending' },
    ],
    retryCount: 0,
  };
  setHandler(getProgressQuery, () => progress);

  console.log(`\n🚀 Starting Daily Tech Briefing Generation`);
  console.log(`📋 Topics: ${topics.join(', ')}\n`);

  // PHASE 1: Search all topics (in parallel)
  // searchTopicActivity intentionally fails on attempt 1 to demonstrate Temporal's automatic retry.
  console.log(`\n━━━ PHASE 1: Searching Topics ━━━`);
  progress.phases[0].status = 'running';
  const searchResults = await Promise.all(topics.map(topic => searchTopicActivity(topic)));
  progress.phases[0].status = 'completed';

  const totalSources = searchResults.reduce((acc, r) => acc + (r.sources?.length || 0), 0);
  console.log(`\n✅ Phase 1 Complete: Found ${totalSources} sources across ${topics.length} topics`);

  // PHASE 2: Summarize all findings (in parallel)
  console.log(`\n━━━ PHASE 2: Summarizing Findings ━━━`);
  progress.currentPhase = 2;
  progress.phases[1].status = 'running';
  const summaries = await Promise.all(searchResults.map(result => summarizeTopic(result)));
  progress.phases[1].status = 'completed';
  console.log(`\n✅ Phase 2 Complete: Summarized all topics`);

  // PHASE 3: Generate final briefing
  console.log(`\n━━━ PHASE 3: Generating Briefing ━━━`);
  progress.currentPhase = 3;
  progress.phases[2].status = 'running';
  const briefingText = await generateBriefing(summaries);
  progress.phases[2].status = 'completed';
  console.log(`\n✅ Phase 3 Complete: Final briefing ready`);

  return {
    date: new Date().toISOString().split('T')[0],
    topics: summaries,
    briefingText,
    totalSources,
  };
}
