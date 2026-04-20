import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { Context } from '@temporalio/activity';
import { TopicSearchResult } from '../shared';

// Activity that uses a web search news on a specific topic.
// Intentionally fails on the first attempt to demonstrate Temporal's automatic retry.
export async function searchTopicActivity(topic: string): Promise<TopicSearchResult> {
  const attempt = Context.current().info.attempt;

  if (attempt < 2) {
    console.log(`⚠️  searchTopicActivity attempt ${attempt} — simulating transient failure to demo retry...`);
    throw new Error(`Simulated transient failure on attempt ${attempt} (Temporal will retry automatically)`);
  }

  console.log(`🔍 Searching for: ${topic}... (attempt ${attempt})`);

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
