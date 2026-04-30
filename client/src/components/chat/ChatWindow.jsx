import { useEffect, useRef, useState, useCallback } from 'react';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { translations, translateValue } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import MessageBubble from './MessageBubble';
import { 
  ArrowLeft, 
  MoreVertical, 
  Paperclip, 
  Send,
  Phone,
  Video,
  Search,
  X,
  Users,
  Image as ImageIcon,
  File,
  Trash2
} from 'lucide-react';
import { fileAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { format, isToday, isYesterday } from 'date-fns';
import ScheduleDialog from './ScheduleDialog';
import { Calendar } from 'lucide-react';

export default function ChatWindow({ 
  currentUser, 
  chat, 
  messages, 
  onSendMessage,
  onDeleteMessage,
  onCompleteSchedule,
  onStopAlarm,
  onStartTyping,
  onStopTyping,
  onDeleteChat,
  onBack 
}) {
  const { language } = useAuthStore();
  const t = translations[language];
  const typingUsers = useChatStore((state) => state.typingUsers);
  const [showDetails, setShowDetails] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const handleDeleteChat = async () => {
    if (window.confirm('Are you sure you want to delete this whole conversation for everyone? This action cannot be undone and all data will be erased.')) {
      const result = await onDeleteChat(chat.id);
      if (result.success) {
        toast({
          title: "Conversation Deleted",
          description: "The chat has been permanently erased for all members.",
          variant: "default",
        });
      } else {
        toast({
          title: "Deletion Failed",
          description: result.error || "Could not delete the conversation.",
          variant: "destructive",
        });
      }
    }
  };

  const filteredMessages = messages.filter(m => 
    !m.isDeleted && m.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (chat?.id) {
      const { fetchChat } = useChatStore.getState();
      fetchChat(chat.id);
    }
  }, [chat?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    
    // Typing indicator logic
    onStartTyping();
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping();
    }, 1000);
  };

  const handleSend = () => {
    if (!inputMessage.trim()) return;
    
    onSendMessage(inputMessage);
    setInputMessage('');
    onStopTyping();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setShowAttachMenu(false);

    try {
      const response = await fileAPI.uploadFile(file);
      const { fileUrl, fileName, fileSize } = response.data.data;

      const isImage = file.type.startsWith('image/');
      
      onSendMessage('', {
        fileUrl,
        fileName,
        fileSize,
        isImage
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error.response?.data?.message || 'Failed to upload file',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getChatName = () => {
    if (chat.isGroup) return chat.name;
    const otherMember = chat.members?.find(m => m.user.id !== currentUser?.id);
    return otherMember?.user?.name || 'Unknown';
  };

  const getChatStatus = () => {
    if (chat.isGroup) {
      return `${chat.members?.length || 0} members`;
    }
    
    // Check typing status first
    const isTyping = typingUsers[chat.id]?.length > 0;
    if (isTyping) return 'Typing...';

    // Find the other member
    const otherMember = chat.members?.find(m => 
      (m.user.id || m.user._id).toString() !== (currentUser.id || currentUser._id).toString()
    );
    const user = otherMember?.user;

    if (!user) return 'Offline';

    if (user.isOnline) return 'Online';
    
    if (user.lastSeen) {
      const date = new Date(user.lastSeen);
      if (isToday(date)) return `Last seen today at ${format(date, 'h:mm a')}`;
      if (isYesterday(date)) return `Last seen yesterday at ${format(date, 'h:mm a')}`;
      return `Last seen ${format(date, 'M/d/yy')} at ${format(date, 'h:mm a')}`;
    }

    return 'Offline';
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

  const getOtherMember = () => {
    if (chat.isGroup) return null;
    
    // Normalize current user ID
    const currentUserId = (currentUser?.id || currentUser?._id || currentUser)?.toString().toLowerCase();
    
    const otherMember = chat.members?.find(m => {
      const memberUserId = (m.user?.id || m.user?._id || m.user)?.toString().toLowerCase();
      return memberUserId && memberUserId !== currentUserId;
    });

    return otherMember;
  };

  const otherMember = getOtherMember();

  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showPinMenu, setShowPinMenu] = useState(false);

  const handleScheduleSend = (scheduleData) => {
    onSendMessage(scheduleData.title, {
      messageType: 'SCHEDULE',
      scheduleDate: scheduleData.scheduleDate
    });
  };

  return (
    <div className="h-full flex overflow-hidden relative w-full flex-col">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-whatsapp-gray min-w-0 h-full relative">
        {/* Header */}
        <div className="z-20 flex flex-col bg-white/80 backdrop-blur-md border-b border-gray-100 shrink-0">
          <div className="flex items-center p-2 sm:p-4">
            <div 
              className="flex items-center flex-1 min-w-0 cursor-pointer hover:bg-gray-100/50 p-1 rounded-2xl transition-all"
              onClick={() => setShowDetails(true)}
            >
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden mr-1 sm:mr-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onBack();
                }}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              
              <div className="relative shrink-0">
                <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-white shadow-sm">
                  {chat.isGroup ? (
                    <div className="bg-whatsapp-primary w-full h-full flex items-center justify-center">
                      <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                  ) : (
                    <>
                      <AvatarImage src={getFullUrl(otherMember?.user?.avatarUrl)} />
                      <AvatarFallback className="bg-whatsapp-primary text-white text-sm sm:text-base">
                        {getInitials(getChatName())}
                      </AvatarFallback>
                    </>
                  )}
                </Avatar>
                {!chat.isGroup && getChatStatus() === 'Online' && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
                )}
              </div>
              
              <div className="ml-3 flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate text-sm sm:text-base">{translateValue(getChatName(), language)}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 truncate font-medium uppercase tracking-wider">{translateValue(getChatStatus(), language)}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className={`text-gray-500 rounded-full h-10 w-10 ${showSearch ? 'bg-whatsapp-primary/10 text-whatsapp-primary' : ''}`}
                onClick={() => {
                  setShowSearch(!showSearch);
                  if (showSearch) setSearchQuery('');
                }}
              >
                <Search className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-500 rounded-full h-10 w-10">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {showSearch && (
            <div className="px-3 pb-3 animate-in slide-in-from-top duration-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white"
                  autoFocus
                />
                {searchQuery && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Messages Area - Scrollable */}
        <div className="flex-1 overflow-y-auto py-4 px-1 sm:px-4 bg-[#efeae2] scroll-smooth">
          <div className="max-w-4xl w-full mx-auto space-y-4 pb-4">
            {filteredMessages.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">{searchQuery ? 'No matches' : t.noMessages}</p>
              </div>
            ) : (
              filteredMessages.map((message, index) => {
                const messageDate = new Date(message.createdAt);
                const prevMessageDate = index > 0 ? new Date(filteredMessages[index - 1].createdAt) : null;
                
                const isNewDay = !prevMessageDate || 
                  messageDate.toDateString() !== prevMessageDate.toDateString();

                const formatDateHeader = (date) => {
                  const today = new Date();
                  const yesterday = new Date(today);
                  yesterday.setDate(yesterday.getDate() - 1);

                  if (date.toDateString() === today.toDateString()) {
                    return 'Today';
                  } else if (date.toDateString() === yesterday.toDateString()) {
                    return 'Yesterday';
                  } else {
                    return format(date, 'MMMM d, yyyy');
                  }
                };

                return (
                  <div key={message.id || index}>
                    {isNewDay && (
                      <div className="flex justify-center my-4">
                        <span className="bg-white px-3 py-1 rounded-lg text-xs text-gray-500 shadow-sm border border-gray-100 uppercase tracking-wider font-medium">
                          {formatDateHeader(messageDate)}
                        </span>
                      </div>
                    )}
                    <MessageBubble
                      message={message}
                      isOwn={(message.senderId || message.sender?._id || message.sender?.id)?.toString() === currentUser?.id?.toString()}
                      showAvatar={!chat.isGroup ? false : true}
                      onDelete={onDeleteMessage}
                      onComplete={onCompleteSchedule}
                      onStopAlarm={onStopAlarm}
                    />
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} className="h-1" />
          </div>
        </div>

        {/* Input Footer Area */}
        <div className="z-20 p-2 sm:p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 shrink-0">
          {showPinMenu && (
            <div className="absolute bottom-full left-4 mb-4 bg-white rounded-3xl shadow-2xl border border-gray-100 p-3 animate-in slide-in-from-bottom-4 duration-300 z-50 min-w-[240px] overflow-hidden">
              <button 
                onClick={() => {
                  setShowPinMenu(false);
                  fileInputRef.current?.click();
                }}
                className="flex items-center p-4 hover:bg-whatsapp-primary/5 rounded-2xl w-full transition-all group"
              >
                <div className="p-2 bg-whatsapp-primary/10 rounded-xl group-hover:bg-whatsapp-primary group-hover:text-white transition-colors mr-3">
                  <File className="w-5 h-5 text-whatsapp-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-gray-900">Photos & Files</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">Send documents</p>
                </div>
              </button>
              
              <button 
                onClick={() => {
                  setShowPinMenu(false);
                  setShowScheduleDialog(true);
                }}
                className="flex items-center p-4 hover:bg-orange-50 rounded-2xl w-full transition-all group"
              >
                <div className="p-2 bg-orange-100 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-colors mr-3">
                  <Calendar className="w-5 h-5 text-orange-500 group-hover:text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-gray-900">Create Schedule</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">Team Reminders</p>
                </div>
              </button>
            </div>
          )}

          <div className="flex items-center space-x-2 sm:space-x-4 max-w-5xl mx-auto">
            <input
              type="file"
              onChange={(e) => handleFileUpload(e, 'any')}
              className="hidden"
              id="any-file-input"
              ref={fileInputRef}
            />
            <Button 
              variant="ghost" 
              size="icon"
              className={`h-11 w-11 rounded-full text-gray-500 transition-all ${showPinMenu ? 'bg-whatsapp-primary text-white rotate-45' : 'hover:bg-gray-100'}`}
              onClick={() => setShowPinMenu(!showPinMenu)}
              disabled={isUploading}
            >
              <Paperclip className={`h-5 w-5 ${isUploading ? 'animate-spin' : ''}`} />
            </Button>
            
            <div className="flex-1 min-w-0 bg-gray-100/50 rounded-[1.5rem] border border-transparent focus-within:bg-white focus-within:border-whatsapp-primary focus-within:shadow-sm transition-all px-2">
              <input
                type="text"
                placeholder={t.typeMessage}
                value={inputMessage}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                className="w-full min-w-0 h-11 bg-transparent border-0 outline-none focus:ring-0 px-2 text-sm sm:text-base text-gray-900 placeholder:text-gray-500"
                disabled={isUploading}
              />
            </div>
            
            <Button 
              onClick={handleSend}
              disabled={!inputMessage.trim() || isUploading}
              className="bg-whatsapp-primary hover:bg-whatsapp-dark text-white shadow-lg shadow-whatsapp-primary/20 rounded-full h-11 w-11 shrink-0 transition-transform active:scale-90"
              size="icon"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <ScheduleDialog 
          open={showScheduleDialog} 
          onOpenChange={setShowScheduleDialog}
          onSchedule={handleScheduleSend}
        />
      </div>

      {/* Chat Details Panel */}
      {showDetails && (
        <div className="absolute right-0 top-0 bottom-0 w-full sm:w-80 lg:w-96 bg-white border-l border-gray-200 z-[60] flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl">
          <div className="p-4 bg-gray-50 flex items-center border-b border-gray-200">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowDetails(false)}
              className="mr-2"
            >
              <X className="h-5 w-5" />
            </Button>
            <h3 className="font-bold text-gray-800">
              {chat.isGroup ? t.groupInfo : t.contactInfo}
            </h3>
          </div>

          <ScrollArea className="flex-1">
            <div className="flex flex-col items-center py-8 px-4 text-center">
              <Avatar className="h-32 w-32 border-4 border-white shadow-lg mb-4">
                {chat.isGroup ? (
                  <div className="bg-whatsapp-primary w-full h-full flex items-center justify-center">
                    <Users className="h-16 w-16 text-white" />
                  </div>
                ) : (
                  <>
                    <AvatarImage src={getFullUrl(otherMember?.user?.avatarUrl)} />
                    <AvatarFallback className="bg-whatsapp-primary text-white text-4xl">
                      {getInitials(getChatName())}
                    </AvatarFallback>
                  </>
                )}
              </Avatar>
              <h2 className="text-xl font-bold text-gray-900">{translateValue(getChatName(), language)}</h2>
              {!chat.isGroup && (
                <p className="text-sm text-gray-500 mt-1">{translateValue(getChatStatus(), language)}</p>
              )}
            </div>

            <Separator />

            <div className="p-6 space-y-6">
              {!chat.isGroup ? (
                // Contact Details
                <>
                    <div className="space-y-1 text-left">
                      <p className="text-xs font-bold text-whatsapp-dark uppercase tracking-wider">{t.about}</p>
                      <p className="text-sm text-gray-700 capitalize">
                        {translateValue(otherMember?.user?.role || 'Member', language)} {t.inArcadian}
                      </p>
                    </div>
                    
                    <div className="space-y-1 text-left">
                      <p className="text-xs font-bold text-whatsapp-dark uppercase tracking-wider">{t.phone}</p>
                      <p className="text-sm text-gray-700">
                        {otherMember?.user?.phone || t.notProvided}
                      </p>
                    </div>

                    <div className="space-y-1 text-left">
                      <p className="text-xs font-bold text-whatsapp-dark uppercase tracking-wider">{t.email}</p>
                      <p className="text-sm text-gray-700">
                        {otherMember?.user?.email || 'N/A'}
                      </p>
                    </div>

                    <div className="space-y-1 text-left">
                      <p className="text-xs font-bold text-whatsapp-dark uppercase tracking-wider">{t.education}</p>
                      <p className="text-sm text-gray-700">
                        {translateValue(otherMember?.user?.education || t.notProvided, language)}
                      </p>
                    </div>

                    <div className="space-y-2 text-left">
                      <p className="text-xs font-bold text-whatsapp-dark uppercase tracking-wider">{t.skills}</p>
                      <div className="flex flex-wrap gap-2">
                        {otherMember?.user?.skills?.length > 0 ? (
                          otherMember.user.skills.map((skill, i) => (
                            <span key={i} className="px-2 py-1 bg-whatsapp-gray text-whatsapp-dark text-xs font-medium rounded border border-whatsapp-primary/20">
                              {translateValue(skill, language)}
                            </span>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 italic">No skills listed</p>
                        )}
                      </div>
                    </div>
                </>
              ) : (
                // Group Details
                <>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-whatsapp-dark uppercase tracking-wider">Description</p>
                    <p className="text-sm text-gray-700">This is a group chat for the Arcadian Works ERP team.</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-whatsapp-dark uppercase tracking-wider">
                        {chat.members?.length || 0} {t.members}
                      </p>
                    </div>
                    <div className="space-y-3">
                      {chat.members?.map(member => (
                        <div key={member.id} className="flex items-center">
                          <Avatar className="h-8 w-8 mr-3">
                            <AvatarImage src={getFullUrl(member.user.avatarUrl)} />
                            <AvatarFallback className="bg-gray-200 text-[10px]">
                              {getInitials(member.user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{translateValue(member.user.name, language)}</p>
                            {member.isAdmin && <p className="text-[10px] text-whatsapp-dark font-bold uppercase">{t.admin}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator className="my-6" />
              
              <div className="pt-2 pb-8">
                <Button 
                  variant="destructive" 
                  className="w-full bg-red-50 text-red-600 border-red-100 hover:bg-red-600 hover:text-white transition-all rounded-xl font-bold py-6"
                  onClick={handleDeleteChat}
                >
                  <Trash2 className="w-5 h-5 mr-2" />
                  DELETE CONVERSATION
                </Button>
                <p className="text-[10px] text-gray-400 mt-3 text-center leading-relaxed">
                  Permanently erase all messages and data for both you and the other participant.
                </p>
              </div>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
