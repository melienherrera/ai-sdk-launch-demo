import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { TopicSearchResult } from '../shared';

// Activity that uses a web search news on a specific topic
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
  