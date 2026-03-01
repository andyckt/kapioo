"use client"

import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/language-context';
import { motion } from 'framer-motion';

export function LanguagePreferenceDialog() {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const hasLoggedInitRef = useRef(false);

  useEffect(() => {
    if (!hasLoggedInitRef.current) {
      hasLoggedInitRef.current = true;
      // #region agent log
      fetch('http://127.0.0.1:7408/ingest/6854f240-86f3-4121-a956-6e67bba27392',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2075ac'},body:JSON.stringify({sessionId:'2075ac',runId:'baseline',hypothesisId:'H2',location:'components/language-preference-dialog.tsx:useEffect:init',message:'LanguagePreferenceDialog mounted with dependency type checks',data:{dialogType:typeof Dialog,dialogContentType:typeof DialogContent,motionDivType:typeof motion?.div,buttonType:typeof Button,initialLanguage:language},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    }

    // If logged in, use profile language and do not show popup
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user?.languagePreference === 'zh' || user?.languagePreference === 'en') {
          setLanguage(user.languagePreference);
          localStorage.setItem('languagePreferenceSet', 'true');
          localStorage.setItem('preferredLanguage', user.languagePreference);
          return;
        }
      }
    } catch {
      // ignore parse errors
    }

    // Not logged in: show popup if user hasn't set language preference yet
    const hasSetLanguage = localStorage.getItem('languagePreferenceSet');
    if (!hasSetLanguage) {
      setTimeout(() => {
        setOpen(true);
      }, 300);
    }
  }, [setLanguage]);

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
                className="no-focus-ring w-full h-auto py-3.5 px-5 bg-white hover:bg-[#F5EDE4] border border-[#C2884E]/20 hover:border-[#C2884E] text-[#6B5F53] rounded-lg transition-all duration-300 shadow-sm hover:shadow-md !outline-none !ring-0 !ring-offset-0"
                variant="outline"
                type="button"
                onFocus={(e) => e.currentTarget.blur()}
              >
                <div className="flex items-center justify-center w-full pointer-events-none">
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
                className="no-focus-ring w-full h-auto py-3.5 px-5 bg-white hover:bg-[#F5EDE4] border border-[#C2884E]/20 hover:border-[#C2884E] text-[#6B5F53] rounded-lg transition-all duration-300 shadow-sm hover:shadow-md !outline-none !ring-0 !ring-offset-0"
                variant="outline"
                type="button"
                onFocus={(e) => e.currentTarget.blur()}
              >
                <div className="flex items-center justify-center gap-3 w-full pointer-events-none">
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

