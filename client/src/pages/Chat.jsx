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
import FleetView from '@/components/chat/FleetView';
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
    typingUsers,
    deleteChat
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
    completeSchedule,
    stopLocalAlarm,
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

  // Web Push Subscription
  useEffect(() => {
    const urlBase64ToUint8Array = (base64String) => {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    };

    const subscribePush = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
          if (!publicVapidKey) return;
          
          let subscription = await registration.pushManager.getSubscription();
          
          if (!subscription) {
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
            });
          }
          
          await userAPI.subscribeToPush(subscription);
        } catch (error) {
          console.error('Error subscribing to push notifications:', error);
        }
      }
    };
    
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          subscribePush();
        }
      });
    } else if (Notification.permission === 'granted') {
      subscribePush();
    }
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
    setShowAI(false); // Ensure Utilities view is closed when a chat is selected
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
  };

  const handleSendMessage = (content, options = null) => {
    if (!currentChat) return;

    const tempId = Date.now().toString();
    const messageData = {
      chatId: currentChat.id,
      content,
      messageType: options?.messageType || (options ? (options.isImage ? 'IMAGE' : 'FILE') : 'TEXT'),
      fileUrl: options?.fileUrl,
      fileName: options?.fileName,
      fileSize: options?.fileSize,
      scheduleDate: options?.scheduleDate,
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
    <div className="h-[100dvh] flex bg-gray-100 overflow-hidden">
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
          messages={messages}
          typingUsers={typingUsers}
          currentChat={currentChat}
          onChatSelect={handleChatSelect}
          onCreateChat={handleCreateChat}
          onCreateGroup={() => {
            setShowCreateGroup(true);
            if (window.innerWidth < 768) setShowSidebar(false);
          }}
          onEditProfile={() => {
            setShowProfile(true);
            if (window.innerWidth < 768) setShowSidebar(false);
          }}
          onLogout={handleLogout}
          onToggleAI={() => {
            const nextShowAI = !showAI;
            setShowAI(nextShowAI);
            if (nextShowAI) setCurrentChat(null);
            if (window.innerWidth < 768) setShowSidebar(false);
          }}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {showAI ? (
          <FleetView onBack={() => {
            setShowAI(false);
            if (window.innerWidth < 768) setShowSidebar(true);
          }} />
        ) : currentChat ? (
          <ChatWindow
            currentUser={user}
            chat={currentChat}
            messages={messages}
            typingUsers={typingUsers[currentChat.id] || []}
            allUsers={allUsers}
            onSendMessage={handleSendMessage}
            onDeleteMessage={handleDeleteMessage}
            onCompleteSchedule={completeSchedule}
            onStopAlarm={stopLocalAlarm}
            onStartTyping={() => startTyping(currentChat.id)}
            onStopTyping={() => stopTyping(currentChat.id)}
            onDeleteChat={deleteChat}
            onBack={() => {
              setCurrentChat(null);
              if (window.innerWidth < 768) setShowSidebar(true);
            }}
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
