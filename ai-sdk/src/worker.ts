import { NativeConnection, Worker } from '@temporalio/worker';
import * as briefingActivities from './activities/briefing';
import * as helloWorldActivities from './activities/hello-world';
import { AiSdkPlugin } from '@temporalio/ai-sdk';
import { openai } from '@ai-sdk/openai';
import path from 'path';

async function run() {
  const connection = await NativeConnection.connect({
    address: 'localhost:7233',
  });
  try {
    const worker = await Worker.create({
      plugins: [
        new AiSdkPlugin({
          modelProvider: openai,
        }),
      ],
      connection,
      namespace: 'default',
      taskQueue: 'ai-sdk',
      // Workflows are registered using a path as they run in a separate JS context.
      // When workflows is a directory, point to it directly
      workflowsPath: path.join(__dirname, 'workflows'),
      activities: {
        ...briefingActivities,
        ...helloWorldActivities,
      },
    });

    await worker.run();
  } finally {
    // Close the connection once the worker has stopped
    await connection.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
