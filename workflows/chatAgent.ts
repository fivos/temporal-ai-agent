import { proxyActivities, defineSignal, defineQuery, setHandler } from '@temporalio/workflow';

const { callLLM } = proxyActivities<{ callLLM(prompt: string): Promise<string> }>({
  startToCloseTimeout: '1 minute',
});

export const sendPromptSignal = defineSignal<[string]>('sendPrompt');
export const getResponseQuery = defineQuery<string>('getResponse');

export async function chatAgentWorkflow(): Promise<void> {
  let lastResponse = '';
  
  // Set up the signal handler for receiving prompts
  setHandler(sendPromptSignal, async (prompt: string) => {
    console.log('Received prompt signal:', prompt);
    try {
      // Call the LLM and store the response
      lastResponse = await callLLM(prompt);
      console.log('Stored LLM response');
    } catch (error) {
      console.error('Error in signal handler:', error);
      lastResponse = `Error processing prompt: ${error}`;
    }
  });

  // Query handler to get the last response
  setHandler(getResponseQuery, () => {
    console.log('Query for response, returning:', lastResponse ? 'response available' : 'no response yet');
    return lastResponse;
  });

  // Keep the workflow alive
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 1000 * 60 * 60));
  }
} 
