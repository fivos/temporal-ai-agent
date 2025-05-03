import React from 'react';
import ChatComponent from '../../components/ChatComponent';

export default async function ChatPage({ params }: { params: { chatId: string } }) {
  // Await params to ensure it's fully resolved
  const chatId = params.chatId;
  return <ChatComponent chatId={chatId} />;
} 
