import { Connection, Client } from '@temporalio/client';
import { loadClientConnectConfig } from '@temporalio/envconfig';
import { haikuAgent, toolsAgent} from './workflows';
import { nanoid } from 'nanoid';

async function run() {

  const args = process.argv;
  const workflow = args[2] ?? 'haiku';
  const user_prompt = args[3] || 'Tell me about recursion';

  const config = loadClientConnectConfig();
  const connection = await Connection.connect(config.connectionOptions);
  const client = new Client({ connection });

  let handle;
  switch (workflow) {
    case 'haiku':
      console.log("Generating haiku...");
      console.log("--------------------------------");
      handle = await client.workflow.start(haikuAgent, {
        taskQueue: 'ai-sdk',
        args: [user_prompt],
        workflowId: 'workflow-' + nanoid(),
      });
      break;
    case 'agent':
      handle = await client.workflow.start(toolsAgent, {
        taskQueue: 'ai-sdk',
        args: ['What is the weath er in Tokyo?'],
        workflowId: 'workflow-' + nanoid(),
      });
      break;
    default:
      throw new Error('Unknown workflow type: ' + workflow);
  }

  console.log(`Started workflow ${handle.workflowId}`);

  // optional: wait for workflow result
  console.log(await handle.result()); // Hello, Temporal!

}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
