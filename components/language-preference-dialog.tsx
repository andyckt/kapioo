"use client"

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/language-context';
import { motion } from 'framer-motion';

export function LanguagePreferenceDialog() {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Check if user has already set language preference
    const hasSetLanguage = localStorage.getItem('languagePreferenceSet');
    
    if (!hasSetLanguage) {
      // Show dialog after a short delay for better UX
      setTimeout(() => {
        setOpen(true);
      }, 300);
    }
  }, []);

  const handleLanguageSelect = (selectedLanguage: 'zh' | 'en') => {
    setLanguage(selectedLanguage);
    localStorage.setItem('languagePreferenceSet', 'true');
    localStorage.setItem('preferredLanguage', selectedLanguage);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent 
        className="sm:max-w-[360px] w-[85vw] p-0 rounded-2xl overflow-hidden border-0 shadow-2xl [&>button]:hidden focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="bg-gradient-to-br from-[#FFF6EF] to-white p-6">
          {/* Header */}
          <div className="text-center mb-5">
            <h3 className="text-base font-medium text-[#6B5F53]">
              Language Preference
            </h3>
            <p className="text-sm text-[#6B5F53]/70 mt-0.5">
              选择语言
            </p>
          </div>

          <div className="space-y-2.5">
            {/* Chinese Option */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={() => handleLanguageSelect('zh')}
                className="w-full h-auto py-3.5 px-5 bg-white hover:bg-[#F5EDE4] border border-[#C2884E]/20 hover:border-[#C2884E] text-[#6B5F53] rounded-lg transition-all duration-300 shadow-sm hover:shadow-md focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 active:outline-none"
                variant="outline"
              >
                <div className="flex items-center gap-3 w-full pointer-events-none">
                  <span className="text-2xl">🇨🇳</span>
                  <p className="text-base font-medium text-[#6B5F53]">中文</p>
                </div>
              </Button>
            </motion.div>

            {/* English Option */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={() => handleLanguageSelect('en')}
                className="w-full h-auto py-3.5 px-5 bg-white hover:bg-[#F5EDE4] border border-[#C2884E]/20 hover:border-[#C2884E] text-[#6B5F53] rounded-lg transition-all duration-300 shadow-sm hover:shadow-md focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 active:outline-none"
                variant="outline"
              >
                <div className="flex items-center gap-3 w-full pointer-events-none">
                  <span className="text-2xl">🇨🇦</span>
                  <p className="text-base font-medium text-[#6B5F53]">English</p>
                </div>
              </Button>
            </motion.div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

