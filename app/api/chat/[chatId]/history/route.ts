import { NextRequest, NextResponse } from 'next/server';
import { getTemporalClient } from '../../../../../lib/temporalClient';
import { getMessagesHistoryQuery } from '../../../../../workflows/chatAgent';

// Define Message interface to match the one in the workflow
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const { chatId } = params;

    if (!chatId) {
      return NextResponse.json(
        { error: { message: 'Chat ID is required' } },
        { status: 400 }
      );
    }

    const client = await getTemporalClient();

    try {
      // Get the workflow handle for the specified chatId
      const handle = await client.workflow.getHandle(chatId);
      
      // Query the workflow for message history
      const messageHistory: Message[] = await handle.query(getMessagesHistoryQuery);
      
      return NextResponse.json({
        id: chatId,
        history: messageHistory
      });
    } catch (error) {
      // If workflow not found
      return NextResponse.json(
        { error: { message: 'Chat not found' } },
        { status: 404 }
      );
    }
  } catch (error: any) {
    console.error('Chat history API error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Internal Server Error' } },
      { status: 500 }
    );
  }
} 
