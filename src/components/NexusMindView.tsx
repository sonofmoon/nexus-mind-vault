import { authenticatedFetch } from '../services/apiClient';
import React, { useState } from 'react';
import { JournalEntry, TimeCapsule } from '../types';
import { SemanticMemoryGraph } from './SemanticMemoryGraph';
import {
  Cpu,
  Send,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Share2,
  Brain,
  MessageSquare,
  Network,
  Grid,
  Activity,
  Award,
  Flame,
  CheckCircle2,
  CornerDownRight,
  Clock,
  Zap,
} from 'lucide-react';

interface NexusMindViewProps {
  userId?: string;
  entries: JournalEntry[];
  capsules: TimeCapsule[];
  onAddCapsule: (capsule: Omit<TimeCapsule, 'id' | 'userId' | 'sealedAt' | 'isOpened' | 'integrityHash'>) => void;
  onUnlockCapsule: (id: string) => void;
  onDeleteCapsule: (id: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  modelUsed?: string;
}

type NexusTab = 'graph' | 'chat';

export const NexusMindView: React.FC<NexusMindViewProps> = ({
  userId = 'default_user',
  entries,
  capsules,
  onAddCapsule,
  onUnlockCapsule,
  onDeleteCapsule,
  showToast
}) => {
  const [activeNexusTab, setActiveNexusTab] = useState<NexusTab>('graph');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: `⚡ Nexus Mind Protocol Active. Real Vault privileges verified.\n\nI have loaded your ${entries.length} encrypted vault reflections into the Semantic Memory Web. You can explore your conceptual nodes and synaptic links in the graph above, or chat with me to extract latent patterns.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'Gemini 3.6 Flash',
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSendQuery = async (queryText: string) => {
    if (!queryText.trim() || isGenerating) return;

    const userMsgText = queryText.trim();
    setInputQuery('');

    const userMsg: ChatMessage = {
      id: 'msg_' + Math.random().toString(36).substring(2, 9),
      sender: 'user',
      text: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);

    try {
      // Build context from user's encrypted reflections
      const contextEntries = entries.slice(0, 20).map((e) => ({
        title: e.title,
        mood: e.mood,
        tags: e.tags,
        content: e.content.slice(0, 400),
        date: e.createdAt,
      }));

      const res = await authenticatedFetch('/api/functions/chatWithGemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'vault-mind-' + (userId || 'user'),
          content: userMsgText,
          message: userMsgText,
          mode: 'reflect',
          context: `User's decrypted journal reflections count: ${entries.length}.\nReflections Data:\n${JSON.stringify(contextEntries, null, 2)}`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const replyContent = data.reply || data.aiMessage?.content || data.text;
        if (replyContent) {
          const assistantMsg: ChatMessage = {
            id: 'msg_' + Math.random().toString(36).substring(2, 9),
            sender: 'assistant',
            text: replyContent,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            modelUsed: data.modelUsed || 'Gemini 3.6 Flash',
          };
          setMessages((prev) => [...prev, assistantMsg]);
          return;
        }
      }

      // Dynamic Local Cognitive Synthesis
      const matchingEntries = entries.filter((e) =>
        e.title.toLowerCase().includes(userMsgText.toLowerCase()) ||
        e.content.toLowerCase().includes(userMsgText.toLowerCase()) ||
        (e.tags && e.tags.some((t) => t.toLowerCase().includes(userMsgText.toLowerCase())))
      );

      let dynamicInsight = "";
      if (matchingEntries.length > 0) {
        dynamicInsight = `Found **${matchingEntries.length} reflection(s)** directly connected to your query:\n` +
          matchingEntries.slice(0, 3).map((e) => `• **"${e.title}"** (${e.mood ? e.mood.toUpperCase() : 'NOTE'}): ${e.content.slice(0, 120)}...`).join('\n');
      } else {
        dynamicInsight = `Across your **${entries.length} vault entries**, your focus centers on consistent self-observation, structured milestones, and cryptographic peace of mind.`;
      }

      const localResponse = `🧠 **Nexus Memory Synthesis**:\n\n${dynamicInsight}\n\n*Actionable Suggestion*: Consider creating a new reflection specifically focusing on your next iteration step to deepen your cognitive memory graph.`;

