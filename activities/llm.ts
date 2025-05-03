import fetch from 'node-fetch';

export async function callLLM(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('OPENAI_API_KEY is not defined in environment variables');
    return 'Error: API key is missing. Please check your environment configuration.';
  }

  try {
    console.log('Calling OpenAI API...');
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',  // Using a more widely available model
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error('OpenAI API error:', res.status, errorData);
      return `Error from OpenAI API: ${res.status} ${errorData}`;
    }

    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content || '';
    console.log('Received response from OpenAI');
    return content;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return `Error calling LLM: ${error instanceof Error ? error.message : String(error)}`;
  }
} 
