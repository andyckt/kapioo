"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'zh' | 'en';

// Define translation keys type to avoid indexing errors
type TranslationKey = 
  | 'login' | 'getStarted' 
  | 'heroTitle' | 'heroDescription' | 'getStartedBtn' | 'howItWorksBtn'
  | 'howItWorksTitle' | 'howItWorksDescription'
  | 'step1Title' | 'step1Description'
  | 'step2Title' | 'step2Description'
  | 'step3Title' | 'step3Description'
  | 'copyright' | 'language' | 'chinese' | 'english'
  // Login page translations
  | 'backToHome' | 'userIdOrEmail' | 'userIdOrEmailPlaceholder'
  | 'password' | 'passwordPlaceholder' | 'forgotPassword'
  | 'signIn' | 'signingIn' | 'noAccount' | 'signUp'
  | 'loginSuccess' | 'welcomeBack' | 'loginFailed' | 'invalidCredentials' | 'loginError'
  // Signup page translations
  | 'createAccount' | 'enterDetails' | 'fullName' | 'phoneNumber' | 'enterPhoneNumber'
  | 'confirmPassword' | 'continueBtn' | 'alreadyHaveAccount'
  // Address page translations
  | 'deliveryAddress' | 'whereDeliver' | 'unitNumber' | 'streetAddress' | 'city'
  | 'postalCode' | 'province' | 'country' | 'buzzCode' | 'completeRegistration'
  // Forgot password translations
  | 'resetPassword' | 'enterPhoneReset' | 'createNewPassword' | 'verifyPhoneNumber'
  | 'newPassword' | 'confirmNewPassword' | 'resetPasswordBtn' | 'rememberPassword';

// Define translations type
type TranslationsType = {
  [key in Language]: {
    [key in TranslationKey]: string;
  }
};

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
};

// Create context with default values
const LanguageContext = createContext<LanguageContextType>({
  language: 'zh',
  setLanguage: () => {},
  t: () => '',
});

