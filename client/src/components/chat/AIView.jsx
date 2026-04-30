import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { translations, translateValue } from '@/lib/translations';
import { aiAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sparkles, 
  Send, 
  Loader2, 
  Bot, 
  Receipt, 
  CheckSquare, 
  BrainCircuit, 
  ArrowLeft,
  Search,
  Plus
} from 'lucide-react';

const AI_AGENTS = [
  {
    id: 'expense',
    title: 'Voucher & Expense Entry',
    description: 'Quickly log company expenses and generate vouchers.',
    icon: <Receipt className="w-6 h-6 text-emerald-500" />,
    color: 'bg-emerald-50'
  },
  {
    id: 'tasks',
    title: 'Task & Reminder Allocation',
    description: 'Set smart tasks and automated reminders for your team.',
    icon: <CheckSquare className="w-6 h-6 text-blue-500" />,
    color: 'bg-blue-50'
  }
];

export default function AIView({ onBack }) {
  const { user, language } = useAuthStore();
  const t = translations[language];
  
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build context based on selected agent
      const systemPrompt = selectedAgent 
        ? `You are the ${selectedAgent.title} for Arcadian Works ERP. Your goal is to: ${selectedAgent.description}. Keep responses professional and concise.`
        : "You are a helpful AI assistant for Arcadian Works ERP.";

      const chatHistory = [
        { role: 'system', content: systemPrompt },
        ...messages,
        userMessage
      ];

      const response = await aiAPI.chat(chatHistory);
      const aiMessage = response.data.message;
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I apologize, but I am having trouble connecting to my brain right now. Please try again later.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedAgent) {
    return (
      <div className="flex flex-col h-full bg-whatsapp-gray">
        {/* Chat Header */}
        <div className="p-4 bg-white border-b border-gray-200 flex items-center">
          <Button variant="ghost" size="icon" onClick={() => setSelectedAgent(null)} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="p-2 rounded-lg bg-gray-50 mr-3">
            {selectedAgent.icon}
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{selectedAgent.title}</h3>
            <p className="text-xs text-gray-500">Llama 3 Powered AI</p>
          </div>
        </div>

        {/* Chat Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex justify-start">
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 text-sm max-w-[80%]">
                Hello {translateValue(user.name, language)}! I am your {selectedAgent.title}. How can I assist you today?
              </div>
            </div>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`
                  p-3 rounded-lg shadow-sm max-w-[80%] text-sm
                  ${m.role === 'user' ? 'bg-whatsapp-light' : 'bg-white border border-gray-100'}
                `}>
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin text-whatsapp-primary mr-2" />
                  <span className="text-xs text-gray-500 italic">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="max-w-3xl mx-auto flex space-x-2">
            <Input 
              placeholder="Ask anything..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              className="bg-gray-50 focus-visible:ring-whatsapp-primary"
            />
            <Button onClick={handleSend} disabled={isLoading || !input.trim()} className="bg-whatsapp-primary">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* AI Hub Header */}
      <div className="p-8 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-whatsapp-primary/10 rounded-xl">
              <Sparkles className="w-8 h-8 text-whatsapp-primary" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">AI Assistant Hub</h1>
          </div>
          <p className="text-gray-500 text-lg">Harness the power of Llama 3 to streamline your Arcadian Works operations.</p>
        </div>
      </div>

      {/* Agents Grid */}
      <ScrollArea className="flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {AI_AGENTS.map((agent) => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className="group p-6 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-whatsapp-primary/50 transition-all text-left flex flex-col h-48"
              >
                <div className={`p-3 rounded-xl ${agent.color} w-fit mb-4 group-hover:scale-110 transition-transform`}>
                  {agent.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{agent.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2">{agent.description}</p>
                <div className="mt-auto flex items-center text-xs font-bold text-whatsapp-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  OPEN AGENT →
                </div>
              </button>
            ))}
            
            {/* "Add Custom" Card from design */}
            <button className="p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 hover:border-whatsapp-primary/30 transition-all flex flex-col items-center justify-center text-center group h-48">
              <div className="p-3 bg-white rounded-full shadow-sm mb-3 group-hover:rotate-90 transition-transform">
                <Plus className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Add Agent</p>
            </button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
