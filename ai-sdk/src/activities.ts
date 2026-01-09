import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { temporalProvider } from '@temporalio/ai-sdk';
import { TopicSearchResult, TopicSummary } from './shared';


// ==========================================
// STEP 1: Search for news on a specific topic
// ==========================================
export async function searchTopicActivity(topic: string): Promise<TopicSearchResult> {
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
  export async function summarizeTopicActivity(searchResult: TopicSearchResult): Promise<TopicSummary> {
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
  export async function generateBriefingActivity(summaries: TopicSummary[]): Promise<string> {
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
  