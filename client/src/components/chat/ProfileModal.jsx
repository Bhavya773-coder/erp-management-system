import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
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
import { Loader2, Camera, User, Phone, GraduationCap, Briefcase, Upload } from 'lucide-react';
import { fileAPI } from '@/lib/api';

export default function ProfileModal({ isOpen, onClose }) {
  const { user, updateProfile, isLoading, language } = useAuthStore();
  const t = translations[language];
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  
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
    }
  }, [user, isOpen]);

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t.myProfile}</DialogTitle>
          <DialogDescription>
            {t.updateProfessionalDetails}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
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

          <div className="space-y-2">
            <Label htmlFor="avatarUrl" className="flex items-center text-xs font-bold text-gray-500 uppercase">
              {t.profileImage}
            </Label>
            <div className="flex space-x-2">
              <Input
                id="avatarUrl"
                name="avatarUrl"
                placeholder="https://example.com/avatar.jpg"
                value={formData.avatarUrl}
                onChange={handleChange}
                className="flex-1"
              />
              <Button 
                type="button" 
                variant="outline" 
                size="icon"
                onClick={() => document.getElementById('avatar-upload').click()}
                disabled={isUploading}
                className="shrink-0 hover:bg-whatsapp-primary hover:text-white transition-colors"
                title={t.uploadImage}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-gray-400">{t.pasteUrlOrUpload}</p>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {t.cancel}
            </Button>
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
