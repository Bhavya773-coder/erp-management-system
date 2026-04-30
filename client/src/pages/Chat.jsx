import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { useSocket } from '@/hooks/useSocket';
import { chatAPI, userAPI } from '@/lib/api';

import Sidebar from '@/components/chat/Sidebar';
import ChatWindow from '@/components/chat/ChatWindow';
import WelcomeScreen from '@/components/chat/WelcomeScreen';
import CreateGroupModal from '@/components/chat/CreateGroupModal';
import ProfileModal from '@/components/chat/ProfileModal';
import AIView from '@/components/chat/AIView';
import { Button } from '@/components/ui/button';
import { LogOut, Menu } from 'lucide-react';

export default function Chat() {
  const { user, logout } = useAuthStore();
  const { 
    chats,
    currentChat,
    messages,
    fetchChats,
    setCurrentChat,
    setMessages,
    addMessage,
    clearCurrentChat,
    users: allUsers,
    fetchUsers: fetchAllUsers,
    typingUsers
  } = useChatStore();
  
  const [showSidebar, setShowSidebar] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  
  const token = localStorage.getItem('token');
  const { 
    joinChat, 
    leaveChat, 
    sendMessage, 
    deleteMessageSocket,
    startTyping, 
    stopTyping, 
    markMessagesSeen 
  } = useSocket(token);

  // Fetch initial data
  useEffect(() => {
    fetchChats();
    fetchAllUsers();
    syncProfile();
  }, []);

  const syncProfile = async () => {
    try {
      const response = await userAPI.getProfile();
      if (response.data.success) {
        useAuthStore.getState().updateUser(response.data.data.user);
      }
    } catch (error) {
      console.error('Failed to sync profile:', error);
    }
  };

  // Handle current chat changes
  useEffect(() => {
    if (currentChat) {
      const { fetchMessages } = useChatStore.getState();
      fetchMessages(currentChat.id);
      joinChat(currentChat.id);
      markMessagesSeen(currentChat.id);
      
      return () => {
        leaveChat(currentChat.id);
      };
    }
  }, [currentChat?.id]);



  const handleChatSelect = (chat) => {
    setCurrentChat(chat);
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
  };

  const handleSendMessage = (content, fileData = null) => {
    if (!currentChat) return;

    const tempId = Date.now().toString();
    const messageData = {
      chatId: currentChat.id,
      content,
      messageType: fileData ? (fileData.isImage ? 'IMAGE' : 'FILE') : 'TEXT',
      fileUrl: fileData?.fileUrl,
      fileName: fileData?.fileName,
      fileSize: fileData?.fileSize,
      tempId,
    };

    // Optimistically add message
    const optimisticMessage = {
      id: tempId,
      ...messageData,
      senderId: user.id,
      sender: { id: user.id, name: user.name },
      status: 'SENT',
      createdAt: new Date().toISOString(),
    };
    
    addMessage(optimisticMessage);
    
    // Send via socket
    sendMessage(messageData);
  };

  const handleDeleteMessage = (messageId) => {
    if (!currentChat) return;
    setMessageToDelete({ chatId: currentChat.id, messageId });
  };

  const handleCreateChat = async (userId) => {
    const result = await useChatStore.getState().createIndividualChat(userId);
    if (result.success) {
      handleChatSelect(result.chat);
    }
    return result;
  };

  const handleCreateGroup = async (name, memberIds) => {
    const result = await useChatStore.getState().createGroup(name, memberIds);
    if (result.success) {
      handleChatSelect(result.chat);
      setShowCreateGroup(false);
    }
    return result;
  };

  const handleLogout = () => {
    logout();
    clearCurrentChat();
  };

  // Update document title with unread count
  useEffect(() => {
    const totalUnread = chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) Arcadian ERP`;
    } else {
      document.title = 'Arcadian ERP';
    }
    
    return () => {
      document.title = 'Arcadian ERP';
    };
  }, [chats]);

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSidebar(!showSidebar)}
          className="bg-white shadow-md"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Sidebar */}
      <div className={`
        ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
        fixed md:static
        z-40
        w-full md:w-80 lg:w-96
        h-full
        transition-transform duration-300
      `}>
        <Sidebar
          currentUser={user}
          chats={chats}
          users={allUsers}
          typingUsers={typingUsers}
          currentChat={currentChat}
          onChatSelect={handleChatSelect}
          onCreateChat={handleCreateChat}
          onCreateGroup={() => setShowCreateGroup(true)}
          onEditProfile={() => setShowProfile(true)}
          onLogout={handleLogout}
          onToggleAI={() => {
            setShowAI(!showAI);
            if (!showAI) setCurrentChat(null);
          }}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full">
        {showAI ? (
          <AIView onBack={() => setShowAI(false)} />
        ) : currentChat ? (
          <ChatWindow
            currentUser={user}
            chat={currentChat}
            messages={messages}
            typingUsers={typingUsers[currentChat.id] || []}
            allUsers={allUsers}
            onSendMessage={handleSendMessage}
            onDeleteMessage={handleDeleteMessage}
            onStartTyping={() => startTyping(currentChat.id)}
            onStopTyping={() => stopTyping(currentChat.id)}
            onBack={() => setCurrentChat(null)}
          />
        ) : (
          <WelcomeScreen currentUser={user} />
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <CreateGroupModal
          users={allUsers}
          currentUser={user}
          onClose={() => setShowCreateGroup(false)}
          onCreate={handleCreateGroup}
        />
      )}

      {/* Profile Modal */}
      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
      />

      {/* Delete Confirmation Modal */}
      {messageToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete message?</h3>
            <p className="text-gray-500 mb-6">Are you sure you want to delete this message for everyone?</p>
            <div className="flex flex-col space-y-2">
              <button 
                onClick={() => {
                  deleteMessageSocket(messageToDelete.chatId, messageToDelete.messageId);
                  setMessageToDelete(null);
                }}
                className="w-full py-2.5 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete for everyone
              </button>
              <button 
                onClick={() => setMessageToDelete(null)}
                className="w-full py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
