import { NextRequest } from 'next/server';
import { getTemporalClient } from '../../../lib/temporalClient';
import { sendPromptSignal, getResponseQuery, getMessagesHistoryQuery, isStreamingQuery, getPartialResponseQuery } from '../../../workflows/chatAgent';

// Define Message interface to match the one in the workflow
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const TASK_QUEUE = 'chat-agent';
const MAX_POLLING_ATTEMPTS = 120; // Increased to allow more time for response
const POLLING_INTERVAL_MS = 500;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, workflowId, stream = false } = body;

    // Validate prompt is required
    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: { message: 'Prompt is required.' } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const client = await getTemporalClient();
    // Use a unique workflowId per chat/session/user
    const wfId = workflowId || 'chat-' + Math.random().toString(36).slice(2);

    let handle;
    
    // Get the initial message history (if it exists) before sending the new prompt
    // This helps us determine when a new response has been added
    let initialHistory: Message[] = [];
    let initialAssistantMessagesCount = 0;
    
    if (workflowId) {
      try {
        // If a workflowId was provided, try to get the existing workflow
        handle = await client.workflow.getHandle(workflowId);
        
        // Get the initial message history and count assistant messages before sending the prompt
        initialHistory = await handle.query(getMessagesHistoryQuery);
        initialAssistantMessagesCount = initialHistory.filter(msg => msg.role === 'assistant').length;
        console.log('Initial assistant messages count:', initialAssistantMessagesCount);
        
        // Send the signal for the new prompt
        await handle.signal(sendPromptSignal, prompt);
      } catch (error) {
        // If workflow not found, create a new one
        handle = await client.workflow.signalWithStart('chatAgentWorkflow', {
          taskQueue: TASK_QUEUE,
          workflowId: workflowId,
          signal: sendPromptSignal,
          signalArgs: [prompt],
        });
      }
    } else {
      // For a new chat, use signalWithStart with the generated ID
      handle = await client.workflow.signalWithStart('chatAgentWorkflow', {
        taskQueue: TASK_QUEUE,
        workflowId: wfId,
        signal: sendPromptSignal,
        signalArgs: [prompt],
      });
    }

    // If streaming is requested, use a streaming response
    if (stream) {
      // Create a stream response
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            let attempts = 0;
            let lastPartialResponse = '';
            let isComplete = false;

            while (attempts < MAX_POLLING_ATTEMPTS && !isComplete) {
              // Check if streaming is still in progress
              const isStreaming = await handle.query(isStreamingQuery);
              if (!isStreaming) {
                // If streaming is complete, we can check for the final message
                const messageHistory = await handle.query(getMessagesHistoryQuery);
                const lastMessage = messageHistory.filter(msg => msg.role === 'assistant').pop();
                if (lastMessage && lastMessage.content) {
                  // Ensure we only send new content that wasn't already streamed
                  if (lastMessage.content !== lastPartialResponse) {
                    controller.enqueue(encoder.encode(lastMessage.content.slice(lastPartialResponse.length)));
                  }
                }
                isComplete = true;
                break;
              }

              // Get the current partial response
              const currentPartial = await handle.query(getPartialResponseQuery);
              if (currentPartial && currentPartial !== lastPartialResponse) {
                // Only send the new content that hasn't been sent before
                const newContent = currentPartial.slice(lastPartialResponse.length);
                controller.enqueue(encoder.encode(newContent));
                lastPartialResponse = currentPartial;
              }

              // Wait before polling again
              await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS));
              attempts++;
            }

            // If we reached max polling attempts without completion
            if (!isComplete) {
              controller.enqueue(encoder.encode('\n[Stream timed out]'));
            }
            
            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
            controller.error(error);
          }
        }
      });

      // Return streaming response
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
          'X-Workflow-ID': workflowId || wfId
        }
      });
    } 
    // Non-streaming response (original behavior)
    else {
      // Poll for updated history with timeout
      let attempts = 0;
      let messageHistory: Message[] = [];
      let response = '';
      
      while (attempts < MAX_POLLING_ATTEMPTS) {
        // Get current message history
        messageHistory = await handle.query(getMessagesHistoryQuery);
        
        // Count current assistant messages
        const currentAssistantMessages = messageHistory.filter(msg => msg.role === 'assistant');
        const currentAssistantMessagesCount = currentAssistantMessages.length;
        
        console.log('Current assistant messages count:', currentAssistantMessagesCount);
        
        // Check if we have a new assistant message
        const hasNewAssistantMessage = 
          initialAssistantMessagesCount === 0 
            ? currentAssistantMessagesCount > 0 // For new chats, we need at least one assistant message
            : currentAssistantMessagesCount > initialAssistantMessagesCount; // For existing chats, we need more assistant messages than before
        
        if (hasNewAssistantMessage) {
          // If we have a new assistant message, get the last one
          const lastAssistantMessage = currentAssistantMessages[currentAssistantMessages.length - 1];
          if (lastAssistantMessage) {
            response = lastAssistantMessage.content;
            break;
          }
        }
        
        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS));
        attempts++;
      }

      // If we didn't get a response in time, but have history, still return what we have
      if (!response && messageHistory.length > 0) {
        const lastAssistantMessage = messageHistory.filter(msg => msg.role === 'assistant').pop();
        response = lastAssistantMessage?.content || 'No response received from LLM within the timeout period.';
      }

      return new Response(
        JSON.stringify({
          id: workflowId || wfId,
          object: 'chat.completion',
          choices: [
            {
              message: {
                role: 'assistant',
                content: response || 'No response received from LLM within the timeout period.',
              },
            },
          ],
          history: messageHistory // Still include message history in the response as a fallback
        }),
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'application/json',
            'X-Workflow-ID': workflowId || wfId
          } 
        }
      );
    }
  } catch (error: any) {
    console.error('Completions API error:', error);
    return new Response(
      JSON.stringify({ error: { message: error.message || 'Internal Server Error' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 
