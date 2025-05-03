// If you see a type error for 'process', ensure you have @types/node installed: npm i --save-dev @types/node
import type { NextApiRequest, NextApiResponse } from 'next';
import { getTemporalClient } from '../../lib/temporalClient';
import { sendPromptSignal, getResponseQuery } from '../../workflows/chatAgent';

const TASK_QUEUE = 'chat-agent';
const MAX_POLLING_ATTEMPTS = 10;
const POLLING_INTERVAL_MS = 1000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: { message: 'Method Not Allowed' } });
  }

  const { prompt, workflowId } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: { message: 'Prompt is required.' } });
  }

  try {
    const client = await getTemporalClient();
    // Use a unique workflowId per chat/session/user
    const wfId = workflowId || 'chat-' + Math.random().toString(36).slice(2);

    let handle;
    
    if (workflowId) {
      try {
        // If a workflowId was provided, try to get the existing workflow
        handle = await client.workflow.getHandle(workflowId);
        
        // If found, just send the signal
        await handle.signal(sendPromptSignal, prompt);
      } catch (error) {
        // If workflow not found, use signalWithStart to create it
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

    // Poll for response with timeout
    let response = '';
    let attempts = 0;
    
    while (attempts < MAX_POLLING_ATTEMPTS) {
      response = await handle.query(getResponseQuery);
      
      // If we have a non-empty response, return it
      if (response) {
        break;
      }
      
      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS));
      attempts++;
    }

    return res.status(200).json({
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
    });
  } catch (error: any) {
    console.error('Completions API error:', error);
    return res.status(500).json({ error: { message: error.message || 'Internal Server Error' } });
  }
} 
