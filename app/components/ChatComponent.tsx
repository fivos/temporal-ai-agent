'use client';

import React, { useState, useRef, FormEvent, useEffect } from 'react';
import { IconMicrophone, IconSend, IconChevronDown } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type Model = 'GPT-4o' | 'GPT-4.1' | 'Claude 3.5' | 'Gemini 2.5' | 'Grok 3' | 'Perplexity Sonar';

interface ChatComponentProps {
  chatId?: string;
}

export default function ChatComponent({ chatId }: ChatComponentProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model>('GPT-4o');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const models: Model[] = ['GPT-4o', 'GPT-4.1', 'Claude 3.5', 'Gemini 2.5', 'Grok 3', 'Perplexity Sonar'];

  // Load message history from the backend if chatId exists
  useEffect(() => {
    if (chatId) {
      const fetchHistory = async () => {
        setLoading(true);
        try {
          // Use the dedicated history endpoint
          const res = await fetch(`/api/chat/${chatId}/history`);
          
          if (!res.ok) {
            throw new Error(`Failed to fetch history: ${res.status}`);
          }
          
          const data = await res.json();
          
          if (data.history && Array.isArray(data.history) && data.history.length > 0) {
            setMessages(data.history);
          }
        } catch (err) {
          console.error('Failed to fetch message history:', err);
        } finally {
          setLoading(false);
        }
      };
      
      fetchHistory();
    }
  }, [chatId]);

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const newMessages = [...messages, { role: 'user' as const, content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: input,
          workflowId: chatId,
          stream: true
        }),
      });
      const data = await res.json();
      
      // If this is the first message and we don't have a chatId yet, redirect to the chat page with the new ID
      if (data.id && !chatId) {
        router.push(`/chat/${data.id}`);
        return;
      }
      
      const assistantReply = data.choices?.[0]?.message?.content || 'No response';
      
      // After sending a message, refresh the history from the dedicated endpoint
      if (data.id) {
        try {
          const historyRes = await fetch(`/api/chat/${data.id}/history`);
          if (historyRes.ok) {
            const historyData = await historyRes.json();
            if (historyData.history && Array.isArray(historyData.history)) {
              setMessages(historyData.history);
              setLoading(false);
              inputRef.current?.focus();
              return;
            }
          }
        } catch (historyErr) {
          console.error('Failed to fetch updated history:', historyErr);
        }
      }
      
      // Fallback to using the history from the completions response
      if (data.history && Array.isArray(data.history)) {
        setMessages(data.history);
      } else {
        // Last resort: client-side state management if history not available
        setMessages([...newMessages, { role: 'assistant' as const, content: assistantReply }]);
      }
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant' as const, content: 'Error: Could not get response.' }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="main-container">
      <div className="chat-container">
        {messages.length === 0 && (
          <div className="header">
            <h1>Looking to move faster? Tell me what you need help with</h1>
            
            <div className="model-buttons">
              {models.map((model) => (
                <button
                  key={model}
                  className={`model-button ${selectedModel === model ? 'active' : ''}`}
                  onClick={() => setSelectedModel(model)}
                >
                  {selectedModel === model ? `✓ ${model}` : model}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div className="message-list">
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.role}`}>
                {msg.content}
              </div>
            ))}
            {loading && (
              <div className="loading">
                Assistant is typing...
              </div>
            )}
          </div>
        )}

        <form onSubmit={sendMessage} className="input-container">
          <button type="button" className="icon-button" title="Voice input">
            <IconMicrophone size={20} />
          </button>
          
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Talk with AI"
            className="input-field"
            disabled={loading}
          />
          
          <div className="model-selector">
            {selectedModel}
            <IconChevronDown size={16} />
          </div>
          
          <button 
            type="submit" 
            className={`icon-button send-button ${!input.trim() || loading ? 'disabled' : ''}`}
            disabled={!input.trim() || loading}
          >
            <IconSend size={20} />
          </button>
        </form>
      </div>
    </div>
  );
} 
