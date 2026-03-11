"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Shield, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useClientAuth } from "@/lib/client-auth";

const AUTO_SEND_COOLDOWN_MS = 60 * 1000;

export default function AdminMfaPage() {
  const router = useRouter();
  const { toast } = useToast();
  const {
    status: authStatus,
    authenticated,
    user,
    requiresAdminMfa,
    adminMfaEmail,
    refreshAuthState,
  } = useClientAuth();
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [email, setEmail] = useState("");
  const hasAutoSentRef = useRef(false);

  const sendCode = async () => {
    setSending(true);
    try {
      const response = await fetch("/api/auth/admin-mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ action: "send" }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to send verification code");
      }

      toast({
        title: "Verification code sent",
        description: "Check the admin email inbox for your one-time code.",
      });
    } catch (error) {
      toast({
        title: "Unable to send code",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      if (authStatus !== "ready") {
        return;
      }

      if (!authenticated) {
        router.replace("/login");
        return;
      }

      if (user?.role !== "admin") {
        router.replace("/dashboard");
        return;
      }

      if (!requiresAdminMfa) {
        router.replace("/admin");
        return;
      }

      setEmail(adminMfaEmail || user?.email || "kapioomeal@gmail.com");

      if (hasAutoSentRef.current) return;
      const storageKey = user?._id ? `admin-mfa:auto-send:${user._id}` : null;
      const lastAutoSentAt =
        storageKey && typeof window !== "undefined"
          ? Number(sessionStorage.getItem(storageKey) || 0)
          : 0;

      if (lastAutoSentAt && Date.now() - lastAutoSentAt < AUTO_SEND_COOLDOWN_MS) {
        hasAutoSentRef.current = true;
        return;
      }

      hasAutoSentRef.current = true;
      if (storageKey && typeof window !== "undefined") {
        sessionStorage.setItem(storageKey, String(Date.now()));
      }
      await sendCode();
    };

    void initialize();
  }, [adminMfaEmail, authStatus, authenticated, requiresAdminMfa, router, user]);

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setVerifying(true);

    try {
      const response = await fetch("/api/auth/admin-mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ action: "verify", code }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Invalid verification code");
      }

      toast({
        title: "Admin access verified",
        description: "You can now access the admin dashboard.",
      });

      void refreshAuthState({ force: true });
      if (typeof window !== "undefined" && user?._id) {
        sessionStorage.removeItem(`admin-mfa:auto-send:${user._id}`);
        window.location.replace("/admin");
        return;
      }

      router.replace("/admin");
    } catch (error) {
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF7F2] flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-[#C2884E]/10 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F5EDE4]">
            <Shield className="h-6 w-6 text-[#C2884E]" />
          </div>
          <CardTitle>Admin Verification</CardTitle>
          <CardDescription>
            Enter the one-time code sent to {email || "the admin email"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleVerify}>
            <div className="space-y-2">
              <Label htmlFor="admin-mfa-code">Verification code</Label>
              <Input
                id="admin-mfa-code"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 6-digit code"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90"
              disabled={verifying}
            >
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify and Continue"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={sendCode}
              disabled={sending}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resend Code"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

