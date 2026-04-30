import { Lock, Users, Zap } from 'lucide-react';

export default function WelcomeScreen({ currentUser }) {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-whatsapp-gray p-8 text-center">
      <div className="w-24 h-24 mb-6">
        <img src="/logo.png" alt="Arcadian Logo" className="w-full h-full object-contain" />
      </div>
      
      <h1 className="text-3xl font-bold text-gray-800 mb-2">
        Welcome, {currentUser?.name?.split(' ')[0]}!
      </h1>
      
      <p className="text-gray-500 mb-12 max-w-md text-lg">
        Select a chat from the sidebar or start a new conversation to begin messaging.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl">
        <div className="flex flex-col items-center p-6 bg-white/50 rounded-2xl shadow-sm border border-gray-100/50 backdrop-blur-sm transition-all hover:shadow-md">
          <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-4 transform rotate-3">
            <Zap className="w-7 h-7 text-green-600" />
          </div>
          <h3 className="font-bold text-gray-800 mb-2">Real-time Chat</h3>
          <p className="text-sm text-gray-500 leading-relaxed">Instant messaging with live typing indicators</p>
        </div>

        <div className="flex flex-col items-center p-6 bg-white/50 rounded-2xl shadow-sm border border-gray-100/50 backdrop-blur-sm transition-all hover:shadow-md">
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-4 -rotate-3">
            <Users className="w-7 h-7 text-blue-600" />
          </div>
          <h3 className="font-bold text-gray-800 mb-2">Group Chats</h3>
          <p className="text-sm text-gray-500 leading-relaxed">Create groups and collaborate with your team</p>
        </div>

        <div className="flex flex-col items-center p-6 bg-white/50 rounded-2xl shadow-sm border border-gray-100/50 backdrop-blur-sm transition-all hover:shadow-md">
          <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-4 rotate-6">
            <Lock className="w-7 h-7 text-purple-600" />
          </div>
          <h3 className="font-bold text-gray-800 mb-2">Secure</h3>
          <p className="text-sm text-gray-500 leading-relaxed">Your conversations are private and secure</p>
        </div>
      </div>

      <div className="mt-16 flex flex-col items-center">
        <div className="h-px w-16 bg-gray-200 mb-6" />
        <p className="text-sm font-bold text-whatsapp-primary tracking-[0.2em] uppercase">
          Arcadian ERP
        </p>
      </div>
    </div>
  );
}
