import 'dotenv/config';
import { Worker } from '@temporalio/worker';
import * as activities from './activities/llm';

async function run() {
  const worker = await Worker.create({
    workflowsPath: require.resolve('./workflows/chatAgent'),
    activities,
    taskQueue: 'chat-agent',
  });
  await worker.run();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
}); 
