import { useState } from 'react';
import { useChatStore } from '@/store/chatStore';

export default function ForwardMessageModal({ isOpen, onClose, onForward, messages }) {
  const { chats } = useChatStore();
  const [selectedChats, setSelectedChats] = useState([]);

  const handleForward = () => {
    if (selectedChats.length === 0) return;
    onForward(selectedChats);
  };

  const toggleChat = (chatId) => {
    setSelectedChats((prev) =>
      prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId]
    );
  };

  if (!isOpen || !messages || messages.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">
            Forward {messages.length} message{messages.length !== 1 ? 's' : ''}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-sm font-medium text-gray-700 mb-3">Select chats to forward to:</p>
          {chats.length > 0 ? (
            <div className="space-y-2">
              {chats.map((chat) => {
                const isSelected = selectedChats.includes(chat.id);
                return (
                  <button
                    key={chat.id}
                    onClick={() => toggleChat(chat.id)}
                    className={`w-full p-3 rounded-lg text-left transition-all border flex items-center ${
                      isSelected ? 'bg-green-50 border-whatsapp-primary' : 'bg-gray-50 border-transparent hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {chat.isGroup ? (
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-orange-600 text-xs font-bold">
                              {chat.members?.length || '?'}
                            </span>
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-green-600 text-xs font-bold">
                              {chat.members?.[0]?.user?.name?.charAt(0) || '?'}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium text-gray-900 block truncate">
                            {chat.isGroup ? chat.name : chat.members?.[0]?.user?.name || 'Unknown'}
                          </span>
                          {chat.isGroup && (
                            <p className="text-xs text-gray-400">{chat.members?.length || 0} members</p>
                          )}
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-3 ${
                        isSelected ? 'bg-whatsapp-primary border-whatsapp-primary' : 'border-gray-300'
                      }`}>
                        {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No chats available to forward to</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleForward}
            disabled={selectedChats.length === 0}
            className={`flex-1 py-2.5 font-semibold rounded-lg transition-colors flex justify-center items-center ${
              selectedChats.length > 0 
                ? 'bg-whatsapp-primary text-white hover:bg-whatsapp-dark' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <span className="mr-2">Forward</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
