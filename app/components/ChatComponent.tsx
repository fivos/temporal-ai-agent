'use client';

import React, { useState, useRef, FormEvent, useEffect } from 'react';
import { IconMicrophone, IconSend, IconChevronDown } from '@tabler/icons-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type Model = 'GPT-4o' | 'GPT-4.1' | 'Claude 3.5' | 'Gemini 2.5' | 'Grok 3' | 'Perplexity Sonar';

export default function ChatComponent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [workflowId, setWorkflowId] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<Model>('GPT-4o');
  const inputRef = useRef<HTMLInputElement>(null);

  const models: Model[] = ['GPT-4o', 'GPT-4.1', 'Claude 3.5', 'Gemini 2.5', 'Grok 3', 'Perplexity Sonar'];

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
          workflowId: workflowId || undefined
        }),
      });
      const data = await res.json();
      if (data.id && !workflowId) {
        setWorkflowId(data.id);
      }
      const assistantReply = data.choices?.[0]?.message?.content || 'No response';
      setMessages([...newMessages, { role: 'assistant' as const, content: assistantReply }]);
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
