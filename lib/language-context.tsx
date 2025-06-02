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
  // Homepage additional translations
  | 'healthyTags' | 'mainSlogan' | 'subSlogan' | 'tagline' | 'mottoFirstLine' | 'mottoSecondLine'
  | 'foodGalleryTag' | 'foodGalleryTitle' | 'foodGallerySubtitle'
  | 'chineseCuisineTitle' | 'chineseCuisineDesc'
  | 'westernCuisineTitle' | 'westernCuisineDesc'
  | 'japaneseKoreanCuisineTitle' | 'japaneseKoreanCuisineDesc'
  | 'southeastAsianCuisineTitle' | 'southeastAsianCuisineDesc'
  | 'weeklyMenuTag' | 'weeklyMenuTitle' | 'weeklyMenuWeekDates'
  | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'
  | 'totalCalories'
  | 'meal_1_1' | 'meal_1_1_desc' | 'meal_1_2' | 'meal_1_3' | 'meal_1_3_desc' | 'meal_1_4'
  | 'meal_2_1' | 'meal_2_1_desc' | 'meal_2_2' | 'meal_2_3' | 'meal_2_4'
  | 'meal_3_1' | 'meal_3_2' | 'meal_3_3' | 'meal_3_4'
  | 'meal_4_1' | 'meal_4_2' | 'meal_4_3' | 'meal_4_4'
  | 'meal_5_1' | 'meal_5_1_desc' | 'meal_5_2' | 'meal_5_3' | 'meal_5_4'
  | 'tag_1_1' | 'tag_1_2' | 'tag_2_1' | 'tag_2_2' | 'tag_3_1' | 'tag_3_2' | 'tag_4_1' | 'tag_4_2' | 'tag_5_1' | 'tag_5_2'
  | 'customerReviewsTag' | 'customerReviewsTitle' | 'customerReviewsSubtitle'
  | 'realFeedbackTag' | 'realFeedbackDesc1' | 'realFeedbackDesc2' | 'realFeedbackDesc3' | 'realFeedbackQuote'
  | 'satisfiedReviews' | 'averageRating' | 'repurchaseRate'
  | 'howItWorksTag' | 'howItWorksMainTitle' | 'howItWorksSubtitle'
  | 'step1Number' | 'step1MainTitle' | 'step1Subtitle' | 'step1Desc' | 'step1SubDesc'
  | 'step2Number' | 'step2MainTitle' | 'step2Subtitle' | 'step2Desc' | 'step2SubDesc'
  | 'step3Number' | 'step3MainTitle' | 'step3Subtitle' | 'step3Desc' | 'step3SubDesc'
  | 'startSubscriptionBtn' | 'startSubscriptionBtnSub'
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
    heroTitle: "北美健康餐食订阅品牌 <br/><span style=\"white-space: nowrap;\">让你每天拥有「被好好对待」的时刻</span>",
    heroDescription: "每日现做 每日配送<br/>健康｜高质｜舒服｜幸福<br/><br/>一顿饭的时间 给生活松一口气<br/>Kapioo，你每天的松弛美好时刻",
    getStartedBtn: "立即开始",
    howItWorksBtn: "如何运作",
    // Homepage additional translations
    healthyTags: "健康|高质|舒服|幸福",
    mainSlogan: "北美健康餐食订阅品牌",
    subSlogan: "让你每天拥有「被好好对待」的时刻",
    tagline: "每日现做 每日配送",
    mottoFirstLine: "一顿饭的时间 给生活松一口气",
    mottoSecondLine: "Kapioo，你每天的松弛美好时刻",
    // Food Gallery Section
    foodGalleryTag: "精选菜系",
    foodGalleryTitle: "多元融合 丰富美味 轻盈健康",
    foodGallerySubtitle: "Diverse Fusion, Rich Flavors, Light & Healthy",
    chineseCuisineTitle: "中式菜系",
    chineseCuisineDesc: "优质食材 · 控油控盐 · 健康烹饪方式 · 轻盈美味",
    westernCuisineTitle: "西式餐点",
    westernCuisineDesc: "融合风格 · 中西结合 · 创意改良",
    japaneseKoreanCuisineTitle: "日韩料理",
    japaneseKoreanCuisineDesc: "原汁原味 · local食材 · 经典味道",
    southeastAsianCuisineTitle: "东南亚风味",
    southeastAsianCuisineDesc: "地域风情 · 香料酸辣 · 特色滋味",
    // Weekly Menu Section
    weeklyMenuTag: "一览本周菜单",
    weeklyMenuTitle: "This Week's Menu",
    weeklyMenuWeekDates: "June 2 — 6",
    // Weekly Menu translations
    monday: "周一",
    tuesday: "周二",
    wednesday: "周三",
    thursday: "周四",
    friday: "周五",
    totalCalories: "KCAL",
    // Monday meals
    meal_1_1: "字母番茄蔬菜汤",
    meal_1_1_desc: "字母意面、番茄、胡萝卜、洋葱、西芹、黑胡椒",
    meal_1_2: "奥尔良烤鸡腿肉",
    meal_1_3: "罗马生菜羽衣甘蓝沙拉",
    meal_1_3_desc: "罗马生菜、羽衣甘蓝、小番茄、低脂千岛沙拉酱",
    meal_1_4: "绵密土豆泥",
    // Tuesday meals
    meal_2_1: "三彩豆炒虾仁",
    meal_2_1_desc: "胡萝卜、青豆、玉米粒、虾仁",
    meal_2_2: "浓郁番茄炖牛肉",
    meal_2_3: "西兰花炒蘑菇",
    meal_2_4: "补血紫米饭 + 烤妈咪南瓜",
    // Wednesday meals
    meal_3_1: "日式味增豆腐汤",
    meal_3_2: "蒲烧鳗鱼",
    meal_3_3: "意式烤西葫芦彩椒",
    meal_3_4: "补血紫米饭 + 烤红薯",
    // Thursday meals
    meal_4_1: "法式洋葱汤",
    meal_4_2: "意式肉酱",
    meal_4_3: "烘烤孢子甘蓝",
    meal_4_4: "意大利面",
    // Friday meals
    meal_5_1: "三鲜菌菇汤",
    meal_5_1_desc: "蘑菇、豆腐、鸡蛋",
    meal_5_2: "日式咖喱鸡",
    meal_5_3: "番茄炖茄子",
    meal_5_4: "补血紫米饭",
    // Tags
    tag_1_1: "维生素丰富",
    tag_1_2: "提升免疫力",
    tag_2_1: "优质蛋白 高纤维",
    tag_2_2: "补血养胃",
    tag_3_1: "低热量高抗氧",
    tag_3_2: "饱腹供能不发胖",
    tag_4_1: "高蛋白 高纤维",
    tag_4_2: "满足感强",
    tag_5_1: "提升肠道活力",
    tag_5_2: "低卡 营养全面",
    // Customer Reviews Section
    customerReviewsTag: "订阅用户反馈",
    customerReviewsTitle: "What Our Customers",
    customerReviewsSubtitle: "Say About Kapioo",
    realFeedbackTag: "来自用户的真实反馈",
    realFeedbackDesc1: "这些不是精心包装的宣传语，而是用户吃过之后亲自发来的消息截图。",
    realFeedbackDesc2: "有人说\"第一次体验就满分\"，有人说\"这是我吃过最满意的一餐\"，还有人直接晒图夸\"连拍照都好看\"。",
    realFeedbackDesc3: "Kapioo 不只是送餐，更是在忙碌生活中，带来一份温暖与真实的连接。",
    realFeedbackQuote: "每一句评价，我们都珍藏，也会继续努力，让更多人吃到满意的一餐。",
    satisfiedReviews: "满意评价",
    averageRating: "平均评分",
    repurchaseRate: "回购率",
    // How it works section
    howItWorksTag: "如何订阅",
    howItWorksMainTitle: "How Kapioo",
    howItWorksSubtitle: "Meal Plan Works",
    step1Number: "01",
    step1MainTitle: "充值餐券",
    step1Subtitle: "Top up meal vouchers",
    step1Desc: "Kapioo采用【先购餐券，送一餐扣一餐】的灵活订阅模式",
    step1SubDesc: "请通过以下任一客服渠道进行餐券购买",
    step2Number: "02",
    step2MainTitle: "安排你的送餐日程",
    step2Subtitle: "Schedule your delivery",
    step2Desc: "每天从中央厨房统一制作出餐，当天配送当天餐食",
    step2SubDesc: "根据你的需求，选择每周需要餐食的日期（例如：周一，二，四，五需要）",
    step3Number: "03",
    step3MainTitle: "新鲜送达 开启你的松弛美好时刻",
    step3Subtitle: "Fresh delivery & enjoy your relaxing moments",
    step3Desc: "你选择的日期，我们都会出现。收到新鲜餐食，享受你的餐食",
    step3SubDesc: "享受「被好好对待」的时刻",
    startSubscriptionBtn: "开始订阅 Kapioo",
    startSubscriptionBtnSub: "Start Your Journey",
    // How it works section
    howItWorksTitle: "如何运作",
    howItWorksDescription: "我们的订购服务简单又方便。以下是如何开始的方法。",
    step1Title: "创建账户",
    step1Description: "创建账户并购买餐券用于每周餐点。",
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
    fullName: "昵称",
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
    orderBeforeCutoff: "订单必须在配送前一天晚上11:59之前下单",
    orderPlacedSuccess: "订单已成功提交！",
    errorPlacingOrder: "下单时出错",
    unexpectedError: "提交订单时发生意外错误",
    noMealsSelected: "未选择餐点",
    insufficientCredits: "餐券不足",
    addressUpdated: "地址已更新",
    addressForThisOrder: "地址仅用于此订单",
  },
  en: {
    // Header
    login: "Login",
    getStarted: "Get Started",
    // Hero section
    heroTitle: "Premium Meal Subscription in North America <br/><span style=\"white-space: nowrap;\">Bringing care to your everyday moments</span>",
    heroDescription: "Freshly made, daily delivery<br/>Healthy | Quality | Comfort | Happiness<br/><br/>Take a moment to relax with a good meal<br/>Kapioo, your daily moment of comfort and joy",
    getStartedBtn: "Get Started",
    howItWorksBtn: "How It Works",
    // Homepage additional translations
    healthyTags: "Healthy|Quality|Comfort|Happy",
    mainSlogan: "Premium Meal Subscription in North America",
    subSlogan: "Bringing care to your everyday moments",
    tagline: "Freshly made, daily delivery",
    mottoFirstLine: "Take a moment to relax with a good meal",
    mottoSecondLine: "Kapioo, your daily moment of comfort and joy",
    // Food Gallery Section
    foodGalleryTag: "Featured Cuisines",
    foodGalleryTitle: "Culinary Excellence from Around the World",
    foodGallerySubtitle: "Diverse Fusion, Rich Flavors, Light & Healthy",
    chineseCuisineTitle: "Chinese Cuisine",
    chineseCuisineDesc: "Quality ingredients · Controlled oil and salt · Healthy cooking methods · Light and flavorful",
    westernCuisineTitle: "Western Dishes",
    westernCuisineDesc: "Fusion style · East-West blend · Creative adaptations",
    japaneseKoreanCuisineTitle: "Japanese & Korean",
    japaneseKoreanCuisineDesc: "Authentic flavors · Local ingredients · Classic tastes",
    southeastAsianCuisineTitle: "Southeast Asian",
    southeastAsianCuisineDesc: "Regional specialties · Aromatic spices · Distinctive flavors",
    // Weekly Menu Section
    weeklyMenuTag: "Browse This Week's Menu",
    weeklyMenuTitle: "This Week's Menu",
    weeklyMenuWeekDates: "June 2 — 6",
    // Weekly Menu translations
    monday: "MON",
    tuesday: "TUE",
    wednesday: "WED",
    thursday: "THU",
    friday: "FRI",
    totalCalories: "KCAL",
    // Monday meals
    meal_1_1: "Alphabet Tomato Vegetable Soup",
    meal_1_1_desc: "Alphabet pasta, tomato, carrot, onion, celery, black pepper",
    meal_1_2: "Cajun Roasted Chicken Thigh",
    meal_1_3: "Romaine & Kale Salad",
    meal_1_3_desc: "Romaine lettuce, kale, cherry tomatoes, low-fat Thousand Island dressing",
    meal_1_4: "Creamy Mashed Potatoes",
    // Tuesday meals
    meal_2_1: "Tri-color Bean Shrimp Stir-fry",
    meal_2_1_desc: "Carrot, green peas, corn kernels, shrimp",
    meal_2_2: "Rich Tomato Beef Stew",
    meal_2_3: "Broccoli & Mushroom Stir-fry",
    meal_2_4: "Purple Rice + Roasted Kabocha Squash",
    // Wednesday meals
    meal_3_1: "Japanese Miso Tofu Soup",
    meal_3_2: "Grilled Eel with Kabayaki Sauce",
    meal_3_3: "Italian Roasted Zucchini with Bell Peppers",
    meal_3_4: "Purple Rice + Roasted Sweet Potato",
    // Thursday meals
    meal_4_1: "French Onion Soup",
    meal_4_2: "Italian Meat Sauce",
    meal_4_3: "Roasted Brussels Sprouts",
    meal_4_4: "Spaghetti",
    // Friday meals
    meal_5_1: "Three Treasures Mushroom Soup",
    meal_5_1_desc: "Mushrooms, tofu, egg",
    meal_5_2: "Japanese Curry Chicken",
    meal_5_3: "Tomato Braised Eggplant",
    meal_5_4: "Purple Rice",
    // Tags
    tag_1_1: "Rich in Vitamins",
    tag_1_2: "Immune Boosting",
    tag_2_1: "Quality Protein & High Fiber",
    tag_2_2: "Blood Nourishing",
    tag_3_1: "Low Calorie & High Antioxidants",
    tag_3_2: "Filling Without Weight Gain",
    tag_4_1: "High Protein & High Fiber",
    tag_4_2: "Highly Satisfying",
    tag_5_1: "Gut Health Promoting",
    tag_5_2: "Low Calorie & Nutritionally Complete",
    // Customer Reviews Section
    customerReviewsTag: "Customer Feedback",
    customerReviewsTitle: "What Our Customers",
    customerReviewsSubtitle: "Say About Kapioo",
    realFeedbackTag: "Real feedback from our customers",
    realFeedbackDesc1: "These aren't carefully crafted marketing phrases, but actual screenshots of messages from customers after trying our meals.",
    realFeedbackDesc2: "Some say \"Perfect from the first experience\", others mention \"This is the most satisfying meal I've had\" and some even share photos saying \"Even the pictures look good\".",
    realFeedbackDesc3: "Kapioo isn't just about meal delivery - it's about bringing warmth and genuine connection to your busy life.",
    realFeedbackQuote: "We treasure every review and will continue to work hard so more people can enjoy satisfying meals.",
    satisfiedReviews: "Satisfied Reviews",
    averageRating: "Average Rating",
    repurchaseRate: "Repurchase Rate",
    // How it works section
    howItWorksTag: "How to Subscribe",
    howItWorksMainTitle: "How Kapioo",
    howItWorksSubtitle: "Meal Plan Works",
    step1Number: "01",
    step1MainTitle: "Purchase Meal Credits",
    step1Subtitle: "Top up meal vouchers",
    step1Desc: "Kapioo uses a flexible subscription model where you purchase credits and use one for each meal",
    step1SubDesc: "Please use any of our customer service channels to purchase meal credits",
    step2Number: "02",
    step2MainTitle: "Schedule Your Deliveries",
    step2Subtitle: "Schedule your delivery",
    step2Desc: "Meals are prepared daily in our central kitchen and delivered on the same day",
    step2SubDesc: "Choose which days you need meals each week (e.g., Monday, Tuesday, Thursday, Friday)",
    step3Number: "03",
    step3MainTitle: "Fresh Delivery & Enjoy Your Moment",
    step3Subtitle: "Fresh delivery & enjoy your relaxing moments",
    step3Desc: "We'll show up on your selected dates. Receive fresh meals and enjoy your dining experience",
    step3SubDesc: "Experience moments of being well taken care of",
    startSubscriptionBtn: "Subscribe to Kapioo",
    startSubscriptionBtnSub: "Start Your Journey",
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
    fullName: "Name",
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
    orderBeforeCutoff: "Orders must be placed before 11:59 PM the day before delivery",
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