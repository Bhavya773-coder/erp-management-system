import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Plus, 
  Users, 
  MessageCircle, 
  LogOut, 
  Check,
  CheckCheck,
  Clock,
  Settings,
  Globe,
  Sparkles,
  LayoutDashboard
} from 'lucide-react';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { translations, translateValue } from '@/lib/translations';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

export default function Sidebar({ 
  currentUser, 
  chats, 
  users, 
  typingUsers = {},
  currentChat, 
  onChatSelect, 
  onCreateChat, 
  onCreateGroup,
  onEditProfile,
  onLogout,
  onToggleAI
}) {
  const { language, setLanguage } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState('chats'); // 'chats', 'directory', 'reminders'
  const [allReminders, setAllReminders] = useState([]);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const t = translations[language];

  const fetchAllReminders = async () => {
    setRemindersLoading(true);
    try {
      const response = await messageAPI.getAllSchedules();
      if (response.data.success) {
        const sorted = response.data.data.schedules.sort((a, b) => {
          if (a.isCompleted === b.isCompleted) {
            return new Date(b.scheduleDate || 0) - new Date(a.scheduleDate || 0);
          }
          return a.isCompleted ? 1 : -1;
        });
        setAllReminders(sorted);
      }
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    } finally {
      setRemindersLoading(false);
    }
  };

  const filteredChats = chats.filter(chat => 
    chat.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getChatName = (chat) => {
    if (chat.isGroup) return chat.name;
    const otherMember = chat.members?.find(m => (m.user.id || m.user._id) !== currentUser.id);
    return otherMember?.user.name || 'Unknown User';
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    // Ensure baseUrl doesn't end with slash and url starts with slash
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
    return `${normalizedBase}${normalizedUrl}`;
  };

  const getMessageStatusIcon = (status) => {
    switch (status) {
      case 'SEEN':
        return <CheckCheck className="w-3 h-3 text-whatsapp-primary" />;
      case 'DELIVERED':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'SENT':
        return <Check className="w-3 h-3 text-gray-400" />;
      default:
        return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  const formatMessageDate = (dateString) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return t.yesterday;
    } else if (isThisWeek(date)) {
      return format(date, 'EEE');
    } else {
      return format(date, 'MMM d');
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 sm:p-6 bg-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="relative shrink-0">
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-gray-50 shadow-sm">
                <AvatarImage src={getFullUrl(currentUser?.avatarUrl)} />
                <AvatarFallback className="bg-whatsapp-primary text-white font-bold">{getInitials(currentUser?.name)}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="min-w-0">
              <p className="font-black text-gray-900 truncate text-sm sm:text-base leading-tight">
                {translateValue(currentUser?.name, language)}
              </p>
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 rounded-full bg-whatsapp-primary"></div>
                <p className="text-[10px] text-whatsapp-primary font-black uppercase tracking-wider truncate">
                  {translateValue(currentUser?.role, language)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-whatsapp-primary hover:bg-whatsapp-primary/5 rounded-full">
                  <Globe className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl border-gray-100 shadow-2xl">
                <DropdownMenuItem onClick={() => setLanguage('en')} className="font-bold py-2 px-4 rounded-xl">English (EN)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('hi')} className="font-bold py-2 px-4 rounded-xl">हिन्दी (HI)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('gu')} className="font-bold py-2 px-4 rounded-xl">ગુજરાતી (GU)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 text-gray-400 hover:text-whatsapp-primary hover:bg-whatsapp-primary/5 rounded-full" 
              onClick={onEditProfile}
            >
              <Settings className="h-5 w-5" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full" 
              onClick={onLogout}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Global Navigation - Full Width Stack */}
        <div className="space-y-2 mb-6">
          <button 
            onClick={onToggleAI}
            className="w-full flex items-center justify-center py-4 bg-whatsapp-primary/5 hover:bg-whatsapp-primary text-whatsapp-primary hover:text-white rounded-[1.5rem] border border-whatsapp-primary/10 transition-all group"
          >
            <Sparkles className="h-5 w-5 mr-3 group-hover:rotate-12 transition-transform" />
            <span className="text-xs font-black uppercase tracking-[0.2em]">Utilities</span>
          </button>
          
          {currentUser?.role === 'ADMIN' && (
            <Link to="/admin" className="block">
              <button className="w-full flex items-center justify-center py-4 bg-gray-50/50 hover:bg-gray-900 text-gray-400 hover:text-white rounded-[1.5rem] border border-gray-100/50 transition-all group">
                <LayoutDashboard className="h-5 w-5 mr-3" />
                <span className="text-xs font-black uppercase tracking-[0.2em]">Admin Panel</span>
              </button>
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-12 bg-gray-50 border-none rounded-2xl text-sm font-medium placeholder:text-gray-400 focus-visible:ring-blue-100 transition-all"
          />
        </div>

        {/* Notification Prompt for "Dumb Users" */}
        {('Notification' in window && (Notification.permission === 'default' || Notification.permission === 'denied')) && (
          <div className="mt-4 p-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl shadow-lg shadow-orange-200 animate-pulse-subtle">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Globe className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-white uppercase tracking-wider">Enable Alerts</p>
                  <p className="text-[9px] text-orange-50 font-bold leading-tight">Don't miss new messages!</p>
                </div>
              </div>
              <Button 
                size="sm" 
                className="h-8 bg-white text-orange-600 hover:bg-orange-50 font-black text-[10px] rounded-xl px-4"
                onClick={() => {
                  Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                      window.location.reload(); // Reload to trigger subscription
                    } else {
                      alert("Please enable notifications in your browser settings to receive alerts.");
                    }
                  });
                }}
              >
                ENABLE
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons & Tabs */}
      <div className="p-3 border-b border-gray-100">
        <div className="flex space-x-2 mb-3">
          <Button 
            variant="outline" 
            className="flex-1 text-xs h-8"
            onClick={() => {
              setView('directory');
            }}
          >
            <Plus className="w-3 h-3 mr-1" />
            {t.newChat}
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 text-xs h-8"
            onClick={onCreateGroup}
          >
            <Users className="w-3 h-3 mr-1" />
            {t.newGroup}
          </Button>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button 
            onClick={() => setView('chats')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${view === 'chats' ? 'bg-white shadow-sm text-whatsapp-primary' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.chats || 'Chats'}
          </button>
          <button 
            onClick={() => setView('directory')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all relative ${view === 'directory' ? 'bg-white shadow-sm text-whatsapp-primary' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.directory || 'Directory'}
          </button>
          <button 
            onClick={() => {
              setView('reminders');
              fetchAllReminders();
            }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all relative ${view === 'reminders' ? 'bg-white shadow-sm text-whatsapp-primary' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.reminders || 'Tasks'}
            {allReminders.filter(r => !r.isCompleted).length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[8px] text-white font-bold border border-white">
                {allReminders.filter(r => !r.isCompleted).length}
              </span>
            )}
          </button>
        </div>
      </div>



      {/* Content Area */}
      <ScrollArea className="flex-1">
        {view === 'directory' ? (
          <div className="p-3">
            <h3 className="text-sm font-semibold text-gray-500 mb-2 px-2">Select a user</h3>
            {filteredUsers.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No users found</p>
            ) : (
              <div className="space-y-1">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      onCreateChat(user.id);
                      setView('chats');
                    }}
                    className="w-full flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12 bg-whatsapp-primary text-white">
                        <AvatarImage src={getFullUrl(user.avatarUrl)} />
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      {user.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="font-semibold text-gray-900">{translateValue(user.name, language)}</p>
                      <p className="text-xs text-gray-500 truncate capitalize">{translateValue(user.role || 'Member', language)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : view === 'reminders' ? (
          <div className="p-3">
            <h3 className="text-sm font-semibold text-gray-500 mb-3 px-2 flex justify-between items-center">
              Active Tasks
              <Button variant="ghost" size="sm" onClick={fetchAllReminders} className="h-6 w-6 p-0">
                <Clock className="w-3 h-3" />
              </Button>
            </h3>
            {remindersLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-whatsapp-primary"></div>
              </div>
            ) : allReminders.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No tasks found</p>
            ) : (
              <div className="space-y-2">
                {allReminders.map((reminder) => (
                  <button
                    key={reminder.id}
                    onClick={() => {
                      const chat = chats.find(c => c.id === reminder.chat);
                      if (chat) onChatSelect(chat);
                    }}
                    className={`
                      w-full p-3 rounded-xl border text-left transition-all hover:shadow-md
                      ${reminder.isCompleted ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-gradient-to-br from-orange-50 to-white border-orange-100'}
                    `}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className={`p-1.5 rounded-md ${reminder.isCompleted ? 'bg-gray-400' : 'bg-orange-500'}`}>
                        <Clock className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${reminder.isCompleted ? 'bg-gray-100 text-gray-500' : 'bg-white text-orange-600 border-orange-100'}`}>
                        {reminder.isCompleted ? 'DONE' : 'PENDING'}
                      </span>
                    </div>
                    <p className={`text-xs font-bold leading-tight mb-1 ${reminder.isCompleted ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                      {reminder.content}
                    </p>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-[9px] text-gray-400">By: {reminder.sender?.name}</p>
                      <p className="text-[9px] font-medium text-orange-600">
                        {reminder.scheduleDate ? format(new Date(reminder.scheduleDate), 'MMM d, p') : ''}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {filteredChats.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-2">{t.noChats}</p>
                <Button variant="ghost" onClick={() => setView('directory')}>
                  {t.startConversation}
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredChats.map((chat) => {
                  const otherMember = chat.members?.find(m => (m.user.id || m.user._id) !== currentUser.id);
                  const lastMessage = chat.lastMessage;
                  const isActive = currentChat?.id === chat.id;

                  return (
                    <button
                      key={chat.id}
                      onClick={() => onChatSelect(chat)}
                      className={`
                        w-full flex items-center p-3 transition-colors text-left
                        ${isActive ? 'bg-gray-100' : 'hover:bg-gray-50'}
                      `}
                    >
                      <div className="relative">
                        <Avatar className="h-12 w-12 bg-whatsapp-primary text-white">
                          <AvatarImage src={chat.isGroup ? null : getFullUrl(otherMember?.user?.avatarUrl)} />
                          <AvatarFallback>
                            {chat.isGroup ? <img src="/logo.png" className="w-full h-full object-contain" alt="Group" /> : getInitials(chat.name)}
                          </AvatarFallback>
                        </Avatar>
                        {!chat.isGroup && otherMember?.user.isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <p className={`font-semibold truncate ${isActive ? 'text-whatsapp-primary' : 'text-gray-900'}`}>
                            {translateValue(chat.name, language)}
                          </p>
                          {lastMessage && (
                            <div className="flex flex-col items-end ml-2 shrink-0">
                              <p className="text-[10px] text-gray-500 mb-1">
                                {formatMessageDate(lastMessage.createdAt)}
                              </p>
                              {chat.unreadCount > 0 && !isActive && (
                                <div className="bg-whatsapp-primary text-white text-[10px] font-bold h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full shadow-sm animate-in zoom-in duration-200">
                                  {chat.unreadCount}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center mt-0.5">
                          {typingUsers[chat.id]?.length > 0 ? (
                            <p className="text-xs text-whatsapp-primary font-medium animate-pulse">
                              {chat.isGroup 
                                ? (typingUsers[chat.id].length === 1 
                                    ? `${users.find(u => u.id === typingUsers[chat.id][0])?.name || 'Someone'} is typing...`
                                    : `${typingUsers[chat.id].length} people are typing...`)
                                : 'Typing...'
                              }
                            </p>
                          ) : (
                            <>
                              {lastMessage && lastMessage.senderId === currentUser.id && (
                                <span className="mr-1">
                                  {getMessageStatusIcon(lastMessage.status)}
                                </span>
                              )}
                              <p className="text-xs text-gray-500 truncate flex-1">
                                {lastMessage ? (
                                  lastMessage.isDeleted ? (
                                    <span className="italic">This message was deleted</span>
                                  ) : (
                                    lastMessage.messageType === 'TEXT' 
                                      ? lastMessage.content 
                                      : (lastMessage.messageType === 'SCHEDULE' ? '⏰ Scheduled Reminder' : `Shared ${lastMessage.messageType.toLowerCase()}`)
                                  )
                                ) : (
                                  'No messages yet'
                                )}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
