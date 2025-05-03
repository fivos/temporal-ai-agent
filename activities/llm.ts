import OpenAI from 'openai';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export type ChunkCallback = (chunk: string) => void;

export async function callLLM(
  messages: Message[], 
  chunkCallback?: ChunkCallback
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('OPENAI_API_KEY is not defined in environment variables');
    return 'Error: API key is missing. Please check your environment configuration.';
  }

  try {
    console.log('Calling OpenAI API with message history:', messages.length, 'messages');
    
    // Initialize the OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // If streaming is requested (callback provided)
    if (chunkCallback) {
      let fullResponse = '';

      // Call the OpenAI API with streaming enabled
      const stream = await openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: messages.map(msg => ({ role: msg.role, content: msg.content })),
        temperature: 0.7,
        tools: [{
          type: "function",
          function: {
            name: "web_search",
            description: "Search the web for information",
            parameters: {
              type: "object",
              properties: {},
              required: []
            }
          }
        }],
        stream: true,
      });

      // Process the stream chunks
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          chunkCallback(content);
        }
      }

      return fullResponse;
    }
    // Non-streaming fallback for backward compatibility
    else {
      // Call the OpenAI API using the SDK
      const response = await openai.responses.create({
        model: 'gpt-4.1',
        input: messages,
        temperature: 0.7,
        tools: [{"type": "web_search_preview"}],
      });
      
      // Log the structure to understand what's available
      console.log('Response structure:', Object.keys(response));
      
      // Get text content from the response (adjust based on actual structure)
      return response.output_text;
    }
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return `Error calling LLM: ${error instanceof Error ? error.message : String(error)}`;
  }
} 
