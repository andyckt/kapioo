"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, ArrowUpRight, Eye, EyeOff } from "lucide-react"
import { signIn } from "next-auth/react"

import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/language-context"
import { mergeStoredUser } from "@/lib/client-user-cache"
import { consumeSupportReturnPath } from "@/lib/support/checkout-return"
import { isAddressVerified } from "@/lib/address/is-verified"
import { useClientAuth } from "@/lib/client-auth"
import "./login.css"

export default function LoginPageClient() {
  const [login, setLogin] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState("")
  const router = useRouter()
  const { toast } = useToast()
  const { t, language, setLanguage } = useLanguage()
  const { refreshAuthState } = useClientAuth()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        login,
        password,
        redirect: false,
      })

      if (result?.error) {
        setFormError(t("invalidCredentials"))
        toast({
          title: t("loginFailed"),
          description: t("invalidCredentials"),
          variant: "destructive",
        })
        return
      }

      const sessionResult = await refreshAuthState({ force: true })

      if (sessionResult.authenticated && sessionResult.user) {
        if (
          sessionResult.user.languagePreference &&
          (sessionResult.user.languagePreference === "zh" ||
            sessionResult.user.languagePreference === "en")
        ) {
          setLanguage(sessionResult.user.languagePreference)
          localStorage.setItem("preferredLanguage", sessionResult.user.languagePreference)
          localStorage.setItem("languagePreferenceSet", "true")
        }

        mergeStoredUser(sessionResult.user)
        localStorage.setItem("isAuthenticated", "true")

        toast({
          title: t("loginSuccess"),
          description: t("welcomeBack") + sessionResult.user.name + "!",
        })

        if (sessionResult.user.role === "admin") {
          router.replace(sessionResult.requiresAdminMfa ? "/admin/mfa" : "/admin")
        } else {
          router.replace(isAddressVerified(sessionResult.user) ? (consumeSupportReturnPath() || "/dashboard") : "/address/verify")
        }
      } else {
        setFormError(t("loginError"))
        toast({
          title: t("loginFailed"),
          description: t("loginError"),
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Login error:", error)
      setFormError(t("loginError"))
      toast({
        title: t("loginFailed"),
        description: t("loginError"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="kp-auth">
      <header className="kp-auth-header">
        <Link href="/" className="kp-auth-logo" aria-label="Kapioo home">kapioo<span>.</span></Link>
        <div className="kp-auth-header-right">
          <Link href="/" className="kp-auth-back"><ArrowLeft size={16} />{t("backToHome")}</Link>
          <div className="kp-auth-language" aria-label={language === "zh" ? "语言" : "Language"}>
            <button type="button" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
            <span aria-hidden="true">/</span>
            <button type="button" aria-pressed={language === "zh"} onClick={() => setLanguage("zh")}>中文</button>
          </div>
        </div>
      </header>
      <main className="kp-auth-main">
        <div className="kp-auth-photo">
          <Image src="/marketing/hero-shared-moment-1280.webp" alt={language === "zh" ? "朋友们共享 Kapioo 餐食" : "Friends sharing a Kapioo meal"} fill sizes="(max-width: 800px) 100vw, 45vw" priority />
          <div className="kp-auth-photo-copy">
            <p>{language === "zh" ? "美味时光，随时回来。" : "Good to have you back."}</p>
            <h2>{language === "zh" ? <>好好吃饭，<em>轻松生活。</em></> : <>A little more time for <em>what matters.</em></>}</h2>
          </div>
        </div>
        <div className="kp-auth-panel">
          <div className="kp-auth-form-wrap">
            <p className="kp-auth-eyebrow">{language === "zh" ? "欢迎回来" : "YOUR KAPIOO ACCOUNT"}</p>
            <h1>{language === "zh" ? "登录账户。" : "Welcome back."}</h1>
            <p className="kp-auth-intro">{language === "zh" ? "登录后即可查看餐券、选择餐食和管理订单。" : "Sign in to choose meals, use your vouchers and see what’s on its way."}</p>
            <form onSubmit={handleLogin} className="kp-auth-form">
              <div className="kp-auth-field">
                <label htmlFor="login">{t("userIdOrEmail")}</label>
                <input id="login" name="username" type="text" autoComplete="username" placeholder={t("userIdOrEmailPlaceholder")} value={login} onChange={(e) => { setLogin(e.target.value); setFormError("") }} required />
              </div>
              <div className="kp-auth-field">
                <div className="kp-auth-field-head"><label htmlFor="password">{t("password")}</label><Link href="/forgot-password">{t("forgotPassword")}</Link></div>
                <div className="kp-auth-password">
                  <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder={t("passwordPlaceholder")} value={password} onChange={(e) => { setPassword(e.target.value); setFormError("") }} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? (language === "zh" ? "隐藏密码" : "Hide password") : (language === "zh" ? "显示密码" : "Show password")}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button>
                </div>
              </div>
              {formError && <p className="kp-auth-error" role="alert">{formError}</p>}
              <button type="submit" className="kp-auth-submit" disabled={isLoading}>
                {isLoading ? t("signingIn") : t("signIn")} <ArrowUpRight size={18} aria-hidden="true" />
              </button>
            </form>
            <p className="kp-auth-signup">{t("noAccount")} <Link href="/signup">{t("signUp")} <ArrowUpRight size={15} /></Link></p>
          </div>
        </div>
      </main>
    </div>
  )
}
