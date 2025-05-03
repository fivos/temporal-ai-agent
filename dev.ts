import 'dotenv/config';
import { Worker } from '@temporalio/worker';
import { spawn } from 'child_process';
import * as activities from './activities/llm';

// Start Next.js dev server
function startNextServer() {
  console.log('Starting Next.js development server...');
  const nextProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, PORT: '4000' },
  });

  nextProcess.on('error', (err) => {
    console.error('Failed to start Next.js server:', err);
  });

  // Make sure Next.js server is terminated when this process exits
  process.on('exit', () => {
    nextProcess.kill();
  });

  // Handle signals for graceful shutdown
  process.on('SIGINT', () => {
    nextProcess.kill();
    process.exit();
  });

  process.on('SIGTERM', () => {
    nextProcess.kill();
    process.exit();
  });
}

// Start Temporal worker
async function startTemporalWorker() {
  console.log('Starting Temporal worker...');
  try {
    const worker = await Worker.create({
      workflowsPath: require.resolve('./workflows/chatAgent'),
      activities,
      taskQueue: 'chat-agent',
    });
    
    await worker.run();
  } catch (err) {
    console.error('Temporal worker error:', err);
    process.exit(1);
  }
}

// Main function to start both services
async function main() {
  console.log('Starting development environment...');
  // Start Next.js in a separate process
  startNextServer();
  
  // Start Temporal worker in this process
  await startTemporalWorker();
}

// Run the main function
main().catch((err) => {
  console.error('Development startup error:', err);
  process.exit(1);
}); 
