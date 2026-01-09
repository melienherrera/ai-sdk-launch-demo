import { Connection, Client } from '@temporalio/client';
import { loadClientConnectConfig } from '@temporalio/envconfig';
import { dailyBriefingWorkflow } from './workflows';
import { nanoid } from 'nanoid';

async function run() {

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

  const config = loadClientConnectConfig();
  const connection = await Connection.connect(config.connectionOptions);
  const client = new Client({ connection });

  const handle = await client.workflow.start(dailyBriefingWorkflow, {
    taskQueue: 'ai-sdk',
    args: [topics],
    workflowId: 'workflow-' + nanoid(),
  });

  console.log(`Started workflow ${handle.workflowId}`);

  // optional: wait for workflow result
  console.log(await handle.result()); // Hello, Temporal!

}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
