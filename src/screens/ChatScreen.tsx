import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { colors, radius, transitions } from '../constants/theme';
import TypingIndicator from '../components/TypingIndicator';
import VoiceOverlay from '../components/VoiceOverlay';
import { processUserMessage, type AiChatMessage } from '../lib/ai-assistant';
import type { Business, Service, TimeSlot } from '../lib/types';

interface AiContext {
  businesses: Business[]
  selectedBusiness: Business | null
  selectedService: Service | null
  services: Service[]
  slots: TimeSlot[]
  selectedDate: string
}

export default function ChatScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scriptType = searchParams.get('type') || '';
  const customQuery = searchParams.get('q') || '';

  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<AiContext>({
    businesses: [],
    selectedBusiness: null,
    selectedService: null,
    services: [],
    slots: [],
    selectedDate: new Date().toISOString().split('T')[0],
  });
  const initializedRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 50);
  }, []);

  // Map script type to initial user message
  function getInitialMessage(): string {
    if (customQuery) return customQuery;
    switch (scriptType) {
      case 'nail': return 'Find me a nail appointment nearby';
      case 'gym': return 'Find me a gym nearby';
      case 'date': return 'Find me a nice restaurant for tonight';
      case 'flash': return 'Show me the best deals nearby';
      default: return customQuery || 'Hi! What can you help me with?';
    }
  }

  async function sendMessage(text: string) {
    const userMsg: AiChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    scrollToBottom();
    setIsTyping(true);

    try {
      const { reply, updatedContext, action } = await processUserMessage(text, contextRef.current);

      // Update context
      contextRef.current = { ...contextRef.current, ...updatedContext };

      const aiMsg: AiChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: reply,
      };
      setIsTyping(false);
      setMessages((prev) => [...prev, aiMsg]);
      scrollToBottom();

      // Handle navigation action
      if (action?.startsWith('navigate:')) {
        const path = action.replace('navigate:', '');
        setTimeout(() => navigate(path), 1500);
      }
    } catch {
      setIsTyping(false);
      const errorMsg: AiChatMessage = {
        id: `ai-error-${Date.now()}`,
        role: 'assistant',
        content: "Sorry, I had trouble processing that. Please try again!",
      };
      setMessages((prev) => [...prev, errorMsg]);
      scrollToBottom();
    }
  }

  // Initialize with first message
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const initial = getInitialMessage();
    sendMessage(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVoiceDismiss = useCallback(
    (triggered: boolean) => {
      setShowVoice(false);
      if (triggered) {
        sendMessage('Find me a nail appointment nearby');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleSend = () => {
    if (!inputValue.trim()) return;
    const text = inputValue.trim();
    setInputValue('');
    sendMessage(text);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={transitions.spring}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: colors.bg,
        overflow: 'hidden',
      }}
    >
      {/* Chat header */}
      <div
        className="safe-top"
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: `1px solid ${colors.border}`,
          background: `${colors.surface1}ee`,
          backdropFilter: 'blur(20px)',
          zIndex: 10,
        }}
      >
        <motion.button
          whileTap={transitions.buttonTap}
          onClick={() => navigate(-1)}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: colors.surface3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 19l-7-7 7-7" stroke={colors.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>

        <div style={{ position: 'relative' }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: colors.goldGradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            &#10024;
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: colors.green,
              border: `2px solid ${colors.surface1}`,
            }}
          />
        </div>

        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>
            OpenBook AI
          </div>
          <div style={{ fontSize: 12, color: colors.green, fontWeight: 500 }}>
            Online
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 16px 8px',
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 8,
            }}
          >
            {msg.role === 'assistant' ? (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, maxWidth: '85%' }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: colors.goldGradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 15,
                    flexShrink: 0,
                  }}
                >
                  &#10024;
                </div>
                <div
                  style={{
                    background: colors.surface3,
                    borderRadius: radius.bubble,
                    borderBottomLeftRadius: 6,
                    padding: '12px 16px',
                    fontSize: 15,
                    lineHeight: 1.6,
                    color: colors.text,
                    whiteSpace: 'pre-wrap',
                  }}
                  dangerouslySetInnerHTML={{
                    __html: msg.content
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br/>')
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  background: colors.goldGradient,
                  borderRadius: radius.bubble,
                  borderBottomRightRadius: 6,
                  padding: '12px 16px',
                  fontSize: 15,
                  lineHeight: 1.5,
                  color: '#000',
                  fontWeight: 500,
                  maxWidth: '85%',
                }}
              >
                {msg.content}
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <TypingIndicator />
          </motion.div>
        )}

        <div style={{ height: 80 }} />
      </div>

      {/* Input bar */}
      <div
        style={{
          padding: '8px 16px',
          paddingBottom: 'max(env(safe-area-inset-bottom, 8px), 8px)',
          background: `${colors.surface1}ee`,
          backdropFilter: 'blur(20px)',
          borderTop: `1px solid ${colors.border}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: colors.surface3,
            borderRadius: 28,
            padding: '6px 6px 6px 16px',
          }}
        >
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: colors.text,
              fontSize: 15,
            }}
          />
          <motion.button
            whileTap={transitions.buttonTap}
            onClick={() => setShowVoice(true)}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: colors.goldGradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="2" width="6" height="12" rx="3" fill="#000" />
              <path d="M5 11a7 7 0 0014 0" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M12 18v4" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </motion.button>
          <motion.button
            whileTap={transitions.buttonTap}
            onClick={handleSend}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: inputValue.trim() ? colors.goldGradient : colors.surface4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke={inputValue.trim() ? '#000' : colors.textTertiary} strokeWidth="2.5" strokeLinecap="round" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" fill={inputValue.trim() ? '#000' : colors.textTertiary} />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Voice overlay */}
      <AnimatePresence>
        {showVoice && <VoiceOverlay onDismiss={handleVoiceDismiss} />}
      </AnimatePresence>
    </motion.div>
  );
}
