import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { translations } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera, Phone, GraduationCap, Briefcase, Upload, Receipt, ExternalLink } from 'lucide-react';
import { fileAPI, messageAPI } from '@/lib/api';
import { format } from 'date-fns';

export default function ProfileModal({ isOpen, onClose }) {
  const { user, updateProfile, isLoading, language } = useAuthStore();
  const { setCurrentChat } = useChatStore();
  const t = translations[language];
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [myVouchers, setMyVouchers] = useState([]);
  const [vouchersLoading, setVouchersLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    education: user?.education || '',
    skills: Array.isArray(user?.skills) ? user.skills.join(', ') : '',
    avatarUrl: user?.avatarUrl || ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        education: user.education || '',
        skills: Array.isArray(user.skills) ? user.skills.join(', ') : '',
        avatarUrl: user.avatarUrl || ''
      });
      
      if (isOpen) {
        fetchMyVouchers();
      }
    }
  }, [user, isOpen]);

  const fetchMyVouchers = async () => {
    setVouchersLoading(true);
    try {
      const response = await messageAPI.getMyVouchers();
      setMyVouchers(response.data.data.vouchers || []);
    } catch (error) {
      console.error('Failed to fetch vouchers:', error);
    } finally {
      setVouchersLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: t.invalidFile,
        description: t.pleaseUploadImage,
        variant: 'destructive'
      });
      return;
    }

    setIsUploading(true);
    try {
      const response = await fileAPI.uploadFile(file);
      setFormData(prev => ({ ...prev, avatarUrl: response.data.data.fileUrl }));
      toast({
        title: t.imageUploaded,
        description: t.profilePictureUpdated
      });
    } catch (error) {
      toast({
        title: t.uploadFailed,
        description: t.couldNotUpload,
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await updateProfile({
      phone: formData.phone,
      education: formData.education,
      skills: formData.skills,
      avatarUrl: formData.avatarUrl
    });

    if (result.success) {
      toast({
        title: t.profileUpdated,
        description: t.detailsSaved,
      });
      onClose();
    } else {
      toast({
        title: t.updateFailed,
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${baseUrl}${url}`;
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  const handleGoToChat = (chat) => {
    setCurrentChat(chat);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{t.myProfile}</DialogTitle>
          <DialogDescription>
            {t.updateProfessionalDetails}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center space-y-4 mb-6">
              <div className="relative group">
                <Avatar className="h-24 w-24 border-2 border-whatsapp-primary/20 shadow-md">
                  <AvatarImage src={getFullUrl(formData.avatarUrl)} />
                  <AvatarFallback className="bg-whatsapp-primary text-white text-3xl font-bold">
                    {getInitials(formData.name)}
                  </AvatarFallback>
                </Avatar>
                <label 
                  className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  htmlFor="avatar-upload"
                >
                  {isUploading ? (
                    <Loader2 className="text-white h-6 w-6 animate-spin" />
                  ) : (
                    <Camera className="text-white h-6 w-6" />
                  )}
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-lg">{formData.name}</h3>
                <p className="text-sm text-gray-500 uppercase tracking-tight">{user?.role} • {formData.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center text-xs font-bold text-gray-500 uppercase">
                  <Phone className="h-3 w-3 mr-1" /> {t.phone}
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="+91 9876543210"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="education" className="flex items-center text-xs font-bold text-gray-500 uppercase">
                  <GraduationCap className="h-3 w-3 mr-1" /> {t.education}
                </Label>
                <Input
                  id="education"
                  name="education"
                  placeholder="MBA, B.Tech, etc."
                  value={formData.education}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="skills" className="flex items-center text-xs font-bold text-gray-500 uppercase">
                <Briefcase className="h-3 w-3 mr-1" /> {t.skills}
              </Label>
              <Input
                id="skills"
                name="skills"
                placeholder="React, Project Management, Sales, etc."
                value={formData.skills}
                onChange={handleChange}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isLoading} className="bg-whatsapp-primary hover:bg-whatsapp-dark">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.saving}
                  </>
                ) : (
                  t.saveChanges
                )}
              </Button>
            </div>
          </form>

          {/* My Vouchers Section */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Receipt className="h-5 w-5 text-whatsapp-primary" />
                <h4 className="font-bold text-sm uppercase tracking-wider text-gray-700">My Vouchers</h4>
              </div>
              <span className="text-xs text-gray-500">{myVouchers.length} Total</span>
            </div>

            {vouchersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-whatsapp-primary" />
              </div>
            ) : myVouchers.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
                <p className="text-sm text-gray-500">No vouchers created yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myVouchers.map((v) => {
                  const vData = v.voucherData || {};
                  return (
                    <div 
                      key={v._id || v.id} 
                      className="group flex items-center justify-between p-4 bg-white border rounded-xl hover:border-whatsapp-primary/30 hover:shadow-sm transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-gray-900">{vData.number || 'VOU-000'}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            vData.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                            vData.status === 'DENIED' ? 'bg-red-100 text-red-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {vData.status || 'PENDING'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {v.createdAt && format(new Date(v.createdAt), 'dd MMM yyyy, HH:mm')}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-bold text-whatsapp-primary">₹{vData.amount?.toLocaleString('en-IN')}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="rounded-full hover:bg-whatsapp-primary/10 text-gray-400 hover:text-whatsapp-primary transition-colors"
                          onClick={() => handleGoToChat(v.chat)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50">
          <Button type="button" variant="outline" className="w-full" onClick={onClose}>
            {t.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
