import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

// ==========================================
// DAILY TECH BRIEFING GENERATOR
// Vanilla AI SDK Version (No Temporal)
// ==========================================

interface TopicSearchResult {
  topic: string;
  findings: string;
  sources?: string[];
  timestamp: Date;
}

interface TopicSummary {
  topic: string;
  summary: string;
  keyPoints: string[];
}

interface DailyBriefing {
  date: string;
  topics: TopicSummary[];
  briefingText: string;
  totalSources: number;
}

// ==========================================
// STEP 1: Search for news on a specific topic
// ==========================================
async function searchTopic(topic: string): Promise<TopicSearchResult> {
  console.log(`🔍 Searching for: ${topic}...`);
  
  const { text, sources } = await generateText({
    model: openai('gpt-4o-mini'),
    prompt: `Find the latest news and developments about "${topic}" from the past week. 
             Focus on significant updates, releases, and trends.`,
    tools: {
      web_search: openai.tools.webSearch({
        searchContextSize: 'medium',
      }),
    },
  });

  console.log(`✅ Found information for: ${topic}`);
  
  return {
    topic,
    findings: text,
    sources: sources?.map(s => s.sourceType === 'url' ? s.url : 'Unknown source'),
    timestamp: new Date(),
  };
}

// ==========================================
// STEP 2: Summarize findings into key points
// ==========================================
async function summarizeTopic(searchResult: TopicSearchResult): Promise<TopicSummary> {
  console.log(`📝 Summarizing: ${searchResult.topic}...`);
  
  const { text } = await generateText({
    model: openai('gpt-4o-mini'),
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

  // Parse the response
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

// ==========================================
// STEP 3: Generate final briefing from all summaries
// ==========================================
async function generateBriefing(summaries: TopicSummary[]): Promise<string> {
  console.log(`📰 Generating final briefing...`);
  
  const summariesText = summaries.map(s => 
    `Topic: ${s.topic}\nSummary: ${s.summary}\nKey Points:\n${s.keyPoints.map(p => `- ${p}`).join('\n')}`
  ).join('\n\n');
  
  const { text } = await generateText({
    model: openai('gpt-4o-mini'),
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
             
             Topic Summaries:
             ${summariesText}`,
  });

  console.log(`✅ Briefing generated!`);
  return text;
}

// ==========================================
// MAIN WORKFLOW: Orchestrates all steps
// ==========================================
export async function dailyBriefingWorkflow(topics: string[]): Promise<DailyBriefing> {
  console.log(`\n🚀 Starting Daily Tech Briefing Generation`);
  console.log(`📋 Topics: ${topics.join(', ')}\n`);
  
  const startTime = Date.now();
  
  try {
    // PHASE 1: Search all topics (in parallel)
    console.log(`\n━━━ PHASE 1: Searching Topics ━━━`);
    const searchResults = await Promise.all(
      topics.map(topic => searchTopic(topic))
    );
    
    const totalSources = searchResults.reduce((acc, r) => acc + (r.sources?.length || 0), 0);
    console.log(`\n✅ Phase 1 Complete: Found ${totalSources} sources across ${topics.length} topics`);
    
    // PHASE 2: Summarize all findings (in parallel)
    console.log(`\n━━━ PHASE 2: Summarizing Findings ━━━`);
    const summaries = await Promise.all(
      searchResults.map(result => summarizeTopic(result))
    );
    console.log(`\n✅ Phase 2 Complete: Summarized all topics`);
    
    // PHASE 3: Generate final briefing
    console.log(`\n━━━ PHASE 3: Generating Briefing ━━━`);
    const briefingText = await generateBriefing(summaries);
    console.log(`\n✅ Phase 3 Complete: Final briefing ready`);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n⏱️  Total time: ${duration}s`);
    
    return {
      date: new Date().toISOString().split('T')[0],
      topics: summaries,
      briefingText,
      totalSources,
    };
    
  } catch (error) {
    console.error(`\n❌ WORKFLOW FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(`💔 All progress lost - would need to restart from the beginning`);
    throw error;
  }
}

// ==========================================
// CLI Runner
// ==========================================
async function main() {
  const defaultTopics = [
    'TypeScript and JavaScript updates',
    'AI and LLM developments',
    'Cloud infrastructure news',
    'Developer tools releases',
  ];
  
  // Get topics from CLI arguments (everything after the script name)
  const cliTopics = process.argv.slice(2);
  const topics = cliTopics.length > 0 ? cliTopics : defaultTopics;
  
  if (cliTopics.length > 0) {
    console.log(`\n📝 Using custom topics from CLI: ${topics.length} topic(s)`);
  } else {
    console.log(`\n📝 Using default topics (pass custom topics as arguments to override)`);
  }
  
  const result = await dailyBriefingWorkflow(topics);
  
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          📰  DAILY TECH BRIEFING                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`📅 Date: ${result.date}`);
  console.log(`📊 Topics Covered: ${result.topics.length}`);
  console.log(`🔗 Sources Referenced: ${result.totalSources}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(result.briefingText);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});