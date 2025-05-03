import { proxyActivities, defineSignal, defineQuery, setHandler } from '@temporalio/workflow';
import { ChunkCallback } from '../activities/llm';

// Define Message type for storing history
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const { callLLM } = proxyActivities<{ 
  callLLM(messages: Message[], chunkCallback?: ChunkCallback): Promise<string> 
}>({
  startToCloseTimeout: '1 minute',
});

export const sendPromptSignal = defineSignal<[string]>('sendPrompt');
export const getResponseQuery = defineQuery<string>('getResponse');
export const getMessagesHistoryQuery = defineQuery<Message[]>('getMessagesHistory');

// New query to check if a response is being streamed
export const isStreamingQuery = defineQuery<boolean>('isStreaming');
// Query to get latest partial response during streaming
export const getPartialResponseQuery = defineQuery<string>('getPartialResponse');

export async function chatAgentWorkflow(): Promise<void> {
  let lastResponse = '';
  let partialResponse = '';
  let isStreaming = false;
  // Initialize message history array
  const messageHistory: Message[] = [];
  
  // Set up the signal handler for receiving prompts
  setHandler(sendPromptSignal, async (prompt: string) => {
    console.log('Received prompt signal:', prompt);
    try {
      // Reset state for new request
      lastResponse = '';
      partialResponse = '';
      isStreaming = true;
      
      // Add user message to history
      messageHistory.push({ role: 'user', content: prompt });
      
      // Call the LLM with the full message history and streaming callback
      lastResponse = await callLLM(messageHistory, (chunk) => {
        // Update the partial response as chunks arrive
        partialResponse += chunk;
      });
      
      // Add assistant response to history
      messageHistory.push({ role: 'assistant', content: lastResponse });
      
      console.log('Stored LLM response and updated message history');
      isStreaming = false;
    } catch (error) {
      console.error('Error in signal handler:', error);
      lastResponse = `Error processing prompt: ${error}`;
      
      // Even on error, add the error response to history
      messageHistory.push({ role: 'assistant', content: lastResponse });
      isStreaming = false;
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
  
  // Query handler to check if a response is currently being streamed
  setHandler(isStreamingQuery, () => {
    return isStreaming;
  });
  
  // Query handler to get the current partial response during streaming
  setHandler(getPartialResponseQuery, () => {
    return partialResponse;
  });

  // Keep the workflow alive
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 1000 * 60 * 60));
  }
} 
