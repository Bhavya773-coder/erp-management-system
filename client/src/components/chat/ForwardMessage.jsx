import { useChatStore } from '@/store/chatStore';
import { messageAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function ForwardMessageModal({ isOpen, onClose, message, onForward }) {
  const { chats } = useChatStore();
  const { toast } = useToast();

  const handleForward = async (targetChatId) => {
    try {
      const result = await messageAPI.forwardMessage(message.id, targetChatId);

      if (result.data.success) {
        onForward(result.data.data.message);
        toast({
          title: 'Message Forwarded',
          description: 'Your message has been forwarded successfully.',
        });
        onClose();
      }
    } catch (error) {
      toast({
        title: 'Forward Failed',
        description: error.response?.data?.message || 'Failed to forward message',
        variant: 'destructive',
      });
    }
  };

  if (!isOpen || !message) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Forward Message</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="mb-6">
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-800 mb-2">{message.content || (message.messageType === 'IMAGE' ? 'Image' : 'File')}</p>
            {message.fileUrl && (
              <p className="text-xs text-gray-500 truncate">{message.fileName}</p>
            )}
          </div>
          <p className="text-xs text-gray-500">
            This message will be forwarded to a different chat. The forwarded message will be marked as "Forwarded from group".
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 mb-2">Forward to chat:</p>
          {chats.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => handleForward(chat.id)}
                  className="w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors border border-gray-200 hover:border-gray-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {chat.isGroup ? (
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                          <span className="text-orange-600 text-sm font-bold">
                            {chat.members?.length || '?'}
                          </span>
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 text-sm font-bold">
                            {chat.members?.[0]?.user?.name?.charAt(0) || '?'}
                          </span>
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-900">
                        {chat.isGroup ? chat.name : chat.members?.[0]?.user?.name || 'Unknown'}
                      </span>
                    </div>
                    {chat.unreadCount > 0 && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No chats available</p>
          )}
        </div>

        <div className="flex space-x-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
