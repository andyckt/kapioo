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
  | 'newPassword' | 'confirmNewPassword' | 'resetPasswordBtn' | 'rememberPassword'
  // Dashboard translations
  | 'overview' | 'myOrders' | 'selectMeals' | 'deliveryTracking' | 'credits' | 'settings'
  | 'profile' | 'referFriend' | 'logOut' | 'upcomingDeliveries' | 'creditsAvailable'
  | 'totalOrders' | 'personalInfo' | 'addressInfo' | 'security' | 'save' | 'saving'
  | 'changesSaved' | 'errorSaving' | 'currentPassword' | 'newPasswordDash' | 'updatePassword'
  | 'specialInstructions' | 'checkout' | 'processingOrder' | 'orderSuccess' | 'orderError'
  | 'orderDate' | 'orderTotal' | 'orderStatus' | 'viewOrderDetails' | 'transactionHistory'
  | 'transactionDate' | 'transactionType' | 'transactionAmount' | 'transactionDesc' | 'previous' | 'next'
  | 'noTransactionHistory' | 'pageOf'
  // Settings tab translations
  | 'accountSettings' | 'personalInfoTab' | 'passwordTab' | 'personalInformation' | 'updateAccountDetails'
  | 'accountStatus' | 'userId' | 'name' | 'nickname' | 'email' | 'phone' | 'saveChanges'
  | 'deliveryAddressTitle' | 'updateDeliveryInfo' | 'unitAptNumber' | 'state' | 'zipCode'
  | 'buzzCodeLabel' | 'buzzCodeOptional' | 'buzzCodePlaceholder' | 'changePassword'
  | 'currentPasswordLabel' | 'newPasswordLabel' | 'confirmPasswordLabel' | 'changePasswordBtn'
  // Toast notifications
  | 'personalInfoSaved' | 'personalInfoError' | 'addressSaved' | 'addressError'
  | 'passwordChanged' | 'passwordError' | 'passwordMismatch' | 'loggingOut' | 'loggedOut'
  | 'passwordRequired' | 'newPasswordRequired' | 'confirmPasswordRequired' | 'errorOccurred'
  // Credits tab
  | 'currentAvailableCredits' | 'creditsUsageHistory'
  // Orders tab
  | 'orderHistory' | 'viewOrdersAndStatus' | 'loadingOrders' | 'orderTitle' | 'orderPlacedOn'
  | 'selectedMeals' | 'creditsUsed' | 'viewDetails' | 'orderStatusTitle' | 'orderPlaced'
  | 'orderConfirmed' | 'outForDelivery' | 'delivered' | 'pendingStatus' | 'confirmedStatus'
  | 'deliveryStatus' | 'deliveredStatus' | 'cancelledStatus' | 'refundedStatus'
  | 'orderCancelled' | 'creditsReturned' | 'refundedOn' | 'orderRefunded'
  | 'noOrdersYet' | 'orderHistoryAppearHere' | 'pageXofY'
  // Select Meals tab
  | 'weeklyMenu' | 'selectDaysDelivery' | 'loadingMeals' | 'selectedCount' | 'proceedToCheckout'
  | 'checkoutTitle' | 'confirmOrderDetails' | 'deliveryInfo' | 'editAddress' | 'addAddress'
  | 'editDeliveryDetails' | 'saveAddressFuture' | 'cancelBtn' | 'saveAddress' | 'noAddressSet'
  | 'back' | 'completeOrder' | 'freshIngredients' | 'ecoPackaging' | 'total'
  | 'dayPassed' | 'orderBeforeCutoff' | 'orderPlacedSuccess' | 'errorPlacingOrder'
  | 'unexpectedError' | 'noMealsSelected' | 'insufficientCredits' | 'addressUpdated'
  | 'addressForThisOrder';

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
    
    // Dashboard translations
    overview: "概览",
    myOrders: "我的订单",
    selectMeals: "选择餐点",
    deliveryTracking: "配送追踪",
    credits: "餐券",
    settings: "设置",
    profile: "个人资料",
    referFriend: "邀请朋友",
    logOut: "退出登录",
    upcomingDeliveries: "即将到来的配送",
    creditsAvailable: "可用餐券",
    totalOrders: "总订单数",
    personalInfo: "个人信息",
    addressInfo: "地址信息",
    security: "安全",
    save: "保存",
    saving: "保存中...",
    changesSaved: "更改已保存",
    errorSaving: "保存时出错",
    currentPassword: "当前密码",
    newPasswordDash: "新密码",
    updatePassword: "更新密码",
    specialInstructions: "特殊说明",
    checkout: "结账",
    processingOrder: "处理订单中...",
    orderSuccess: "订单成功",
    orderError: "订单出错",
    orderDate: "订单日期",
    orderTotal: "订单总额",
    orderStatus: "订单状态",
    viewOrderDetails: "查看订单详情",
    transactionHistory: "交易历史",
    transactionDate: "交易日期",
    transactionType: "交易类型",
    transactionAmount: "数量",
    transactionDesc: "说明",
    previous: "上一页",
    next: "下一页",
    noTransactionHistory: "没有交易历史",
    pageOf: "第 X 页，共 Y 页",
    
    // Settings tab translations
    accountSettings: "账户设置",
    personalInfoTab: "个人信息",
    passwordTab: "密码",
    personalInformation: "个人信息",
    updateAccountDetails: "更新您的账户详情",
    accountStatus: "账户状态",
    userId: "用户ID",
    name: "姓名",
    nickname: "昵称",
    email: "电子邮箱",
    phone: "电话",
    saveChanges: "保存更改",
    deliveryAddressTitle: "送货地址",
    updateDeliveryInfo: "更新您的送货信息",
    unitAptNumber: "单元/公寓号码",
    state: "州/省",
    zipCode: "邮政编码",
    buzzCodeLabel: "门禁密码",
    buzzCodeOptional: "（可选）",
    buzzCodePlaceholder: "仅在需要进入建筑时填写",
    changePassword: "修改密码",
    currentPasswordLabel: "当前密码",
    newPasswordLabel: "新密码",
    confirmPasswordLabel: "确认密码",
    changePasswordBtn: "更改密码",
    // Toast notifications
    personalInfoSaved: "个人信息已保存",
    personalInfoError: "保存个人信息时出错",
    addressSaved: "地址信息已保存",
    addressError: "保存地址信息时出错",
    passwordChanged: "密码已更改",
    passwordError: "更改密码时出错",
    passwordMismatch: "两次输入的密码不一致",
    loggingOut: "正在退出登录",
    loggedOut: "已退出登录",
    passwordRequired: "密码是必需的",
    newPasswordRequired: "新密码是必需的",
    confirmPasswordRequired: "确认密码是必需的",
    errorOccurred: "发生错误",
    // Credits tab
    currentAvailableCredits: "您当前可用的餐券",
    creditsUsageHistory: "您的餐券购买和使用历史",
    // Orders tab
    orderHistory: "订单历史",
    viewOrdersAndStatus: "查看您的餐点订单和配送状态",
    loadingOrders: "正在加载您的订单...",
    orderTitle: "订单",
    orderPlacedOn: "下单时间",
    selectedMeals: "已选餐点",
    creditsUsed: "已使用餐券",
    viewDetails: "查看详情",
    orderStatusTitle: "订单状态",
    orderPlaced: "订单已下",
    orderConfirmed: "订单已确认",
    outForDelivery: "正在配送",
    delivered: "已送达",
    pendingStatus: "待处理",
    confirmedStatus: "已确认",
    deliveryStatus: "配送中",
    deliveredStatus: "已送达",
    cancelledStatus: "已取消",
    refundedStatus: "已退款",
    orderCancelled: "此订单已取消。",
    creditsReturned: "餐券已返还至您的账户。",
    refundedOn: "退款时间",
    orderRefunded: "此订单已退款，餐券已返还至您的账户。",
    noOrdersYet: "暂无订单",
    orderHistoryAppearHere: "下单后，您的订单历史将显示在这里。",
    pageXofY: "第 X 页，共 Y 页",
    // Select Meals tab
    weeklyMenu: "Kapioo的每周菜单",
    selectDaysDelivery: "选择您想要配送餐点的日期",
    loadingMeals: "正在加载餐点信息...",
    selectedCount: "已选择",
    proceedToCheckout: "前往结账",
    checkoutTitle: "结账",
    confirmOrderDetails: "确认您的订单详情",
    deliveryInfo: "配送信息",
    editAddress: "编辑地址",
    addAddress: "添加地址",
    editDeliveryDetails: "编辑配送详情",
    saveAddressFuture: "为未来订单保存此地址",
    cancelBtn: "取消",
    saveAddress: "保存地址",
    noAddressSet: "尚未设置配送地址",
    back: "返回",
    completeOrder: "完成订单",
    freshIngredients: "新鲜食材",
    ecoPackaging: "环保包装",
    total: "总计",
    dayPassed: "此日期已过",
    orderBeforeCutoff: "今日订单必须在多伦多时间上午10点前下单",
    orderPlacedSuccess: "订单已成功提交！",
    errorPlacingOrder: "下单时出错",
    unexpectedError: "提交订单时发生意外错误",
    noMealsSelected: "未选择餐点",
    insufficientCredits: "积分不足",
    addressUpdated: "地址已更新",
    addressForThisOrder: "地址仅用于此订单",
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
    
    // Dashboard translations
    overview: "Overview",
    myOrders: "My Orders",
    selectMeals: "Select Meals",
    deliveryTracking: "Delivery Tracking",
    credits: "Credits",
    settings: "Settings",
    profile: "Profile",
    referFriend: "Refer a Friend",
    logOut: "Log out",
    upcomingDeliveries: "Upcoming Deliveries",
    creditsAvailable: "Credits Available",
    totalOrders: "Total Orders",
    personalInfo: "Personal Information",
    addressInfo: "Address Information",
    security: "Security",
    save: "Save",
    saving: "Saving...",
    changesSaved: "Changes saved",
    errorSaving: "Error saving changes",
    currentPassword: "Current Password",
    newPasswordDash: "New Password",
    updatePassword: "Update Password",
    specialInstructions: "Special Instructions",
    checkout: "Checkout",
    processingOrder: "Processing order...",
    orderSuccess: "Order successful",
    orderError: "Order error",
    orderDate: "Order Date",
    orderTotal: "Order Total",
    orderStatus: "Status",
    viewOrderDetails: "View Details",
    transactionHistory: "Transaction History",
    transactionDate: "Date",
    transactionType: "Type",
    transactionAmount: "Amount",
    transactionDesc: "Description",
    previous: "Previous",
    next: "Next",
    noTransactionHistory: "No transaction history found",
    pageOf: "Page X of Y",
    
    // Settings tab translations
    accountSettings: "Account Settings",
    personalInfoTab: "Personal Info",
    passwordTab: "Password",
    personalInformation: "Personal Information",
    updateAccountDetails: "Update your account details",
    accountStatus: "Account Status",
    userId: "User ID",
    name: "Name",
    nickname: "Nickname",
    email: "Email",
    phone: "Phone",
    saveChanges: "Save Changes",
    deliveryAddressTitle: "Delivery Address",
    updateDeliveryInfo: "Update your delivery information",
    unitAptNumber: "Unit/Apt Number",
    state: "State",
    zipCode: "ZIP Code",
    buzzCodeLabel: "Buzz Code / Entry Code",
    buzzCodeOptional: "(Optional)",
    buzzCodePlaceholder: "Only if required for building access",
    changePassword: "Change your password",
    currentPasswordLabel: "Current Password",
    newPasswordLabel: "New Password",
    confirmPasswordLabel: "Confirm Password",
    changePasswordBtn: "Change Password",
    // Toast notifications
    personalInfoSaved: "Personal information saved",
    personalInfoError: "Error saving personal information",
    addressSaved: "Address saved",
    addressError: "Error saving address",
    passwordChanged: "Password changed",
    passwordError: "Error changing password",
    passwordMismatch: "Passwords do not match",
    loggingOut: "Logging out",
    loggedOut: "Logged out",
    passwordRequired: "Password is required",
    newPasswordRequired: "New password is required",
    confirmPasswordRequired: "Confirm password is required",
    errorOccurred: "An error occurred",
    // Credits tab
    currentAvailableCredits: "Your current available credits",
    creditsUsageHistory: "Your credits purchase and usage history",
    // Orders tab
    orderHistory: "Order History",
    viewOrdersAndStatus: "View your meal orders and delivery status",
    loadingOrders: "Loading your orders...",
    orderTitle: "Order",
    orderPlacedOn: "Placed on",
    selectedMeals: "Selected Meals",
    creditsUsed: "Credits Used",
    viewDetails: "View Details",
    orderStatusTitle: "Order Status",
    orderPlaced: "Order Placed",
    orderConfirmed: "Order Confirmed",
    outForDelivery: "Out for Delivery",
    delivered: "Delivered",
    pendingStatus: "Pending",
    confirmedStatus: "Confirmed",
    deliveryStatus: "Out for Delivery",
    deliveredStatus: "Delivered",
    cancelledStatus: "Cancelled",
    refundedStatus: "Refunded",
    orderCancelled: "This order has been cancelled.",
    creditsReturned: "credits have been returned to your account.",
    refundedOn: "Refunded on",
    orderRefunded: "This order has been refunded and credits have been returned to your account.",
    noOrdersYet: "No orders yet",
    orderHistoryAppearHere: "Your order history will appear here once you place your first order.",
    pageXofY: "Page X of Y",
    // Select Meals tab
    weeklyMenu: "Kapioo's Weekly Menu",
    selectDaysDelivery: "Select the days you want meals delivered",
    loadingMeals: "Loading meal information...",
    selectedCount: "Selected",
    proceedToCheckout: "Proceed to Checkout",
    checkoutTitle: "Checkout",
    confirmOrderDetails: "Confirm your order details",
    deliveryInfo: "Delivery Information",
    editAddress: "Edit Address",
    addAddress: "Add Address",
    editDeliveryDetails: "Edit Delivery Details",
    saveAddressFuture: "Save this address for future orders",
    cancelBtn: "Cancel",
    saveAddress: "Save Address",
    noAddressSet: "No delivery address set",
    back: "Back",
    completeOrder: "Complete Order",
    freshIngredients: "Fresh ingredients",
    ecoPackaging: "Eco-friendly packaging",
    total: "Total",
    dayPassed: "This day has already passed",
    orderBeforeCutoff: "Orders for today must be placed before 10am Toronto time",
    orderPlacedSuccess: "Order placed successfully!",
    errorPlacingOrder: "Error placing order",
    unexpectedError: "An unexpected error occurred while placing your order",
    noMealsSelected: "No meals selected",
    insufficientCredits: "Insufficient credits",
    addressUpdated: "Address updated",
    addressForThisOrder: "Address will be used only for this order",
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