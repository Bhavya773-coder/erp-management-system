import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Loader2, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { login, resetPassword, isLoading } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success) {
      toast({
        title: 'Welcome back!',
        description: 'Successfully signed in to Arcadian ERP.',
      });
      navigate('/');
    } else {
      toast({
        title: 'Authentication Failed',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Validation Error',
        description: 'Passwords do not match.',
        variant: 'destructive',
      });
      return;
    }

    const result = await resetPassword({ email, newPassword });
    if (result.success) {
      toast({
        title: 'Password Reset Successful',
        description: result.message || 'You can now login with your new password.',
      });
      setIsForgotPassword(false);
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      toast({
        title: 'Reset Failed',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 sm:p-6 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-whatsapp-primary/10 rounded-full blur-[100px] opacity-50" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-whatsapp-primary/5 rounded-full blur-[100px] opacity-50" />

      <Card className="w-full max-w-md shadow-2xl border-none rounded-[2.5rem] bg-white/80 backdrop-blur-xl relative z-10">
        <CardHeader className="text-center pt-10">
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 p-4 bg-white rounded-[2rem] shadow-xl shadow-whatsapp-primary/10">
              <img src="/logo.png" alt="Arcadian Logo" className="w-full h-full object-contain" />
            </div>
          </div>
          <CardTitle className="text-3xl font-black text-gray-900 tracking-tight">
            {isForgotPassword ? 'Reset Password' : 'Login'}
          </CardTitle>
          <CardDescription className="text-sm font-medium text-gray-500 uppercase tracking-widest mt-2">
            Arcadian Works ERP
          </CardDescription>
        </CardHeader>
        
        {isForgotPassword ? (
          <form onSubmit={handleResetPassword}>
            <CardContent className="space-y-4 px-8">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Email Address</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 rounded-xl bg-gray-50/50 border-transparent focus:bg-white focus:border-whatsapp-primary transition-all px-4 font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-newpass" className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">New Password</Label>
                <div className="relative">
                  <Input
                    id="reset-newpass"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="h-12 rounded-xl bg-gray-50/50 border-transparent focus:bg-white focus:border-whatsapp-primary transition-all px-4 pr-12 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-whatsapp-primary transition-colors"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-confirmpass" className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="reset-confirmpass"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-12 rounded-xl bg-gray-50/50 border-transparent focus:bg-white focus:border-whatsapp-primary transition-all px-4 pr-12 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-whatsapp-primary transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 p-8">
              <Button 
                type="submit" 
                className="w-full h-12 bg-whatsapp-primary hover:bg-whatsapp-dark text-white rounded-xl shadow-lg transition-all active:scale-[0.98] font-bold text-base"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    RESETTING PASSWORD...
                  </>
                ) : (
                  'SUBMIT PASSWORD RESET'
                )}
              </Button>
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="text-sm text-whatsapp-primary hover:underline font-bold"
              >
                Back to Login
              </button>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6 px-8">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-14 rounded-2xl bg-gray-50/50 border-transparent focus:bg-white focus:border-whatsapp-primary transition-all px-6 font-medium"
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <Label htmlFor="password" className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Password</Label>
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-[10px] font-bold text-whatsapp-primary hover:underline uppercase tracking-wider"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-14 rounded-2xl bg-gray-50/50 border-transparent focus:bg-white focus:border-whatsapp-primary transition-all px-6"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-whatsapp-primary transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-6 p-8">
              <Button 
                type="submit" 
                className="w-full h-14 bg-whatsapp-primary hover:bg-whatsapp-dark text-white rounded-2xl shadow-2xl shadow-whatsapp-primary/20 transition-all active:scale-[0.98] font-bold text-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    LOGGING IN...
                  </>
                ) : (
                  'LOGIN'
                )}
              </Button>
              <p className="text-sm text-gray-400 text-center font-medium">
                New here?{' '}
                <Link to="/signup" className="text-whatsapp-primary hover:underline font-bold">
                  Create Account
                </Link>
              </p>
            </CardFooter>
          </form>
        )}
      </Card>
      
      {/* Branding Footer */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-30">
        <p className="text-[10px] font-black text-gray-400 tracking-[0.4em] uppercase">Arcadian Secure Node v1.2</p>
      </div>
    </div>
  );
}
