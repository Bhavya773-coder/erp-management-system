import { MessageSquare, Lock, Users, Zap } from 'lucide-react';

export default function WelcomeScreen({ currentUser }) {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-whatsapp-gray p-8 text-center">
      <div className="w-24 h-24 bg-whatsapp-primary rounded-full flex items-center justify-center mb-6">
        <MessageSquare className="w-12 h-12 text-white" />
      </div>
      
      <h1 className="text-2xl font-bold text-gray-800 mb-2">
        Welcome, {currentUser?.name?.split(' ')[0]}!
      </h1>
      
      <p className="text-gray-500 mb-8 max-w-md">
        Select a chat from the sidebar or start a new conversation to begin messaging.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl">
        <div className="flex flex-col items-center p-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
            <Zap className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-700 mb-1">Real-time Chat</h3>
          <p className="text-sm text-gray-500">Instant messaging with live typing indicators</p>
        </div>

        <div className="flex flex-col items-center p-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-700 mb-1">Group Chats</h3>
          <p className="text-sm text-gray-500">Create groups and collaborate with your team</p>
        </div>

        <div className="flex flex-col items-center p-4">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
            <Lock className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-700 mb-1">Secure</h3>
          <p className="text-sm text-gray-500">Your conversations are private and secure</p>
        </div>
      </div>

      <div className="mt-12 text-xs text-gray-400">
        <p>WhatsApp Chat - Built for your ERP + AI Platform</p>
      </div>
    </div>
  );
}
