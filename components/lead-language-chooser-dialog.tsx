"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { motion } from "framer-motion";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Shared “pick 中文 vs English” UI (blocking — no dismissal until a choice). */
export function LeadLanguageChooserDialog({ open, onOpenChange }: Props) {
  const { setLanguage } = useLanguage();

  const handleLanguageSelect = (selectedLanguage: "zh" | "en") => {
    setLanguage(selectedLanguage);
    localStorage.setItem("languagePreferenceSet", "true");
    localStorage.setItem("preferredLanguage", selectedLanguage);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[85vw] max-w-[360px] overflow-hidden rounded-2xl border-0 p-0 shadow-2xl focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="bg-gradient-to-br from-[#FFF6EF] to-white p-6">
          <DialogHeader className="mb-5 text-center">
            <DialogTitle className="text-base font-medium text-[#6B5F53]">
              Language Preference
            </DialogTitle>
            <p className="mt-0.5 text-sm text-[#6B5F53]/70">选择语言 · Choose language</p>
          </DialogHeader>

          <div className="space-y-2.5">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => handleLanguageSelect("zh")}
                className="no-focus-ring h-auto w-full rounded-lg border border-[#C2884E]/20 bg-white px-5 py-3.5 !outline-none shadow-sm !ring-0 !ring-offset-0 transition-all duration-300 hover:border-[#C2884E] hover:bg-[#F5EDE4] hover:shadow-md"
                variant="outline"
                type="button"
              >
                <div className="pointer-events-none flex w-full items-center justify-center">
                  <p className="text-base font-medium text-[#6B5F53]">中文</p>
                </div>
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => handleLanguageSelect("en")}
                className="no-focus-ring h-auto w-full rounded-lg border border-[#C2884E]/20 bg-white px-5 py-3.5 !outline-none shadow-sm !ring-0 !ring-offset-0 transition-all duration-300 hover:border-[#C2884E] hover:bg-[#F5EDE4] hover:shadow-md"
                variant="outline"
                type="button"
              >
                <div className="pointer-events-none flex w-full items-center justify-center gap-3">
                  <span className="text-2xl" aria-hidden>
                    🇨🇦
                  </span>
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
