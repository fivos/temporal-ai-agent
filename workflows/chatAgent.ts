import { proxyActivities, defineSignal, defineQuery, setHandler } from '@temporalio/workflow';

// Define Message type for storing history
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const { callLLM } = proxyActivities<{ callLLM(messages: Message[]): Promise<string> }>({
  startToCloseTimeout: '1 minute',
});

export const sendPromptSignal = defineSignal<[string]>('sendPrompt');
export const getResponseQuery = defineQuery<string>('getResponse');
export const getMessagesHistoryQuery = defineQuery<Message[]>('getMessagesHistory');

export async function chatAgentWorkflow(): Promise<void> {
  let lastResponse = '';
  // Initialize message history array
  const messageHistory: Message[] = [];
  
  // Set up the signal handler for receiving prompts
  setHandler(sendPromptSignal, async (prompt: string) => {
    console.log('Received prompt signal:', prompt);
    try {
      // Add user message to history
      messageHistory.push({ role: 'user', content: prompt });
      
      // Call the LLM with the full message history
      lastResponse = await callLLM(messageHistory);
      
      // Add assistant response to history
      messageHistory.push({ role: 'assistant', content: lastResponse });
      
      console.log('Stored LLM response and updated message history');
    } catch (error) {
      console.error('Error in signal handler:', error);
      lastResponse = `Error processing prompt: ${error}`;
      
      // Even on error, add the error response to history
      messageHistory.push({ role: 'assistant', content: lastResponse });
    }
  });

  // Query handler to get the last response
  setHandler(getResponseQuery, () => {
    console.log('Query for response, returning:', lastResponse ? 'response available' : 'no response yet');
    return lastResponse;
  });
  
  // Query handler to get the full message history
  setHandler(getMessagesHistoryQuery, () => {
    console.log('Query for message history, length:', messageHistory.length);
    return messageHistory;
  });

  // Keep the workflow alive
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 1000 * 60 * 60));
  }
} 