// Translations for the homepage
const translations: TranslationsType = {
  zh: {
    // Header
    login: "登录",
    getStarted: "立即开始",
    // Hero section
    heroTitle: "每周美味送餐上门",
    heroDescription: "订购Kapioo，享受厨师准备的美食直接送到您家门口。选择您一周的餐点并使用您的积分支付。",
    getStartedBtn: "立即开始",
    howItWorksBtn: "如何运作",
    // How it works section
    howItWorksTitle: "如何运作",
    howItWorksDescription: "我们的订购服务简单又方便。以下是如何开始的方法。",
    step1Title: "注册",
    step1Description: "创建账户并购买积分用于每周餐点。",
    step2Title: "选择餐点",
    step2Description: "浏览我们的每周菜单并选择您想要配送的日期。",
    step3Title: "享用美食",
    step3Description: "在您选择的日期接收餐点，享受美味的厨师准备的食物。",
    // Footer
    copyright: "© 2025 Kapioo。保留所有权利。",
    language: "语言",
    chinese: "中文",
    english: "English",
    
    // Login page
    backToHome: "返回首页",
    userIdOrEmail: "用户ID或电子邮箱",
    userIdOrEmailPlaceholder: "输入您的ID或电子邮箱",
    password: "密码",
    passwordPlaceholder: "••••••",
    forgotPassword: "忘记密码？",
    signIn: "登录",
    signingIn: "登录中...",
    noAccount: "还没有账户？",
    signUp: "注册",
    loginSuccess: "登录成功",
    welcomeBack: "欢迎回来，",
    loginFailed: "登录失败",
    invalidCredentials: "无效的凭证",
    loginError: "登录过程中发生错误",
    
    // Signup page
    createAccount: "创建账户",
    enterDetails: "输入您的详细信息以开始",
    fullName: "全名",
    phoneNumber: "电话号码",
    enterPhoneNumber: "输入您的电话号码",
    confirmPassword: "确认密码",
    continueBtn: "继续",
    alreadyHaveAccount: "已经有账户？",
    
    // Address page
    deliveryAddress: "送货地址",
    whereDeliver: "我们应该把餐点送到哪里？",
    unitNumber: "单元号码",
    streetAddress: "街道地址",
    city: "城市",
    postalCode: "邮政编码",
    province: "省份/州",
    country: "国家",
    buzzCode: "门禁密码（如需要）",
    completeRegistration: "完成注册",
    
    // Forgot password
    resetPassword: "重置密码",
    enterPhoneReset: "输入您的电话号码以重置密码",
    createNewPassword: "为您的账户创建新密码",
    verifyPhoneNumber: "验证电话号码",
    newPassword: "新密码",
    confirmNewPassword: "确认新密码",
    resetPasswordBtn: "重置密码",
    rememberPassword: "记住您的密码？",
  },
  en: {
    // Header
    login: "Login",
    getStarted: "Get Started",
    // Hero section
    heroTitle: "Delicious Meals Delivered Weekly",
    heroDescription: "Subscribe to Kapioo and enjoy chef-prepared meals delivered to your doorstep. Choose your meals for the week and pay with your credits.",
    getStartedBtn: "Get Started",
    howItWorksBtn: "How It Works",
    // How it works section
    howItWorksTitle: "How It Works",
    howItWorksDescription: "Our subscription service is simple and convenient. Here's how to get started.",
    step1Title: "Sign Up",
    step1Description: "Create an account and purchase credits to use for your weekly meals.",
    step2Title: "Select Meals",
    step2Description: "Browse our weekly menu and select the days you want meals delivered.",
    step3Title: "Enjoy",
    step3Description: "Receive your meals on your selected days and enjoy delicious, chef-prepared food.",
    // Footer
    copyright: "© 2025 Kapioo. All rights reserved.",
    language: "Language",
    chinese: "中文",
    english: "English",
    
    // Login page
    backToHome: "Back to Home",
    userIdOrEmail: "User ID or Email",
    userIdOrEmailPlaceholder: "Enter your ID or email",
    password: "Password",
    passwordPlaceholder: "••••••",
    forgotPassword: "Forgot password?",
    signIn: "Sign In",
    signingIn: "Signing in...",
    noAccount: "Don't have an account?",
    signUp: "Sign up",
    loginSuccess: "Login successful",
    welcomeBack: "Welcome back, ",
    loginFailed: "Login failed",
    invalidCredentials: "Invalid credentials",
    loginError: "An error occurred during login",
    
    // Signup page
    createAccount: "Create your account",
    enterDetails: "Enter your details to get started",
    fullName: "Full Name",
    phoneNumber: "Phone Number",
    enterPhoneNumber: "Enter your phone number",
    confirmPassword: "Confirm Password",
    continueBtn: "Continue",
    alreadyHaveAccount: "Already have an account?",
    
    // Address page
    deliveryAddress: "Delivery Address",
    whereDeliver: "Where should we deliver your meals?",
    unitNumber: "Unit Number",
    streetAddress: "Street Address",
    city: "City",
    postalCode: "Postal/ZIP Code",
    province: "Province/State",
    country: "Country",
    buzzCode: "Entry/Buzz Code (If Required)",
    completeRegistration: "Complete Registration",
    
    // Forgot password
    resetPassword: "Reset Password",
    enterPhoneReset: "Enter your phone number to reset your password",
    createNewPassword: "Create a new password for your account",
    verifyPhoneNumber: "Verify Phone Number",
    newPassword: "New Password",
    confirmNewPassword: "Confirm New Password",
    resetPasswordBtn: "Reset Password",
    rememberPassword: "Remember your password?",
  }
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  // Default to Chinese, no localStorage check
  const [language, setLanguage] = useState<Language>('zh');
  
  // Translation function
  const t = (key: TranslationKey): string => {
    return translations[language][key];
  };
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use the language context
export const useLanguage = () => useContext(LanguageContext); 