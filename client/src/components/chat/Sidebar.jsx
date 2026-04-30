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
  const [showNewChat, setShowNewChat] = useState(false);
  const t = translations[language];

  const filteredChats = chats.filter(chat => 
    chat.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getChatName = (chat) => {
    if (chat.isGroup) return chat.name;
    const otherMember = chat.members?.find(m => m.user.id !== currentUser.id);
    return otherMember?.user.name || 'Unknown User';
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${baseUrl}${url}`;
  };

  const getMessageStatusIcon = (status) => {
    switch (status) {
      case 'SEEN':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
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
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 bg-whatsapp-primary text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10 bg-white text-whatsapp-primary">
              <AvatarImage src={getFullUrl(currentUser?.avatarUrl)} />
              <AvatarFallback>{getInitials(currentUser?.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{translateValue(currentUser?.name, language)}</p>
              <p className="text-xs text-white/80 capitalize">{translateValue(currentUser?.role, language)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <Globe className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLanguage('en')}>English (EN)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('hi')}>हिन्दी (HI)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('gu')}>ગુજરાતી (GU)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* AI Assistant Button (Disabled for now) ... */}
            
            {currentUser?.role === 'ADMIN' && (
              <Link to="/admin">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white hover:bg-white/20" 
                  title="Admin Dashboard"
                >
                  <LayoutDashboard className="h-5 w-5" />
                </Button>
              </Link>
            )}

            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={onEditProfile}>
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={onLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/10 border-0 text-white placeholder:text-white/70 focus-visible:ring-white/30"
          />
        </div>
      </div>

      {/* Action Buttons & Tabs */}
      <div className="p-3 border-b border-gray-100">
        <div className="flex space-x-2 mb-3">
          <Button 
            variant="outline" 
            className="flex-1 text-xs h-8"
            onClick={() => setShowNewChat(!showNewChat)}
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
            onClick={() => setShowNewChat(false)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${!showNewChat ? 'bg-white shadow-sm text-whatsapp-primary' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.chats || 'Chats'}
          </button>
          <button 
            onClick={() => setShowNewChat(true)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all relative ${showNewChat ? 'bg-white shadow-sm text-whatsapp-primary' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.directory || 'Directory'}
            {users.filter(u => u.isOnline).length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border border-white"></span>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Online Now - Horizontal List (Only in Chats tab) */}
      {!showNewChat && users.some(u => u.isOnline) && (
        <div className="py-3 border-b border-gray-50">
          <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Online Now</p>
          <ScrollArea className="w-full" orientation="horizontal">
            <div className="flex space-x-4 px-4 pb-2">
              {users.filter(u => u.isOnline).map(user => (
                <button 
                  key={user.id} 
                  onClick={() => onCreateChat(user.id)}
                  className="flex flex-col items-center space-y-1 min-w-[50px]"
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10 border-2 border-green-500 p-0.5">
                      <AvatarImage src={getFullUrl(user.avatarUrl)} className="rounded-full" />
                      <AvatarFallback className="text-[10px]">{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <p className="text-[10px] font-medium text-gray-600 truncate w-12 text-center">
                    {user.name.split(' ')[0]}
                  </p>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Chat List */}
      <ScrollArea className="flex-1">
        {showNewChat ? (
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
                      setShowNewChat(false);
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
        ) : (
          <div>
            {filteredChats.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-2">{t.noChats}</p>
                <Button variant="ghost" onClick={() => setShowNewChat(true)}>
                  {t.startConversation}
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredChats.map((chat) => {
                  const otherMember = chat.members?.find(m => m.user.id !== currentUser.id);
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
                            {chat.isGroup ? <Users className="w-5 h-5" /> : getInitials(chat.name)}
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
                                      : `Shared ${lastMessage.messageType.toLowerCase()}`
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
