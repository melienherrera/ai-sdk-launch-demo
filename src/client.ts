import { Connection, Client } from '@temporalio/client';
import { loadClientConnectConfig } from '@temporalio/envconfig';
import { dailyBriefingWorkflow } from './workflows/news-briefing-workflow';
import { haikuAgent, toolsAgent } from './workflows/hello-world-workflow';
import { nanoid } from 'nanoid';
import { DailyBriefing } from './shared';

async function run() {
  const args = process.argv;
  const workflow = args[2] ?? 'haiku';

  const config = loadClientConnectConfig();
  const connection = await Connection.connect(config.connectionOptions);
  const client = new Client({ connection });

  let handle;
  
  switch (workflow) {
    case 'haiku': {
      const prompt = args[3] || 'Tell me about recursion';
      console.log("🎋 Generating haiku...");
      console.log("--------------------------------");
      handle = await client.workflow.start(haikuAgent, {
        taskQueue: 'ai-sdk',
        args: [prompt],
        workflowId: 'haiku-' + nanoid(),
      });
      break;
    }
    
    case 'agent': {
      const question = args[3] || 'What is the weather in Tokyo?';
      console.log("🤖 Running tools agent...");
      console.log("--------------------------------");
      handle = await client.workflow.start(toolsAgent, {
        taskQueue: 'ai-sdk',
        args: [question],
        workflowId: 'agent-' + nanoid(),
      });
      break;
    }
    
    case 'briefing': {
      const defaultTopics = [
        'TypeScript and JavaScript updates',
        'AI and LLM developments',
        'Durable Execution news',
        'New AI developer tools releases',
      ];
      
      const cliTopics = args.slice(3);
      const topics = cliTopics.length > 0 ? cliTopics : defaultTopics;
      
      if (cliTopics.length > 0) {
        console.log(`\n📝 Using custom topics from CLI: ${topics.length} topic(s)`);
      } else {
        console.log(`\n📝 Using default topics (pass custom topics as arguments to override)`);
      }
      
      handle = await client.workflow.start(dailyBriefingWorkflow, {
        taskQueue: 'ai-sdk',
        args: [topics],
        workflowId: 'briefing-' + nanoid(),
      });
      break;
    }
    
    default:
      throw new Error(`Unknown workflow type: ${workflow}. Use: haiku, agent, or briefing`);
  }

  console.log(`\n🔧 Started workflow ${handle.workflowId}`);

  // Wait for workflow result
  if (workflow === 'briefing') {
    const result = await handle.result() as DailyBriefing;
    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          📰  DAILY TECH BRIEFING                           ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`📅 Date: ${result.date}`);
    console.log(`📊 Topics Covered: ${result.topics.length}`);
    console.log(`🔗 Sources Referenced: ${result.totalSources}`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(result.briefingText);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } else {
    const result = await handle.result() as string;
    console.log('\n📝 Result:\n');
    console.log(result);
  }

}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
