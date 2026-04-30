import { Lock, Users, Zap, Sparkles, FolderOpen, ShieldCheck } from 'lucide-react';

export default function WelcomeScreen({ currentUser }) {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gray-50 p-6 sm:p-12 text-center overflow-y-auto">
      <div className="w-24 h-24 sm:w-32 sm:h-32 mb-8 animate-in zoom-in duration-500">
        <img src="/logo.png" alt="Arcadian Logo" className="w-full h-full object-contain drop-shadow-2xl" />
      </div>
      
      <div className="space-y-3 mb-12 sm:mb-16">
        <h1 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight">
          Welcome, <span className="text-whatsapp-primary">{currentUser?.name?.split(' ')[0]}</span>!
        </h1>
        <p className="text-gray-500 max-w-lg mx-auto text-base sm:text-xl font-medium leading-relaxed">
          The central hub for <span className="text-gray-900 font-bold">Arcadian Works</span> operations. Select a workspace to begin.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 max-w-5xl w-full">
        <div className="group flex flex-col items-center p-8 bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 transition-all hover:scale-105 hover:shadow-2xl">
          <div className="w-16 h-16 bg-whatsapp-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-whatsapp-primary group-hover:text-white transition-all duration-300">
            <Zap className="w-8 h-8 text-whatsapp-primary group-hover:text-white" />
          </div>
          <h3 className="font-black text-gray-900 text-lg mb-2">Live Fleet</h3>
          <p className="text-sm text-gray-500 font-medium leading-relaxed">Real-time sync and instant communication.</p>
        </div>

        <div className="group flex flex-col items-center p-8 bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 transition-all hover:scale-105 hover:shadow-2xl">
          <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-500 group-hover:text-white transition-all duration-300">
            <FolderOpen className="w-8 h-8 text-orange-600 group-hover:text-white" />
          </div>
          <h3 className="font-black text-gray-900 text-lg mb-2">Resource Hub</h3>
          <p className="text-sm text-gray-500 font-medium leading-relaxed">Centralized company data and fleet files.</p>
        </div>

        <div className="group flex flex-col items-center p-8 bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 transition-all hover:scale-105 hover:shadow-2xl">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-green-600 group-hover:text-white transition-all duration-300">
            <ShieldCheck className="w-8 h-8 text-green-600 group-hover:text-white" />
          </div>
          <h3 className="font-black text-gray-900 text-lg mb-2">Secure</h3>
          <p className="text-sm text-gray-500 font-medium leading-relaxed">Enterprise-grade security and encryption.</p>
        </div>
      </div>

      <div className="mt-16 sm:mt-24 flex flex-col items-center opacity-50">
        <div className="h-1.5 w-12 bg-gray-200 rounded-full mb-6" />
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-whatsapp-primary" />
          <p className="text-[10px] font-black text-gray-400 tracking-[0.3em] uppercase">
            Powered by Arcadian AI
          </p>
        </div>
      </div>
    </div>
  );
}
