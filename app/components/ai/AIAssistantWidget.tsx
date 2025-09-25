'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from '../icons/IconLibrary';
import { Send, Minimize2, Maximize2, Volume2, VolumeX, RotateCcw } from 'lucide-react';

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  type?: 'text' | 'suggestion' | 'error';
  metadata?: {
    subject?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    language?: 'en' | 'bn' | 'ar';
  };
}

export interface QuickAction {
  id: string;
  label: string;
  icon: keyof typeof Icons;
  prompt: string;
  category: 'homework' | 'explanation' | 'practice' | 'islamic' | 'general';
}

export interface AIAssistantWidgetProps {
  userRole: 'student' | 'teacher' | 'guardian' | 'admin';
  userName: string;
  currentSubject?: string;
  language?: 'en' | 'bn' | 'ar';
  onSendMessage?: (message: string, context?: any) => Promise<string>;
  onClose?: () => void;
  className?: string;
  initialMinimized?: boolean;
  showVoiceInput?: boolean;
  showQuickActions?: boolean;
}

const AIAssistantWidget: React.FC<AIAssistantWidgetProps> = ({
  userRole,
  userName,
  currentSubject,
  language = 'en',
  onSendMessage,
  onClose,
  className = '',
  initialMinimized = false,
  showVoiceInput = true,
  showQuickActions = true,
}) => {
  const [isMinimized, setIsMinimized] = useState(initialMinimized);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Quick actions based on user role
  const getQuickActions = (): QuickAction[] => {
    const commonActions: QuickAction[] = [
      {
        id: 'explain',
        label: 'Explain this topic',
        icon: 'Lightbulb',
        prompt: `Please explain ${currentSubject || 'this topic'} in simple terms`,
        category: 'explanation',
      },
      {
        id: 'practice',
        label: 'Practice questions',
        icon: 'Target',
        prompt: `Give me practice questions for ${currentSubject || 'this topic'}`,
        category: 'practice',
      },
    ];

    const roleSpecificActions: Record<string, QuickAction[]> = {
      student: [
        {
          id: 'homework',
          label: 'Help with homework',
          icon: 'BookOpen',
          prompt: 'I need help with my homework',
          category: 'homework',
        },
        {
          id: 'islamic',
          label: 'Islamic guidance',
          icon: 'Star',
          prompt: 'Can you provide Islamic guidance on this topic?',
          category: 'islamic',
        },
      ],
      teacher: [
        {
          id: 'lesson',
          label: 'Lesson planning',
          icon: 'Calendar',
          prompt: `Help me plan a lesson for ${currentSubject || 'my subject'}`,
          category: 'general',
        },
        {
          id: 'assessment',
          label: 'Create assessment',
          icon: 'FileText',
          prompt: 'Help me create an assessment for my students',
          category: 'general',
        },
      ],
      guardian: [
        {
          id: 'support',
          label: 'Support my child',
          icon: 'Heart',
          prompt: 'How can I better support my child\'s learning?',
          category: 'general',
        },
      ],
      admin: [
        {
          id: 'analytics',
          label: 'Data insights',
          icon: 'BarChart3',
          prompt: 'Help me understand the school performance data',
          category: 'general',
        },
      ],
    };

    return [...commonActions, ...(roleSpecificActions[userRole] || [])];
  };

  const quickActions = getQuickActions();

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessages: Record<string, string> = {
      en: `Hello ${userName}! I'm your AI learning assistant. How can I help you today?`,
      bn: `আসসালামু আলাইকুম ${userName}! আমি আপনার AI শিক্ষা সহায়ক। আজ আমি আপনাকে কীভাবে সাহায্য করতে পারি?`,
      ar: `السلام عليكم ${userName}! أنا مساعدك التعليمي بالذكاء الاصطناعي. كيف يمكنني مساعدتك اليوم؟`,
    };

    setMessages([
      {
        id: '1',
        content: welcomeMessages[language],
        sender: 'assistant',
        timestamp: new Date(),
        type: 'text',
      },
    ]);
  }, [userName, language]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Speech recognition setup
  useEffect(() => {
    if (showVoiceInput && typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = language === 'bn' ? 'bn-BD' : language === 'ar' ? 'ar-SA' : 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputValue(transcript);
          setIsListening(false);
        };

        recognitionRef.current.onerror = () => {
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, [language, showVoiceInput]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      sender: 'user',
      timestamp: new Date(),
      type: 'text',
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const context = {
        userRole,
        currentSubject,
        language,
        previousMessages: messages.slice(-5), // Last 5 messages for context
      };

      const response = onSendMessage 
        ? await onSendMessage(content, context)
        : `I understand you're asking about "${content}". As an AI assistant, I'm here to help with your educational needs. However, I need to be connected to the AI service to provide detailed responses.`;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        sender: 'assistant',
        timestamp: new Date(),
        type: 'text',
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Text-to-speech for assistant response
      if (isSpeaking && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(response);
        utterance.lang = language === 'bn' ? 'bn-BD' : language === 'ar' ? 'ar-SA' : 'en-US';
        utterance.rate = 0.8;
        speechSynthesis.speak(utterance);
      }

      // Show notification if minimized
      if (isMinimized) {
        setHasNewMessage(true);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        sender: 'assistant',
        timestamp: new Date(),
        type: 'error',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    handleSendMessage(action.prompt);
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const clearConversation = () => {
    setMessages([
      {
        id: '1',
        content: `Hello ${userName}! I'm your AI learning assistant. How can I help you today?`,
        sender: 'assistant',
        timestamp: new Date(),
        type: 'text',
      },
    ]);
  };

  const toggleMinimized = () => {
    setIsMinimized(!isMinimized);
    if (!isMinimized) {
      setHasNewMessage(false);
    }
  };

  // Animation variants
  const widgetVariants = {
    minimized: {
      height: 60,
      width: 300,
      transition: { duration: 0.3, ease: 'easeInOut' },
    },
    expanded: {
      height: 500,
      width: 350,
      transition: { duration: 0.3, ease: 'easeInOut' },
    },
  };

  const messageVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.3, ease: 'easeOut' },
    },
  };

  return (
    <motion.div
      variants={widgetVariants}
      animate={isMinimized ? 'minimized' : 'expanded'}
      className={`
        fixed bottom-6 right-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl
        border border-gray-200 dark:border-gray-700 overflow-hidden z-50 ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Icons.Sparkles size={16} />
          </div>
          <div>
            <h3 className="font-medium text-sm">AI Assistant</h3>
            {!isMinimized && (
              <p className="text-xs opacity-80">
                {isLoading ? 'Thinking...' : 'Ready to help'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {hasNewMessage && isMinimized && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="w-2 h-2 bg-red-400 rounded-full"
            />
          )}
          
          <button
            onClick={toggleMinimized}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <Icons.X size={16} />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-full"
          >
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-80">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  variants={messageVariants}
                  initial="hidden"
                  animate="visible"
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`
                      max-w-[80%] p-3 rounded-2xl text-sm
                      ${message.sender === 'user'
                        ? 'bg-blue-500 text-white rounded-br-md'
                        : message.type === 'error'
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-bl-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-md'
                      }
                    `}
                  >
                    {message.content}
                    <div className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {isLoading && (
                <motion.div
                  variants={messageVariants}
                  initial="hidden"
                  animate="visible"
                  className="flex justify-start"
                >
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-2xl rounded-bl-md">
                    <div className="flex space-x-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 bg-gray-400 rounded-full"
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            {showQuickActions && messages.length <= 1 && (
              <div className="px-4 pb-2">
                <div className="grid grid-cols-2 gap-2">
                  {quickActions.slice(0, 4).map((action) => {
                    const IconComponent = Icons[action.icon];
                    return (
                      <button
                        key={action.id}
                        onClick={() => handleQuickAction(action)}
                        className="flex items-center space-x-2 p-2 text-xs bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        <IconComponent size={14} />
                        <span className="truncate">{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
                    placeholder="Ask me anything..."
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  
                  {showVoiceInput && recognitionRef.current && (
                    <button
                      onClick={startListening}
                      disabled={isListening || isLoading}
                      className={`
                        absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded
                        ${isListening 
                          ? 'text-red-500 animate-pulse' 
                          : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                        }
                      `}
                    >
                      <Icons.Bell size={16} />
                    </button>
                  )}
                </div>

                <div className="flex space-x-1">
                  <button
                    onClick={() => setIsSpeaking(!isSpeaking)}
                    className={`p-2 rounded-lg transition-colors ${
                      isSpeaking 
                        ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                  >
                    {isSpeaking ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  </button>

                  <button
                    onClick={clearConversation}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
                  >
                    <RotateCcw size={16} />
                  </button>

                  <button
                    onClick={() => handleSendMessage(inputValue)}
                    disabled={!inputValue.trim() || isLoading}
                    className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AIAssistantWidget;
