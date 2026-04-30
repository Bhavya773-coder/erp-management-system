import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { Check, CheckCheck, FileText, Download, Trash2, Ban } from 'lucide-react';
import { fileAPI } from '@/lib/api';

export default function MessageBubble({ message, isOwn, showAvatar, onDelete }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const formatTime = (dateString) => {
    return format(new Date(dateString), 'h:mm a');
  };

  const getStatusIcon = () => {
    if (message.isDeleted) return null;
    switch (message.status) {
      case 'SEEN':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case 'DELIVERED':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'SENT':
        return <Check className="w-3 h-3 text-gray-400" />;
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
              <p className="text-sm font-medium truncate">{message.fileName || 'File'}</p>
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
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group relative`}>
      <div className={`flex items-end max-w-[70%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        {!isOwn && showAvatar && (
          <Avatar className="h-8 w-8 bg-whatsapp-primary text-white mr-2 mb-1">
            <AvatarImage src={getFullUrl(message.sender?.avatarUrl)} />
            <AvatarFallback className="text-xs">
              {getInitials(message.sender?.name)}
            </AvatarFallback>
          </Avatar>
        )}
        {!isOwn && !showAvatar && <div className="w-10 mr-2" />}

        {/* Message Bubble */}
        <div className="relative group">
          <div
            className={`
              px-3 py-2 rounded-lg shadow-sm
              ${isOwn 
                ? 'bg-whatsapp-light rounded-br-none' 
                : 'bg-white rounded-bl-none'
              }
            `}
          >
            {/* Sender name for group chats */}
            {!isOwn && message.sender?.name && (
              <p className="text-xs text-whatsapp-primary font-medium mb-1">
                {message.sender.name}
              </p>
            )}

            {/* Message Content */}
            {renderContent()}

            {/* Time and Status */}
            <div className={`flex items-center mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <span className="text-[10px] text-gray-500">
                {formatTime(message.createdAt)}
              </span>
              {isOwn && (
                <span className="ml-1">{getStatusIcon()}</span>
              )}
            </div>
          </div>

          {/* Delete Button for own messages */}
          {isOwn && !message.isDeleted && (
            <button 
              onClick={() => onDelete(message.id)}
              className="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:bg-red-50"
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
