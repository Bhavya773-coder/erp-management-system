import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Users, Search, Check } from 'lucide-react';

export default function CreateGroupModal({ users, currentUser, onClose, onCreate }) {
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const availableUsers = users.filter(u => u.id !== currentUser?.id);
  
  const filteredUsers = availableUsers.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedUsers.length < 2) return;
    
    setIsLoading(true);
    const result = await onCreate(groupName, selectedUsers);
    setIsLoading(false);
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Create Group</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name *</Label>
            <Input
              id="groupName"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          {/* Search Users */}
          <div className="space-y-2">
            <Label>Add Members (min 2)</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Selected Count */}
          {selectedUsers.length > 0 && (
            <p className="text-sm text-whatsapp-primary font-medium">
              {selectedUsers.length} member{selectedUsers.length !== 1 ? 's' : ''} selected
            </p>
          )}

          {/* User List */}
          <ScrollArea className="h-64 border rounded-lg">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No users found
              </div>
            ) : (
              filteredUsers.map(user => {
                const isSelected = selectedUsers.includes(user.id);
                return (
                  <div
                    key={user.id}
                    onClick={() => toggleUser(user.id)}
                    className={`
                      flex items-center p-3 cursor-pointer transition-colors
                      ${isSelected ? 'bg-whatsapp-light' : 'hover:bg-gray-50'}
                    `}
                  >
                    <div className={`
                      w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center
                      ${isSelected 
                        ? 'bg-whatsapp-primary border-whatsapp-primary' 
                        : 'border-gray-300'
                      }
                    `}>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                    
                    <Avatar className="h-10 w-10 bg-whatsapp-primary text-white">
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    
                    <div className="ml-3 flex-1">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                );
              })
            )}
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={!groupName.trim() || selectedUsers.length < 2 || isLoading}
            className="bg-whatsapp-primary hover:bg-whatsapp-dark"
          >
            {isLoading ? 'Creating...' : 'Create Group'}
          </Button>
        </div>
      </div>
    </div>
  );
}
