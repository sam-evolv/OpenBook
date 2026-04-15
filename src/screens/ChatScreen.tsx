import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { colors, radius, transitions } from '../constants/theme';
import { chatScripts, type ChatMessage } from '../constants/chatScripts';
import MessageBubble from '../components/MessageBubble';
import TypingIndicator from '../components/TypingIndicator';
import VoiceOverlay from '../components/VoiceOverlay';

export default function ChatScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scriptType = searchParams.get('type') || 'nail';
  const customQuery = searchParams.get('q') || '';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const scriptIndexRef = useRef(0);
  const isRunningRef = useRef(false);

  const script = chatScripts[scriptType] || chatScripts.nail;

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 50);
  }, []);

  const runScript = useCallback(
    (startIndex: number, scriptMessages: ChatMessage[]) => {
      if (isRunningRef.current) return;
      isRunningRef.current = true;

      const addNextMessage = (idx: number) => {
        if (idx >= scriptMessages.length) {
          isRunningRef.current = false;
          return;
        }

        const msg = scriptMessages[idx];

        if (msg.sender === 'ai') {
          setIsTyping(true);
          scrollToBottom();
          setTimeout(() => {
            setIsTyping(false);
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
            scriptIndexRef.current = idx + 1;
            setTimeout(() => addNextMessage(idx + 1), 300);
          }, msg.delay || 900);
        } else {
          setMessages((prev) => [...prev, msg]);
          scrollToBottom();
          scriptIndexRef.current = idx + 1;
          setTimeout(() => addNextMessage(idx + 1), msg.delay || 500);
        }
      };

      addNextMessage(startIndex);
    },
    [scrollToBottom]
  );

  // Initialize script on mount
  useEffect(() => {
    const initialMsg: ChatMessage = {
      id: 'user-initial',
      sender: 'user',
      type: 'text',
      text: customQuery || script.initialUserMessage,
    };

    setMessages([initialMsg]);
    scrollToBottom();

    const timer = setTimeout(() => {
      runScript(0, script.messages);
    }, 600);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptType]);

  const handleConfirm = () => {
    navigate('/confirm');
  };

  const handleVoiceDismiss = useCallback(
    (triggered: boolean) => {
      setShowVoice(false);
      if (triggered) {
        // Start the nail script after voice
        const voiceUserMsg: ChatMessage = {
          id: 'voice-user',
          sender: 'user',
          type: 'text',
          text: 'Find me a nail appointment nearby',
        };
        setMessages((prev) => [...prev, voiceUserMsg]);
        scrollToBottom();
        setTimeout(() => {
          runScript(0, chatScripts.nail.messages);
        }, 600);
      }
    },
    [runScript, scrollToBottom]
  );

  const handleSend = () => {
    if (!inputValue.trim()) return;
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      type: 'text',
      text: inputValue.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    scrollToBottom();
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

        {/* Avatar */}
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
          {/* Online dot */}
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
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            index={i}
            onSlotSelect={(slot) => setSelectedSlot(slot.id)}
            selectedSlot={selectedSlot}
            onConfirm={handleConfirm}
            onBook={handleConfirm}
          />
        ))}

        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <TypingIndicator />
          </motion.div>
        )}

        {/* Bottom spacer */}
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
          {/* Mic button */}
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
          {/* Send button */}
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
              <path
                d="M22 2L11 13"
                stroke={inputValue.trim() ? '#000' : colors.textTertiary}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M22 2L15 22L11 13L2 9L22 2Z"
                fill={inputValue.trim() ? '#000' : colors.textTertiary}
              />
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
