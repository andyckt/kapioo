"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowLeft, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/language-context"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

export default function LoginPage() {
  const [login, setLogin] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useLanguage()

  useEffect(() => {
    // Check if user is already authenticated
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const userDataStr = localStorage.getItem('user');
    
    if (isAuthenticated && userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        if (userData.userID === 'admin') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        // Clear potentially corrupted data
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('user');
      }
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Call the login API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ login, password }),
      });

      const result = await response.json();

      if (result.success) {
        // Store user data in localStorage or a state management solution
        localStorage.setItem('user', JSON.stringify(result.data.user));
        
        // Set authentication state
        localStorage.setItem('isAuthenticated', 'true');
        
        // Show success toast
        toast({
          title: t('loginSuccess'),
          description: t('welcomeBack') + result.data.user.name + '!',
        });
        
        // Redirect based on user ID (admin or regular user)
        if (result.data.user.userID === 'admin') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      } else {
        // Show general error toast
        toast({
          title: t('loginFailed'),
          description: result.error || t('invalidCredentials'),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: t('loginFailed'),
        description: t('loginError'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#fff6ef]/50">
      <header className="w-full py-4 px-4 flex justify-between items-center">
        <div className="container flex justify-between items-center">
          <Link 
            href="/" 
            className="inline-flex items-center text-sm font-medium transition-colors hover:text-primary group"
          >
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            {t('backToHome')}
          </Link>
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
        </div>
      </header>
      
      <div className="container flex flex-1 items-center justify-center py-10 md:py-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto flex w-full flex-col justify-center space-y-7 sm:w-[420px]"
        >
          <div className="flex flex-col items-center space-y-5 text-center">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <Image 
                src="/未命名設計.png" 
                alt="Kapioo Logo" 
                width={52} 
                height={52} 
                className="h-13 w-13 transition-transform duration-300 group-hover:rotate-6" 
              />
              <span className="inline-block font-bold text-[#C2884E] text-3xl transition-all duration-300 group-hover:tracking-wider">Kapioo</span>
            </Link>
          </div>
          
          <div className="grid gap-7">
            <form onSubmit={handleLogin} className="p-7 sm:p-8 bg-white shadow-lg rounded-xl">
              <div className="grid gap-5">
                <div className="grid gap-2.5">
                  <Label htmlFor="login" className="text-sm font-medium">{t('userIdOrEmail')}</Label>
                  <Input
                    id="login"
                    placeholder={t('userIdOrEmailPlaceholder')}
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    className="h-11 text-base placeholder:text-sm"
                    required
                  />
                </div>
                <div className="grid gap-2.5">
                  <Label htmlFor="password" className="text-sm font-medium">{t('password')}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t('passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 pr-10 text-base placeholder:text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Link href="/forgot-password" className="text-sm font-medium hover:underline text-muted-foreground">
                    {t('forgotPassword')}
                  </Link>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-11 mt-2 bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:scale-[1.02] transition-transform text-base" 
                  disabled={isLoading}
                >
                  {isLoading ? t('signingIn') : t('signIn')}
                </Button>
              </div>
            </form>
            
            <div className="text-center space-y-3">
              <div className="text-base">
                <span className="text-muted-foreground">{t('noAccount')} </span>
                <Link href="/signup" className="font-medium hover:underline text-primary">
                  {t('signUp')}
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

