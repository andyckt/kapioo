"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { 
  Calendar,
  Star,
  Check,
  Clock,
  Truck,
  Info,
  ChevronRight
} from "lucide-react"
import { useLanguage } from "@/lib/language-context"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Define plan types
interface PlanOption {
  id: string;
  duration: 1 | 2 | 4;
  durationLabel: string;
  durationLabelZh: string;
  mealsPerWeek: 6 | 10;
  totalPrice: number;
  pricePerMeal: number;
  isPopular?: boolean;
  isRecommended?: boolean;
  tag?: string;
  tagZh?: string;
}

export default function WeeklyMealPage() {
  const { t, language } = useLanguage()
  const [selectedMealsPerWeek, setSelectedMealsPerWeek] = useState<6 | 10>(6)
  // We don't need the dialog state anymore
  // const [howItWorksOpen, setHowItWorksOpen] = useState(false)

  // Define plan options based on the credit-purchase-plans component
  const planOptions: PlanOption[] = [
    // 1 week options
    { 
      id: 'week1-6', 
      duration: 1, 
      durationLabel: 'One week plan', 
      durationLabelZh: '1周次卡券', 
      mealsPerWeek: 6, 
      totalPrice: 103, 
      pricePerMeal: 17.16 
    },
    { 
      id: 'week1-10', 
      duration: 1, 
      durationLabel: 'One week plan', 
      durationLabelZh: '1周次卡券', 
      mealsPerWeek: 10, 
      totalPrice: 170, 
      pricePerMeal: 17 
    },
    
    // 2 week options
    { 
      id: 'week2-6', 
      duration: 2, 
      durationLabel: 'Two weeks plan', 
      durationLabelZh: '2周次卡券', 
      mealsPerWeek: 6, 
      totalPrice: 186, 
      pricePerMeal: 15.5,
      isRecommended: true,
      tag: 'Best value',
      tagZh: '首次推荐'
    },
    { 
      id: 'week2-10', 
      duration: 2, 
      durationLabel: 'Two weeks plan', 
      durationLabelZh: '2周次卡券', 
      mealsPerWeek: 10, 
      totalPrice: 304, 
      pricePerMeal: 15.2,
      isRecommended: true,
      tag: 'Most popular',
      tagZh: '首次推荐'
    },
    
    // 4 week options
    { 
      id: 'week4-6', 
      duration: 4, 
      durationLabel: 'Four weeks plan', 
      durationLabelZh: '4周次卡券', 
      mealsPerWeek: 6, 
      totalPrice: 360, 
      pricePerMeal: 15
    },
    { 
      id: 'week4-10', 
      duration: 4, 
      durationLabel: 'Four weeks plan', 
      durationLabelZh: '4周次卡券', 
      mealsPerWeek: 10, 
      totalPrice: 592, 
      pricePerMeal: 14.8
    },
  ]

  // Get filtered plans based on selected meals per week
  const filteredPlans = planOptions.filter(plan => plan.mealsPerWeek === selectedMealsPerWeek)

  // Define features for the hero section
  const features = [
    {
      title: language === 'zh' ? "周次MealBox" : "Weekly MealBox",
      description: language === 'zh' ? "每周配送2次，轻松覆盖整周" : "Two deliveries per week, covering the entire week",
      icon: <Calendar className="h-6 w-6" />
    },
    {
      title: language === 'zh' ? "晚间配送" : "Evening Delivery",
      description: language === 'zh' ? "6PM-10PM送达，方便省心" : "Delivered 6PM-10PM, convenient and worry-free",
      icon: <Clock className="h-6 w-6" />
    },
    {
      title: language === 'zh' ? "冷藏保存" : "Refrigerate & Enjoy",
      description: language === 'zh' ? "储存于冰箱，随取随享" : "Store in refrigerator, enjoy anytime",
      icon: <Star className="h-6 w-6" />
    }
  ]

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6 }
    }
  }

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#FBF7F2] flex flex-col">
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#FFF6EF] to-[#FBF7F2] pt-16 pb-24">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#C2884E]/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-[#C2884E]/10 to-transparent rounded-full blur-3xl"></div>
        
        <div className="container max-w-6xl mx-auto px-4">
          <motion.div 
            className="flex flex-col items-center gap-8"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {/* Header content - Two column layout */}
            <motion.div className="w-full flex flex-col md:flex-row gap-8 md:gap-12" variants={fadeIn}>
              {/* Left column - Title and description */}
              <div className="md:w-1/2 text-center md:text-left">
                <div className="inline-flex items-center mb-4">
                  <div className="px-4 py-1 bg-[#C2884E]/5 rounded-full">
                    <span className="text-sm font-medium text-[#C2884E]">
                      {language === 'zh' ? '周次餐盒订阅' : 'Weekly Meal Subscription'}
                    </span>
                  </div>
                </div>
                
                <h1 className="text-3xl md:text-5xl font-bold mb-6 text-[#6B5F53]">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
                    {language === 'zh' ? '周次MealBox' : 'Weekly MealBox'}
                  </span>
                  <span className="block mt-2">
                    {language === 'zh' ? '餐盒订阅' : 'Meal Subscription'}
                  </span>
                </h1>
                
                <p className="text-lg md:text-xl text-[#6B5F53]/80 mb-6 max-w-lg">
                  {language === 'zh' 
                    ? '适合把餐食储存于冰箱，随取随享，注重极度便利的你' 
                    : 'Perfect for those who prefer to store meals in the refrigerator and enjoy maximum convenience'}
                </p>
                
                <div className="mt-6">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 transition-all duration-300 shadow-sm"
                      >
                        {language === 'zh' ? '知道更多' : 'Learn More'}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[550px] p-0 rounded-2xl overflow-hidden border-[#C2884E]/10">
                      <DialogHeader className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] p-6 text-white">
                        <DialogTitle className="text-xl font-bold">
                          {language === 'zh' ? '周次MealBox餐盒订阅详情' : 'Weekly MealBox Subscription Details'}
                        </DialogTitle>
                        <DialogDescription className="text-white/80 mt-2">
                          {language === 'zh' ? '了解我们的周次餐盒订阅服务' : 'Learn about our weekly meal subscription service'}
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="p-6 max-h-[70vh] overflow-y-auto">
                        {/* How it works section */}
                        <div className="space-y-6">
                          <div>
                            <h4 className="text-lg font-medium text-[#6B5F53] mb-3 flex items-center gap-2">
                              <div className="p-1.5 rounded-full bg-[#F5EDE4]">
                                <Calendar className="h-4 w-4 text-[#C2884E]" />
                              </div>
                              {language === 'zh' ? '订阅流程' : 'Subscription Process'}
                            </h4>
                            
                            <div className="space-y-4 ml-2">
                              <div className="flex items-start gap-3 border-l-2 border-[#C2884E]/20 pl-4 pb-4">
                                <div className="min-w-[24px] h-6 flex items-center justify-center rounded-full bg-[#C2884E] text-white text-xs font-medium">1</div>
                                <div>
                                  <h5 className="font-medium text-[#6B5F53]">{language === 'zh' ? '选择适合你的周次卡券' : 'Choose your weekly vouchers'}</h5>
                                  <p className="text-sm text-[#8A7968] mt-1">{language === 'zh' ? '无需连周使用，可以根据自己的需求灵活安排' : 'No need to use consecutive weeks, flexible scheduling based on your needs'}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-start gap-3 border-l-2 border-[#C2884E]/20 pl-4 pb-4">
                                <div className="min-w-[24px] h-6 flex items-center justify-center rounded-full bg-[#C2884E] text-white text-xs font-medium">2</div>
                                <div>
                                  <h5 className="font-medium text-[#6B5F53]">{language === 'zh' ? '完成在线付款' : 'Complete online payment'}</h5>
                                  <p className="text-sm text-[#8A7968] mt-1">{language === 'zh' ? '支持微信支付和电子转账，快速便捷' : 'Support for WeChat Pay and e-Transfer, quick and convenient'}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-start gap-3 border-l-2 border-[#C2884E]/20 pl-4 pb-4">
                                <div className="min-w-[24px] h-6 flex items-center justify-center rounded-full bg-[#C2884E] text-white text-xs font-medium">3</div>
                                <div>
                                  <h5 className="font-medium text-[#6B5F53]">{language === 'zh' ? '使用卡券下单订餐' : 'Use vouchers to order meals'}</h5>
                                  <p className="text-sm text-[#8A7968] mt-1">{language === 'zh' ? '每周更新菜单，自由挑选餐食，满足不同口味需求' : 'Weekly updated menu, freely choose meals to satisfy different taste preferences'}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-start gap-3 border-l-2 border-[#C2884E]/20 pl-4">
                                <div className="min-w-[24px] h-6 flex items-center justify-center rounded-full bg-[#C2884E] text-white text-xs font-medium">4</div>
                                <div>
                                  <h5 className="font-medium text-[#6B5F53]">{language === 'zh' ? '晚间送达与享用' : 'Evening delivery and enjoyment'}</h5>
                                  <p className="text-sm text-[#8A7968] mt-1">{language === 'zh' ? '晚间6PM-10PM送达，冷藏保存，按最佳日期享用' : 'Delivered between 6PM-10PM, refrigerate and enjoy on your preferred date'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Highlights section */}
                          <div className="mt-6">
                            <h4 className="text-lg font-medium text-[#6B5F53] mb-3 flex items-center gap-2">
                              <div className="p-1.5 rounded-full bg-[#F5EDE4]">
                                <Star className="h-4 w-4 text-[#C2884E]" />
                              </div>
                              {language === 'zh' ? '服务亮点' : 'Service Highlights'}
                            </h4>
                            
                            <div className="bg-[#FFF6EF] rounded-xl p-4">
                              <ul className="space-y-3">
                                <li className="flex items-start gap-2">
                                  <Check className="h-4 w-4 text-[#C2884E] mt-0.5" />
                                  <span className="text-[#6B5F53]">{language === 'zh' ? '每周配送2次，一次配送多餐，轻松覆盖整周' : 'Two deliveries per week, multiple meals per delivery, easily covering the entire week'}</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <Check className="h-4 w-4 text-[#C2884E] mt-0.5" />
                                  <span className="text-[#6B5F53]">{language === 'zh' ? '方便省心，满分便捷度' : 'Convenient and worry-free, maximum convenience'}</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <Check className="h-4 w-4 text-[#C2884E] mt-0.5" />
                                  <span className="text-[#6B5F53]">{language === 'zh' ? '晚间时段送达：6PM-10PM' : 'Evening delivery: 6PM-10PM'}</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <Check className="h-4 w-4 text-[#C2884E] mt-0.5" />
                                  <span className="text-[#6B5F53]">{language === 'zh' ? '餐食可冷藏保存48小时，保持新鲜口感' : 'Meals can be refrigerated for 48 hours, maintaining fresh taste'}</span>
                                </li>
                              </ul>
                            </div>
                          </div>
                          
                          {/* Suitable for section */}
                          <div className="mt-4">
                            <h4 className="text-lg font-medium text-[#6B5F53] mb-3 flex items-center gap-2">
                              <div className="p-1.5 rounded-full bg-[#F5EDE4]">
                                <Check className="h-4 w-4 text-[#C2884E]" />
                              </div>
                              {language === 'zh' ? '适合人群' : 'Suitable For'}
                            </h4>
                            
                            <p className="text-[#8A7968] mb-3">
                              {language === 'zh' 
                                ? '偏向把餐食储存于冰箱，随取随享，注重极度便利的你' 
                                : 'Those who prefer to store meals in the refrigerator, enjoy anytime, and prioritize extreme convenience'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              {/* Right column - Feature tags */}
              <div className="md:w-1/2 flex flex-col justify-center">
                <div className="space-y-4 md:space-y-6">
                  {features.map((feature, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.15 }}
                      className="group flex items-center gap-4 p-1"
                    >
                      <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-[#C2884E]/10 to-[#D1A46C]/10 flex items-center justify-center shadow-sm border border-[#C2884E]/10 group-hover:border-[#C2884E]/30 transition-all duration-300">
                        <div className="transform group-hover:scale-110 transition-transform duration-300 text-[#C2884E]">
                          {feature.icon}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-medium text-[#6B5F53] group-hover:text-[#C2884E] transition-colors duration-300">{feature.title}</p>
                        <p className="text-sm text-[#6B5F53]/80">{feature.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* Main Content */}
      <section className="container mx-auto py-10 px-4 md:px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-6">
            
            {/* Meals per week selector */}
            <div className="flex gap-4">
              <Button
                onClick={() => setSelectedMealsPerWeek(6)}
                variant={selectedMealsPerWeek === 6 ? "default" : "outline"}
                className={`flex-1 rounded-xl ${selectedMealsPerWeek === 6 ? 'bg-[#C2884E] hover:bg-[#B27A40]' : 'border-[#D1A46C] text-[#8A7968]'}`}
              >
                6 {language === 'zh' ? '餐/周' : 'meals/week'}
              </Button>
              <Button
                onClick={() => setSelectedMealsPerWeek(10)}
                variant={selectedMealsPerWeek === 10 ? "default" : "outline"}
                className={`flex-1 rounded-xl ${selectedMealsPerWeek === 10 ? 'bg-[#C2884E] hover:bg-[#B27A40]' : 'border-[#D1A46C] text-[#8A7968]'}`}
              >
                10 {language === 'zh' ? '餐/周' : 'meals/week'}
              </Button>
            </div>
            
            {/* Plan options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filteredPlans.map((plan) => (
                <Card 
                  key={plan.id} 
                  className={`overflow-hidden transition-all duration-300 hover:shadow-md rounded-2xl ${
                    plan.isPopular || plan.isRecommended ? 'border-[#C2884E]' : 'border-[#E5D6BC]'
                  }`}
                >
                  <div className="relative">
                    {(plan.isPopular || plan.isRecommended) && (
                      <div className="absolute top-0 right-0 left-0 bg-[#C2884E] text-white text-center py-1.5 text-sm font-medium">
                        {language === 'zh' ? plan.tagZh : plan.tag}
                      </div>
                    )}
                    
                    <CardHeader className={`${(plan.isPopular || plan.isRecommended) ? 'pt-10' : 'pt-6'}`}>
                      <CardTitle className="text-center text-xl text-[#6B5F53]">
                        {language === 'zh' ? plan.durationLabelZh : plan.durationLabel}
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-[#C2884E]">
                          ${plan.totalPrice}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-[#C2884E]" />
                            <span className="text-sm font-medium text-[#6B5F53]">
                              {language === 'zh' ? '餐数/周' : 'Meals/week'}
                            </span>
                          </div>
                          <span className="font-bold text-[#C2884E]">{plan.mealsPerWeek}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Star className="h-4 w-4 text-[#C2884E]" />
                            <span className="text-sm font-medium text-[#6B5F53]">
                              {language === 'zh' ? '单价' : 'Per meal'}
                            </span>
                          </div>
                          <span className="font-bold text-[#C2884E]">${plan.pricePerMeal.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2 pt-3 border-t border-[#C2884E]/10">
                        <div className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-[#C2884E] mt-0.5" />
                          <span className="text-[#6B5F53]">
                            {language === 'zh' ? '可转让' : 'Transferable'}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-[#C2884E] mt-0.5" />
                          <span className="text-[#6B5F53]">
                            {language === 'zh' ? '有效期半年' : 'Valid for 6 months'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                    
                    <CardFooter>
                      <Button 
                        className="w-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 rounded-xl"
                      >
                        {language === 'zh' ? '选择此套餐' : 'Select This Plan'}
                      </Button>
                    </CardFooter>
                  </div>
                </Card>
              ))}
            </div>
            
            {/* Delivery fee info */}
            <div className="bg-[#F9F3EC] p-4 rounded-xl border border-[#E5D6BC] text-center">
              <span className="text-[#8A7968]">
                {language === 'zh' ? '配送费/周 (2次配送)' : 'Delivery fee/week (2 deliveries)'}: 
              </span>
              <span className="font-medium text-[#6B5F53] ml-2">$11.99</span>
            </div>
            
            {/* Additional information */}
            <div className="text-xs text-[#8A7968] space-y-1">
              <p>* {language === 'zh' ? '餐券卡有效期为半年，可转赠亲友，购买后7天内可退款未用部分' : 'Plans valid for 6 months, transferable, unused portion refundable within 7 days of purchase'}</p>
              <p>* {language === 'zh' ? '以上均为税前价格，支付方式：EMT/微信' : 'All prices before tax, payment methods: EMT/WeChat Pay'}</p>
            </div>
            
            {/* Payment method and tax information */}
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <h4 className="font-medium text-amber-800 mb-2">{language === 'zh' ? '付款方式与税费说明' : 'Payment Method & Tax Information'}</h4>
              <ul className="space-y-2 text-sm text-amber-700">
                <li className="flex items-start gap-2">
                  <div className="min-w-[20px] mt-0.5">•</div>
                  <div>{language === 'zh' ? '微信支付：无需支付额外税费' : 'WeChat Pay: No additional tax required'}</div>
                </li>
                <li className="flex items-start gap-2">
                  <div className="min-w-[20px] mt-0.5">•</div>
                  <div>{language === 'zh' ? 'Interac e-Transfer：需额外支付13%税费' : 'Interac e-Transfer: Additional 13% tax required'}</div>
                </li>
              </ul>
            </div>
          </div>
      </div>
      </section>
    </div>
  );
}