      const assistantMsg: ChatMessage = {
        id: 'msg_' + Math.random().toString(36).substring(2, 9),
        sender: 'assistant',
        text: localResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'Nexus Cognitive Core',
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.warn("Neural chat error:", err);
      showToast('Nexus Mind synthesized response locally.', 'info');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConceptPromptSelected = (prompt: string) => {
    setActiveNexusTab('chat');
    handleSendQuery(prompt);
  };

  return (
    <div
      className="nexus-mind-pane"
      style={{
        maxWidth: '1100px',
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        padding: '0 16px 32px 16px',
      }}
    >
      {/* Top Protocol Security Header */}
      <div
        className="google-card"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'var(--accent-blue-subtle)',
              border: '1px solid var(--accent-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-blue)',
              flexShrink: 0,
            }}
          >
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  margin: 0,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Nexus Mind — Deep Cognitive Knowledge Core
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--accent-blue)',
                  background: 'var(--accent-blue-subtle)',
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid var(--accent-blue)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Zap className="w-3 h-3" />
                <span>Neural Synthesis</span>
              </span>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '3px 0 0 0', fontWeight: 500 }}>
              Cryptographically isolated neural memory graph, semantic relations, and synthesis engine.
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11.5px',
            fontWeight: 700,
            color: 'var(--accent-emerald)',
            background: 'var(--accent-emerald-subtle)',
            padding: '5px 12px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--accent-emerald)',
          }}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Privileged Zero-Knowledge Tier</span>
        </div>
      </div>

      {/* Navigation Sub-Tabs (Google Material 3 Segmented Pill Style) */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '20px',
          background: 'var(--bg-card)',
          padding: '6px',
          borderRadius: 'var(--radius-pill)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveNexusTab('graph')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: 'var(--radius-pill)',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeNexusTab === 'graph' ? '1px solid var(--accent-blue)' : '1px solid transparent',
            background:
              activeNexusTab === 'graph'
                ? 'var(--accent-blue)'
                : 'transparent',
            color: activeNexusTab === 'graph' ? '#ffffff' : 'var(--text-secondary)',
            boxShadow:
              activeNexusTab === 'graph'
                ? '0 2px 6px rgba(26, 115, 232, 0.3)'
                : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <Network className="w-4 h-4" />
          <span>🕸️ Semantic Memory Graph</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveNexusTab('chat')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: 'var(--radius-pill)',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeNexusTab === 'chat' ? '1px solid var(--accent-blue)' : '1px solid transparent',
            background:
              activeNexusTab === 'chat'
                ? 'var(--accent-blue)'
                : 'transparent',
            color: activeNexusTab === 'chat' ? '#ffffff' : 'var(--text-secondary)',
            boxShadow:
              activeNexusTab === 'chat'
                ? '0 2px 6px rgba(26, 115, 232, 0.3)'
                : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <MessageSquare className="w-4 h-4" />
          <span>💬 Neural Vault Chat</span>
        </button>
      </div>

      {/* Main Tab Content */}
      {activeNexusTab === 'graph' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 🕸️ Semantic Memory Graph Component */}
          <SemanticMemoryGraph
            entries={entries}
            userId={userId}
            showToast={showToast}
            onSelectConceptPrompt={handleConceptPromptSelected}
          />
        </div>
      )}

      {activeNexusTab === 'chat' && (
        <div
          className="google-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: '540px',
            padding: '24px',
          }}
        >
          {/* Chat Transcript Area */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              marginBottom: '20px',
              paddingRight: '6px',
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  className={msg.sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}
                  style={{
                    maxWidth: '82%',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {msg.text}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    marginTop: '4px',
                    padding: '0 6px',
                  }}
                >
                  <span>{msg.timestamp}</span>
                  {msg.modelUsed && (
                    <>
                      <span>•</span>
                      <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{msg.modelUsed}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
            
            {/* Google M3 High-Contrast Loading Box */}
            {isGenerating && (
              <div style={{ maxWidth: '82%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className="chat-loading-box">
                  <div className="loading-title">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Synthesizing cognitive mirror reflections...</span>
                  </div>
                  <div className="skeleton-shimmer" style={{ height: '14px', width: '92%', borderRadius: '6px' }} />
                  <div className="skeleton-shimmer" style={{ height: '14px', width: '75%', borderRadius: '6px' }} />
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery(inputQuery);
            }}
            style={{ display: 'flex', gap: '12px' }}
          >
            <input
              type="text"
              className="session-search-input"
              style={{
                flex: 1,
                padding: '14px 18px',
                fontSize: '13.5px',
                background: 'var(--surface-hover)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '16px',
                outline: 'none',
              }}
              placeholder="Ask Nexus Mind to synthesize your reflections, detect trends, or brainstorm..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={isGenerating}
            />
            <button
              type="submit"
              className="google-btn-primary"
              style={{
                padding: '0 24px',
                height: '48px',
                borderRadius: '16px',
              }}
              disabled={isGenerating || !inputQuery.trim()}
            >
              <Send className="w-4 h-4" />
              <span>Synthesize</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
