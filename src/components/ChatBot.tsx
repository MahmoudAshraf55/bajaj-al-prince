'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, ExternalLink } from 'lucide-react';
import { useTranslation } from './useTranslation';

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  action?: 'text' | 'whatsapp';
  whatsapp?: string;
}

export default function ChatBot() {
  const { t, language } = useTranslation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: 'bot',
          text: language === 'ar'
            ? 'مرحباً بك في مركز باجاج البرنس! كيف يمكنني مساعدتك؟'
            : 'Welcome to El Prince Bajaj! How can I help you?',
        },
      ]);
    }
  }, [open, messages.length, language]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/v1/chatbot/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, lang: language }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [
          ...prev,
          { role: 'bot', text: data.data.reply, action: data.data.action, whatsapp: data.data.whatsapp },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: language === 'ar' ? 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.' : 'Sorry, an error occurred. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/30 flex items-center justify-center hover:scale-105 transition-transform"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 glass rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-white/5">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{t('chat_title')}</p>
                <p className="text-[10px] text-muted-foreground">{t('chat_subtitle')}</p>
              </div>
            </div>

            <div className="h-80 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-white/5 text-foreground rounded-bl-md'
                    }`}
                  >
                    <p className="leading-relaxed">{msg.text}</p>
                    {msg.action === 'whatsapp' && msg.whatsapp && (
                      <a
                        href={msg.whatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-2 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {t('chat_whatsapp')}
                      </a>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 rounded-2xl rounded-bl-md px-4 py-2.5">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="flex items-center gap-2 p-3 border-t border-white/10 bg-white/5"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('chat_placeholder')}
                className="flex-1 px-3 py-2 rounded-xl bg-black/20 border border-white/6 text-sm focus:outline-none focus:border-primary/40"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
