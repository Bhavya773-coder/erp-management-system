import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Loader2, Eye, EyeOff } from 'lucide-react';

export default function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    aadhaarNumber: '',
    role: 'EMPLOYEE',
    education: '',
    skills: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  
  const { signup, isLoading } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const skillsArray = formData.skills.split(',').map(s => s.trim()).filter(Boolean);

      const userData = {
        ...formData,
        skills: skillsArray,
      };

      const result = await signup(userData);
      
      if (result.success) {
        toast({
          title: 'Account created!',
          description: 'Welcome to our platform.',
        });
        navigate('/');
      } else {
        toast({
          title: 'Signup failed',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Something went wrong',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 sm:p-6 relative overflow-hidden py-12 sm:py-20">
      {/* Background Orbs */}
      <div className="absolute top-0 -left-20 w-[500px] h-[500px] bg-whatsapp-primary/10 rounded-full blur-[120px] opacity-40" />
      <div className="absolute bottom-0 -right-20 w-[500px] h-[500px] bg-whatsapp-primary/5 rounded-full blur-[120px] opacity-40" />

      <Card className="w-full max-w-2xl shadow-2xl border-none rounded-[2.5rem] bg-white/80 backdrop-blur-xl relative z-10 overflow-hidden">
        <CardHeader className="text-center pt-10 pb-6">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 p-4 bg-white rounded-[1.75rem] shadow-xl shadow-whatsapp-primary/10">
              <img src="/logo.png" alt="Arcadian Logo" className="w-full h-full object-contain" />
            </div>
          </div>
          <CardTitle className="text-3xl font-black text-gray-900 tracking-tight">Create your Account</CardTitle>
          <CardDescription className="text-sm font-medium text-gray-500 uppercase tracking-[0.2em] mt-2 px-6">
            Join the Arcadian Works Digital Ecosystem
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 px-6 sm:px-10 max-h-[60vh] overflow-y-auto scrollbar-hide pb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2.5">
                <Label htmlFor="name" className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] px-2">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="h-12 rounded-xl bg-gray-50/50 border-transparent focus:bg-white focus:border-whatsapp-primary px-5 transition-all font-medium"
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="email" className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] px-2">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="h-12 rounded-xl bg-gray-50/50 border-transparent focus:bg-white focus:border-whatsapp-primary px-5 transition-all font-medium"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2.5">
                <Label htmlFor="password" className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] px-2">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 6 characters"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                    className="h-12 rounded-xl bg-gray-50/50 border-transparent focus:bg-white focus:border-whatsapp-primary px-5 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-whatsapp-primary transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="phone" className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] px-2">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="+91"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="h-12 rounded-xl bg-gray-50/50 border-transparent focus:bg-white focus:border-whatsapp-primary px-5 transition-all"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2.5">
                <Label htmlFor="aadhaarNumber" className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] px-2">Aadhaar Number</Label>
                <Input
                  id="aadhaarNumber"
                  name="aadhaarNumber"
                  placeholder="1234 5678 9012"
                  value={formData.aadhaarNumber}
                  onChange={handleChange}
                  required
                  className="h-12 rounded-xl bg-gray-50/50 border-transparent focus:bg-white focus:border-whatsapp-primary px-5 transition-all"
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="role" className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] px-2">Role / Position</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                  required
                >
                  <SelectTrigger className="h-12 rounded-xl bg-gray-50/50 border-transparent focus:bg-white focus:ring-0 focus:border-whatsapp-primary px-5">
                    <SelectValue placeholder="Position" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-gray-100">
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="education" className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] px-2">Education</Label>
              <Input
                id="education"
                name="education"
                placeholder="Degree, Certification, etc."
                value={formData.education}
                onChange={handleChange}
                required
                className="h-12 rounded-xl bg-gray-50/50 border-transparent focus:bg-white focus:border-whatsapp-primary px-5 transition-all font-medium"
              />
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="skills" className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] px-2">Skills / Expertise</Label>
              <Input
                id="skills"
                name="skills"
                placeholder="e.g. Navigation, Safety, Logistics"
                value={formData.skills}
                onChange={handleChange}
                required
                className="h-12 rounded-xl bg-gray-50/50 border-transparent focus:bg-white focus:border-whatsapp-primary px-5 transition-all font-medium"
              />
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-6 p-8 sm:p-10 border-t border-gray-50 bg-gray-50/30">
            <Button 
              type="submit" 
              className="w-full h-14 bg-whatsapp-primary hover:bg-whatsapp-dark text-white rounded-2xl shadow-2xl shadow-whatsapp-primary/20 transition-all active:scale-[0.98] font-bold text-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  CREATING ACCOUNT...
                </>
              ) : (
                'CREATE ACCOUNT'
              )}
            </Button>
            <p className="text-sm text-gray-400 text-center font-medium">
              Already have an account?{' '}
              <Link to="/login" className="text-whatsapp-primary hover:underline font-bold">
                Login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-30">
        <p className="text-[10px] font-black text-gray-400 tracking-[0.4em] uppercase">Arcadian Secure Node v1.2</p>
      </div>
    </div>
  );
}
