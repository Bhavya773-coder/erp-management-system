import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { userAPI, chatAPI } from '@/lib/api';
import { 
  Users, 
  MessageSquare, 
  ShieldCheck, 
  Trash2, 
  Edit, 
  Search, 
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

export default function AdminDashboard() {
  const { user: currentUser } = useAuthStore();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('users');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const usersRes = await userAPI.getUsers();
      const chatsRes = await chatAPI.getChats();
      setUsers(usersRes.data.data.users || []);
      setChats(chatsRes.data.data.chats || []);
    } catch (error) {
      toast({
        title: "Error fetching data",
        description: "Could not load admin data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to permanently delete user "${userName}"? This action cannot be undone.`)) {
      try {
        await userAPI.deleteUser(userId);
        toast({
          title: "User Deleted",
          description: "The user has been successfully removed.",
        });
        fetchData(); // Refresh list
      } catch (error) {
        toast({
          title: "Deletion failed",
          description: error.response?.data?.message || "Could not delete user.",
          variant: "destructive"
        });
      }
    }
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await userAPI.updateUserRole(userId, newRole);
      toast({
        title: "Role Updated",
        description: `User role has been changed to ${newRole}.`,
      });
      fetchData(); // Refresh list
    } catch (error) {
      toast({
        title: "Update failed",
        description: error.response?.data?.message || "Could not update user role.",
        variant: "destructive"
      });
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Admin Header */}
      <div className="bg-whatsapp-dark text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/10 rounded-xl">
              <ShieldCheck className="w-8 h-8 text-whatsapp-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Admin Control Panel</h1>
              <p className="text-white/60 text-sm">Managing Arcadian Works ERP Ecosystem</p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => window.location.href = '/'} className="text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Chat
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full flex-1 p-6 flex flex-col md:flex-row gap-6">
        {/* Admin Sidebar */}
        <div className="w-full md:w-64 space-y-2">
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center space-x-3 p-4 rounded-xl transition-all ${activeTab === 'users' ? 'bg-whatsapp-primary text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            <Users className="w-5 h-5" />
            <span className="font-bold">User Management</span>
          </button>
          <button 
            onClick={() => setActiveTab('chats')}
            className={`w-full flex items-center space-x-3 p-4 rounded-xl transition-all ${activeTab === 'chats' ? 'bg-whatsapp-primary text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="font-bold">Active Chats</span>
          </button>
        </div>

        {/* Main Admin Area */}
        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-800 capitalize">{activeTab} Management</h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-gray-200"
              />
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center p-12">
                <Loader2 className="w-12 h-12 text-whatsapp-primary animate-spin mb-4" />
                <p className="text-gray-500 animate-pulse">Syncing with database...</p>
              </div>
            ) : activeTab === 'users' ? (
              <ScrollArea className="h-full">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Professional Info</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow key={u.id} className="hover:bg-gray-50/50 transition-colors">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10 border-2 border-whatsapp-primary/10">
                              <AvatarImage src={u.avatarUrl} />
                              <AvatarFallback>{getInitials(u.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-gray-900">{u.name}</p>
                              <p className="text-xs text-gray-500">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${u.role === 'ADMIN' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                            {u.role}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {u.isOnline ? (
                              <div className="flex items-center text-green-600 text-xs font-medium">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2" /> Online
                              </div>
                            ) : (
                              <div className="flex items-center text-gray-400 text-xs font-medium">
                                <div className="w-2 h-2 bg-gray-300 rounded-full mr-2" /> Offline
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-1">
                            <p><span className="text-gray-400">Edu:</span> {u.education || 'N/A'}</p>
                            <p><span className="text-gray-400">Phone:</span> {u.phone || 'N/A'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            {u.role === 'EMPLOYEE' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleUpdateRole(u.id, 'MANAGER')}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50 flex items-center"
                              >
                                Promote to Manager
                              </Button>
                            )}
                            {u.role === 'MANAGER' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleUpdateRole(u.id, 'EMPLOYEE')}
                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 flex items-center"
                              >
                                Demote to Employee
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="hover:text-whatsapp-primary">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="hover:text-red-500"
                              onClick={() => handleDeleteUser(u.id, u.name)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <div className="p-12 text-center text-gray-500">
                <img src="/logo.jpeg" className="w-16 h-16 mx-auto mb-4 opacity-10 grayscale" alt="Logo" />
                <p>Chat Management logic will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
