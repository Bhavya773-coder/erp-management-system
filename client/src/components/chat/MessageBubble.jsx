import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, differenceInSeconds } from 'date-fns';
import { Check, CheckCheck, FileText, Download, Trash2, Ban, Timer, Calendar } from 'lucide-react';
import { fileAPI } from '@/lib/api';

const Countdown = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState(differenceInSeconds(new Date(targetDate), new Date()));

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      const remaining = differenceInSeconds(new Date(targetDate), new Date());
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, timeLeft]);

  if (timeLeft <= 0) {
    return <span className="text-red-500 font-bold animate-pulse">TIME ENDED!</span>;
  }

  const days = Math.floor(timeLeft / (24 * 3600));
  const hours = Math.floor((timeLeft % (24 * 3600)) / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="flex space-x-1 font-mono text-xs">
      {days > 0 && <span>{days}d</span>}
      {(days > 0 || hours > 0) && <span>{hours.toString().padStart(2, '0')}h</span>}
      <span>{minutes.toString().padStart(2, '0')}m</span>
      <span>{seconds.toString().padStart(2, '0')}s</span>
    </div>
  );
};

export default function MessageBubble({ message, isOwn, showAvatar, onDelete, onComplete, onStopAlarm }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [localCompleted, setLocalCompleted] = useState(false);

  const formatTime = (dateString) => {
    return format(new Date(dateString), 'h:mm a');
  };

  const getStatusIcon = () => {
    if (message.isDeleted) return null;
    switch (message.status) {
      case 'SEEN':
        return <CheckCheck className="w-4 h-4 text-[#53bdeb]" />;
      case 'DELIVERED':
        return <CheckCheck className="w-4 h-4 text-gray-400" />;
      case 'SENT':
        return <Check className="w-4 h-4 text-gray-400" />;
      default:
        return null;
    }
  };

  const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${baseUrl}${url}`;
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const shortenFileName = (name, maxLength = 12) => {
    if (!name) return 'File';
    if (name.length <= maxLength + 5) return name; // e.g. short name + .pdf
    const parts = name.split('.');
    if (parts.length > 1) {
      const ext = parts.pop();
      return `${name.substring(0, maxLength)}...${ext}`;
    }
    return `${name.substring(0, maxLength)}...`;
  };

  const handleFileDownload = async () => {
    if (message.isDeleted) return;
    
    try {
      const response = await fileAPI.getFileBlob(`/files/preview${message.fileUrl.replace('/uploads', '')}`);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', message.fileName || 'download');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const renderContent = () => {
    if (message.isDeleted) {
      return (
        <div className="flex items-center text-gray-400 italic text-sm py-1">
          <Ban className="w-3 h-3 mr-1" />
          <span>This message was deleted</span>
        </div>
      );
    }

    if (message.messageType === 'SCHEDULE') {
      const isCompleted = message.isCompleted || localCompleted;
      
      return (
        <div className={`
          border rounded-xl p-4 min-w-[260px] shadow-sm overflow-hidden relative group/schedule transition-all
          ${isCompleted 
            ? 'bg-gray-50 border-gray-200 opacity-80' 
            : 'bg-gradient-to-br from-orange-50 to-white border-orange-200'
          }
        `}>
          <div className={`absolute top-0 right-0 w-16 h-16 rounded-full -mr-8 -mt-8 ${isCompleted ? 'bg-gray-200/50' : 'bg-orange-100/50'}`} />
          
          <div className="flex items-start justify-between mb-3 relative z-10">
            <div className={`p-2 rounded-lg shadow-lg ${isCompleted ? 'bg-gray-400' : 'bg-orange-500'}`}>
              <Calendar className="w-5 h-5 text-white" />
            </div>
            {!isCompleted && (
              <div className="flex items-center space-x-1 bg-white px-2 py-1 rounded-full border border-orange-100 shadow-sm">
                <Timer className="w-3 h-3 text-orange-500" />
                <Countdown targetDate={message.scheduleDate} />
              </div>
            )}
            {isCompleted && (
               <div className="flex items-center space-x-1 bg-green-50 px-2 py-1 rounded-full border border-green-100 text-green-600 text-[10px] font-bold">
                  <CheckCheck className="w-3 h-3" />
                  DONE
               </div>
            )}
          </div>
          
          <div className="relative z-10">
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isCompleted ? 'text-gray-500' : 'text-orange-600'}`}>
              {isCompleted ? 'Reminder Completed' : 'Schedule Reminder'}
            </p>
            <h4 className={`text-sm font-bold leading-tight ${isCompleted ? 'text-gray-600 line-through' : 'text-gray-800'}`}>
              {message.content}
            </h4>
            <p className="text-[10px] text-gray-500 mt-2 flex items-center">
              {isCompleted ? 'Completed' : `Due: ${message.scheduleDate ? format(new Date(message.scheduleDate), 'MMM d, h:mm a') : 'Not set'}`}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-orange-100 flex items-center justify-between relative z-10">
             {!isCompleted && !isOwn && (
               <button 
                onClick={() => {
                  setLocalCompleted(true);
                  onStopAlarm(message.id);
                  onComplete(message.chatId, message.id);
                }}
                className="w-full py-2 bg-whatsapp-primary hover:bg-whatsapp-dark text-white text-xs font-bold rounded-lg shadow-md transition-all active:scale-95"
               >
                 Mark as Completed
               </button>
             )}
             {isCompleted && (
                <span className="text-[10px] font-medium text-gray-500 italic">Task closed</span>
             )}
             {!isCompleted && isOwn && (
                <span className="text-[10px] font-medium text-orange-500">Awaiting Response</span>
             )}
          </div>
        </div>
      );
    }

    const fullFileUrl = fileAPI.downloadFile(message.fileUrl);

    if (message.messageType === 'IMAGE' && message.fileUrl) {
      return (
        <div className="space-y-2">
          {!imageLoaded && !imageError && (
            <div className="bg-gray-200 rounded-lg animate-pulse h-40 w-48" />
          )}
          {imageError ? (
            <div className="flex items-center p-3 bg-gray-100 rounded-lg">
              <FileText className="w-8 h-8 text-gray-400 mr-2" />
              <span className="text-sm text-gray-600">Image unavailable</span>
            </div>
          ) : (
            <div className="relative group/img">
              <img
                src={fullFileUrl}
                alt="Shared image"
                className={`max-w-[250px] max-h-[250px] rounded-lg cursor-pointer transition-opacity ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
              {imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity rounded-lg space-x-2">
                  <button 
                    onClick={() => window.open(fullFileUrl, '_blank')}
                    className="p-2 bg-white rounded-full hover:bg-gray-100 text-gray-800"
                    title="Open in new tab"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleFileDownload}
                    className="p-2 bg-white rounded-full hover:bg-gray-100 text-gray-800"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
          {message.content && (
            <p className="text-sm">{message.content}</p>
          )}
        </div>
      );
    }

    if (message.messageType === 'FILE' && message.fileUrl) {
      return (
        <div className="space-y-2">
          <div className="flex items-center p-3 bg-white/50 rounded-lg">
            <div className="w-10 h-10 bg-whatsapp-primary rounded-lg flex items-center justify-center mr-3">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0 mr-4">
              <p className="text-sm font-medium truncate" title={message.fileName}>
                {shortenFileName(message.fileName)}
              </p>
              <p className="text-xs text-gray-500">{formatFileSize(message.fileSize)}</p>
            </div>
            <div className="flex space-x-1">
              <button 
                onClick={() => window.open(fullFileUrl, '_blank')}
                className="p-2 hover:bg-white/50 rounded-full text-gray-600"
                title="Open"
              >
                <FileText className="w-4 h-4" />
              </button>
              <button 
                onClick={handleFileDownload}
                className="p-2 hover:bg-white/50 rounded-full text-gray-600"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          {message.content && (
            <p className="text-sm">{message.content}</p>
          )}
        </div>
      );
    }

    return <p className="text-sm whitespace-pre-wrap">{message.content}</p>;
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group relative px-0 sm:px-1`}>
      <div className={`flex items-end max-w-[85%] sm:max-w-[70%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        {!isOwn && showAvatar && (
          <Avatar className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 mr-2 mb-1 border-2 border-white shadow-sm">
            <AvatarImage src={getFullUrl(message.sender?.avatarUrl)} />
            <AvatarFallback className="text-[10px] bg-whatsapp-primary text-white font-bold">
              {getInitials(message.sender?.name)}
            </AvatarFallback>
          </Avatar>
        )}
        {!isOwn && !showAvatar && <div className="w-9 sm:w-10 mr-2" />}

        {/* Message Bubble */}
        <div className="relative group">
          <div
            className={`
              px-3 py-2 rounded-[1.25rem] shadow-sm transition-all
              ${isOwn 
                ? (message.messageType === 'SCHEDULE' ? 'bg-transparent shadow-none p-0' : 'bg-whatsapp-primary text-white rounded-br-none') 
                : (message.messageType === 'SCHEDULE' ? 'bg-transparent shadow-none p-0' : 'bg-white text-gray-800 rounded-bl-none border border-gray-100')
              }
            `}
          >
            {/* Sender name for group chats */}
            {!isOwn && message.sender?.name && (
              <p className="text-[10px] font-black uppercase tracking-wider text-whatsapp-primary mb-1">
                {message.sender.name}
              </p>
            )}

            {/* Message Content */}
            <div className="leading-relaxed">
              {renderContent()}
            </div>

            {/* Time and Status */}
            {message.messageType !== 'SCHEDULE' && (
              <div className={`flex items-center mt-1.5 space-x-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <span className={`text-[9px] font-bold uppercase tracking-tighter ${isOwn ? 'text-white/70' : 'text-gray-400'}`}>
                  {formatTime(message.createdAt)}
                </span>
                {isOwn && (
                  <span className="shrink-0">{getStatusIcon()}</span>
                )}
              </div>
            )}
          </div>

          {/* Action Button - Visible on mobile, hover on desktop */}
          {isOwn && !message.isDeleted && (
            <button 
              onClick={() => onDelete(message.id)}
              className="absolute -left-10 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full shadow-md opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all text-red-500 hover:bg-red-50 lg:p-1.5"
              title="Delete message"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
