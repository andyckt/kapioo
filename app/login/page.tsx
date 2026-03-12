import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import LoginPageClient from "./login-page-client"
import { getAuthenticatedActor } from "@/lib/auth/guards"
import { ADMIN_MFA_COOKIE_NAME } from "@/lib/auth/session"
import { verifySignedAdminMfaCookie } from "@/lib/security/signed-cookie"

export default async function LoginPage() {
  const actor = await getAuthenticatedActor()

  if (actor) {
    const cookieStore = await cookies()
    const adminMfaCookie = cookieStore.get(ADMIN_MFA_COOKIE_NAME)?.value
    const verifiedMfa = await verifySignedAdminMfaCookie(adminMfaCookie)
    const requiresAdminMfa =
      actor.role === "admin" &&
      (!verifiedMfa ||
        verifiedMfa.userId !== String(actor.user._id) ||
        verifiedMfa.sessionVersion !== actor.sessionVersion)

    if (actor.role === "admin") {
      redirect(requiresAdminMfa ? "/admin/mfa" : "/admin")
    }

    redirect("/dashboard")
  }

  return <LoginPageClient />
}

