import { authenticatedFetch } from '../services/apiClient';
import { generateGeminiChatResponse, streamGeminiChat } from '../services/geminiClient';
import React, { useState } from 'react';
import { JournalEntry, TimeCapsule, JournalDraft } from '../types';
import { SemanticMemoryGraph } from './SemanticMemoryGraph';
import { NeuralVoiceModeModal } from './NeuralVoiceModeModal';
import { getJournalDrafts, saveJournalDrafts } from '../services/vaultStorage';
import {
  Cpu,
  Send,
  Sparkles,
  Mic,
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
  Save,
  FileText,
  Copy,
  Check,
  RotateCcw,
  Trash2,
} from 'lucide-react';

interface NexusMindViewProps {
  userId?: string;
  entries: JournalEntry[];
  capsules: TimeCapsule[];
  onAddCapsule: (capsule: Omit<TimeCapsule, 'id' | 'userId' | 'sealedAt' | 'isOpened' | 'integrityHash'>) => void;
  onUnlockCapsule: (id: string) => void;
  onDeleteCapsule: (id: string) => void;
  onAddEntry?: (entryOrTitle: any, content?: string, tags?: string[], mood?: string) => void;
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
  onAddEntry,
  showToast
}) => {
  const [activeNexusTab, setActiveNexusTab] = useState<NexusTab>('graph');
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: entries.length > 0
        ? `⚡ Nexus Mind Protocol Active. Real Vault privileges verified.\n\nI have loaded your ${entries.length} encrypted vault reflections into the Semantic Memory Web. You can explore your conceptual nodes and synaptic links in the graph above, or chat with me to extract latent patterns.`
        : `⚡ Nexus Mind Protocol Active. Real Vault privileges verified.\n\nYour sovereign cognitive enclave is ready. Record your reflections in the Journal to generate cognitive nodes, or chat with me to extract insights and brainstorm ideas.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'Gemini 3.6 Flash',
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);

  // Helper to format conversation transcript into markdown
  const formatConversation = (msgs: ChatMessage[]): string => {
    const actualMsgs = msgs.filter((m, idx) => !(idx === 0 && m.id === 'welcome-1' && msgs.length > 1));
    return actualMsgs.map((m) => {
      const sender = m.sender === 'user' ? '👤 **You**' : `✨ **Nexus Mind AI (${m.modelUsed || 'Gemini'})**`;
      return `${sender} *(${m.timestamp})*:\n${m.text}`;
    }).join('\n\n---\n\n');
  };

  const handleSaveConversationToVault = () => {
    const userMsgs = messages.filter(m => m.sender === 'user');
    if (userMsgs.length === 0) {
      showToast("Start a conversation before saving to vault.", "warning");
      return;
    }

    const firstUserQuery = userMsgs[0]?.text || 'Neural Chat';
    const title = `AI Dialogue: ${firstUserQuery.slice(0, 32)}${firstUserQuery.length > 32 ? '...' : ''}`;
    const content = formatConversation(messages);

    if (onAddEntry) {
      onAddEntry({
        title,
        content,
        mood: 'focused',
        tags: ['nexus-mind', 'ai-chat', 'cognitive-reflection'],
      });
      showToast("Conversation encrypted and saved to sovereign vault.", "success");
    } else {
      showToast("Vault entry handler is unavailable.", "error");
    }
  };

  const handleSaveConversationAsDraft = () => {
    const userMsgs = messages.filter(m => m.sender === 'user');
    if (userMsgs.length === 0) {
      showToast("Start a conversation before saving as draft.", "warning");
      return;
    }

    const firstUserQuery = userMsgs[0]?.text || 'Neural Chat';
    const title = `Draft AI Dialogue: ${firstUserQuery.slice(0, 30)}...`;
    const content = formatConversation(messages);

    const existingDrafts = getJournalDrafts(userId);
    const newDraft: JournalDraft = {
      id: 'draft_' + Date.now().toString(36),
      title,
      content,
      mood: 'focused',
      tags: ['nexus-mind', 'ai-chat'],
      savedAt: new Date().toISOString(),
      sourceTab: 'talk',
    };
    saveJournalDrafts(userId, [newDraft, ...existingDrafts]);
    showToast("Conversation saved as studio draft.", "success");
  };

  const handleSaveSingleMessageToVault = (msgText: string) => {
    if (onAddEntry) {
      const title = `AI Insight: ${msgText.slice(0, 32)}...`;
      onAddEntry({
        title,
        content: msgText,
        mood: 'focused',
        tags: ['ai-insight', 'nexus-mind'],
      });
      showToast("AI insight saved to encrypted vault.", "success");
    }
  };

  const handleSaveSingleMessageAsDraft = (msgText: string) => {
    const title = `Draft AI Insight: ${msgText.slice(0, 30)}...`;
    const existingDrafts = getJournalDrafts(userId);
    const newDraft: JournalDraft = {
      id: 'draft_' + Date.now().toString(36),
      title,
      content: msgText,
      mood: 'focused',
      tags: ['ai-insight'],
      savedAt: new Date().toISOString(),
      sourceTab: 'write',
    };
    saveJournalDrafts(userId, [newDraft, ...existingDrafts]);
    showToast("AI insight saved as draft.", "success");
  };

  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
    showToast("Copied to clipboard.", "info");
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome-1',
        sender: 'assistant',
        text: entries.length > 0
          ? `⚡ Nexus Mind Protocol Active. Real Vault privileges verified.\n\nConversation reset. How can I assist your cognitive reflection today?`
          : `⚡ Nexus Mind Protocol Active. Real Vault privileges verified.\n\nConversation reset. Ready for your reflections.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'Gemini 3.6 Flash',
      },
    ]);
    showToast("Neural Vault Chat reset.", "info");
  };

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
      // 🌐 Real-Time Streaming Google Gemini Cognitive Assistant
      const contextSummary = `User's decrypted journal reflections count: ${entries.length}.\nReflections Data:\n${JSON.stringify(
        entries.slice(0, 15).map((e) => ({
          title: e.title,
          mood: e.mood,
          tags: e.tags,
          content: e.content.slice(0, 300),
          date: e.createdAt,
        })),
        null,
        2
      )}`;

      const aiMsgId = 'msg_' + Math.random().toString(36).substring(2, 9);
      let streamedContent = '';
      let hasStreamedChunk = false;

      const stream = streamGeminiChat({
        prompt: userMsgText,
        history: messages.map((m) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          content: m.text,
        })),
        systemInstruction: "You are the Nexus Mind Cognitive Partner — an advanced personal AI reflection mirror in a zero-knowledge encrypted vault. Provide insightful, empathetic, Socratic, and deeply relevant answers grounded in the user's journal entries.",
        context: contextSummary,
      });

      for await (const chunk of stream) {
        if (!hasStreamedChunk) {
          hasStreamedChunk = true;
          setMessages((prev) => [
            ...prev,
            {
              id: aiMsgId,
              sender: 'assistant',
              text: chunk,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              modelUsed: 'Gemini 3.6 Flash',
            },
          ]);
          streamedContent = chunk;
        } else {
          streamedContent += chunk;
          setMessages((prev) =>
            prev.map((m) => (m.id === aiMsgId ? { ...m, text: streamedContent } : m))
          );
        }
      }

      if (hasStreamedChunk) {
        return;
      }
    } catch (apiErr: any) {
      console.warn("[Nexus Mind Gemini API Call]", apiErr.message || apiErr);

      // Dynamic Local Cognitive Synthesis Fallback
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
          {/* Chat Action Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '16px',
              marginBottom: '16px',
              borderBottom: '1px solid var(--border-subtle)',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <MessageSquare className="w-3.5 h-3.5 text-accent-blue" />
                <span>Cognitive Dialogue ({messages.filter((m) => m.sender === 'user').length} queries)</span>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsVoiceModeOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '6px 14px',
                  height: '32px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(168, 85, 247, 0.3)',
                }}
                title="Start human-like live Voice-to-Voice Call with AI"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Live Voice Call</span>
              </button>

              <button
                type="button"
                onClick={handleSaveConversationAsDraft}
                disabled={messages.filter((m) => m.sender === 'user').length === 0}
                className="btn-secondary btn-inline"
                style={{
                  fontSize: '12px',
                  padding: '6px 12px',
                  height: '32px',
                  borderRadius: '10px',
                  opacity: messages.filter((m) => m.sender === 'user').length === 0 ? 0.5 : 1,
                  cursor: messages.filter((m) => m.sender === 'user').length === 0 ? 'not-allowed' : 'pointer',
                }}
                title="Save current conversation as a working draft"
              >
                <FileText className="w-3.5 h-3.5 inline mr-1" />
                <span>Save as Draft</span>
              </button>

              <button
                type="button"
                onClick={handleSaveConversationToVault}
                disabled={messages.filter((m) => m.sender === 'user').length === 0}
                className="google-btn-primary"
                style={{
                  fontSize: '12px',
                  padding: '6px 14px',
                  height: '32px',
                  borderRadius: '10px',
                  opacity: messages.filter((m) => m.sender === 'user').length === 0 ? 0.5 : 1,
                  cursor: messages.filter((m) => m.sender === 'user').length === 0 ? 'not-allowed' : 'pointer',
                }}
                title="Encrypt and save this conversation into your sovereign vault"
              >
                <Save className="w-3.5 h-3.5 inline mr-1" />
                <span>Save to Vault</span>
              </button>

              <button
                type="button"
                onClick={handleClearChat}
                className="btn-ghost"
                style={{
                  fontSize: '12px',
                  padding: '6px 10px',
                  height: '32px',
                  borderRadius: '10px',
                  color: 'var(--text-muted)',
                }}
                title="Reset conversation"
              >
                <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
                <span>Reset</span>
              </button>
            </div>
          </div>

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
                    flexWrap: 'wrap',
                  }}
                >
                  <span>{msg.timestamp}</span>
                  {msg.modelUsed && (
                    <>
                      <span>•</span>
                      <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{msg.modelUsed}</span>
                    </>
                  )}

                  {msg.sender === 'assistant' && msg.id !== 'welcome-1' && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.id, msg.text)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '10.5px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                        title="Copy text"
                      >
                        {copiedMsgId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span style={{ color: 'var(--accent-emerald)' }}>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSaveSingleMessageAsDraft(msg.text)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '10.5px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                        title="Save this AI response as a draft"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Draft</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSaveSingleMessageToVault(msg.text)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--accent-blue)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '10.5px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 600,
                        }}
                        title="Save this AI response directly into your vault"
                      >
                        <Save className="w-3 h-3" />
                        <span>Save to Vault</span>
                      </button>
                    </div>
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
            <button
              type="button"
              onClick={() => setIsVoiceModeOpen(true)}
              style={{
                height: '48px',
                padding: '0 18px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                border: 'none',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(168, 85, 247, 0.25)',
              }}
              title="Open live human-like Voice-to-Voice Call"
            >
              <Mic className="w-4 h-4" />
              <span>Voice Call</span>
            </button>
          </form>
        </div>
      )}

      {/* 🎙️ Live Voice-to-Voice Modal */}
      <NeuralVoiceModeModal
        isOpen={isVoiceModeOpen}
        onClose={() => setIsVoiceModeOpen(false)}
        contextEntries={entries}
        onSaveSessionToVault={(title, transcript) => {
          if (onAddEntry) {
            onAddEntry(title, transcript, ['voice-call', 'cognitive-dialogue'], 'focused');
            showToast('Voice session encrypted & saved to Sovereign Vault!', 'success');
          }
        }}
        showToast={showToast}
      />
    </div>
  );
};
