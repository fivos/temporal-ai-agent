import OpenAI from 'openai';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function callLLM(messages: Message[]): Promise<string> {
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
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return `Error calling LLM: ${error instanceof Error ? error.message : String(error)}`;
  }
} 
