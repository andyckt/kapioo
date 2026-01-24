"use client"

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Mail, AlertCircle } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'
import Link from 'next/link'

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const { language } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')
  
  const email = searchParams.get('email')
  const type = searchParams.get('type')
  const token = searchParams.get('token')
  
  const emailTypeNames: Record<string, { zh: string; en: string }> = {
    'next-week-menu': { zh: '下周菜单更新', en: 'Next Week Menu Updates' },
    'weekly-menu': { zh: '周次菜单更新', en: 'Weekly Menu Updates' },
    'daily-menu': { zh: '每日菜单更新', en: 'Daily Menu Updates' },
    'order-updates': { zh: '订单更新', en: 'Order Updates' },
    'marketing': { zh: '营销邮件', en: 'Marketing Emails' }
  }
  
  const emailTypeName = type && emailTypeNames[type] 
    ? emailTypeNames[type][language]
    : (language === 'zh' ? '此类邮件' : 'these emails')
  
  const handleUnsubscribe = async () => {
    if (!email || !type || !token) {
      setError(language === 'zh' ? '无效的取消订阅链接' : 'Invalid unsubscribe link')
      return
    }
    
    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/users/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, type, token }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        setIsSuccess(true)
      } else {
        setError(result.error || (language === 'zh' ? '取消订阅失败' : 'Failed to unsubscribe'))
      }
    } catch (error) {
      console.error('Error unsubscribing:', error)
      setError(language === 'zh' ? '发生错误，请稍后重试' : 'An error occurred. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }
  
  if (!email || !type || !token) {
    return (
      <div className="min-h-screen bg-[#FBF7F2] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              {language === 'zh' ? '无效链接' : 'Invalid Link'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#6B5F53]">
              {language === 'zh' 
                ? '此取消订阅链接无效或已过期。' 
                : 'This unsubscribe link is invalid or has expired.'}
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/" className="w-full">
              <Button className="w-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
                {language === 'zh' ? '返回首页' : 'Back to Home'}
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }
  
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#FBF7F2] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              {language === 'zh' ? '取消订阅成功' : 'Unsubscribed Successfully'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[#6B5F53]">
              {language === 'zh' 
                ? `您已成功取消订阅"${emailTypeName}"邮件。` 
                : `You have successfully unsubscribed from "${emailTypeName}".`}
            </p>
            <div className="bg-[#F5EDE4] rounded-lg p-4">
              <p className="text-sm text-[#6B5F53]">
                {language === 'zh' ? '✓ 您将不再收到此类邮件' : '✓ You will no longer receive these emails'}
              </p>
              <p className="text-sm text-[#6B5F53] mt-2">
                {language === 'zh' ? '✓ 您仍会收到订单确认和状态更新' : '✓ You will still receive order confirmations and status updates'}
              </p>
              <p className="text-sm text-[#6B5F53] mt-2">
                {language === 'zh' ? '✓ 您可以随时在账户设置中重新订阅' : '✓ You can resubscribe anytime in your account settings'}
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Link href="/dashboard" className="w-full">
              <Button className="w-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
                {language === 'zh' ? '前往我的账户' : 'Go to My Account'}
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-[#FBF7F2] flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-[#C2884E]" />
            {language === 'zh' ? '取消订阅' : 'Unsubscribe'}
          </CardTitle>
          <CardDescription>
            {language === 'zh' 
              ? `取消订阅"${emailTypeName}"邮件` 
              : `Unsubscribe from "${emailTypeName}"`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-[#6B5F53]">
            {language === 'zh' 
              ? `您确定要取消订阅"${emailTypeName}"邮件吗？` 
              : `Are you sure you want to unsubscribe from "${emailTypeName}"?`}
          </p>
          <div className="bg-[#F5EDE4] rounded-lg p-4 space-y-2">
            <p className="text-sm text-[#6B5F53]">
              {language === 'zh' ? '✓ 您将不再收到此类邮件通知' : '✓ You will no longer receive these email notifications'}
            </p>
            <p className="text-sm text-[#6B5F53]">
              {language === 'zh' ? '✓ 您仍会收到订单确认和状态更新' : '✓ You will still receive order confirmations and status updates'}
            </p>
            <p className="text-sm text-[#6B5F53]">
              {language === 'zh' ? '✓ 您可以随时在账户设置中重新订阅' : '✓ You can resubscribe anytime in your account settings'}
            </p>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full">
              {language === 'zh' ? '取消' : 'Cancel'}
            </Button>
          </Link>
          <Button 
            onClick={handleUnsubscribe}
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-[#C2884E] to-[#D1A46C]"
          >
            {isLoading 
              ? (language === 'zh' ? '处理中...' : 'Processing...') 
              : (language === 'zh' ? '确认取消订阅' : 'Confirm Unsubscribe')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FBF7F2] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-8">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C2884E]"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  )
}
