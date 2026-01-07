"use client"

import React, { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/lib/language-context';

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  useEffect(() => {
    // Check if user is logged in
    if (typeof window !== 'undefined') {
      const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
      setIsLoggedIn(isAuthenticated);
    }
  }, []);
  
  // Hide language switcher when user is logged in
  if (isLoggedIn) {
    return null;
  }
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="px-2">
          <Globe className="h-5 w-5" />
          <span className="sr-only">{t('language')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => setLanguage('zh')}
          className={language === 'zh' ? 'bg-accent font-medium' : ''}
        >
          🇨🇳 {t('chinese')}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setLanguage('en')}
          className={language === 'en' ? 'bg-accent font-medium' : ''}
        >
          🇨🇦 {t('english')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 