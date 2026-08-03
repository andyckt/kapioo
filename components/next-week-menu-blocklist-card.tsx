"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { parseEmailListFromText } from "@/lib/next-week-menu-email/parse-emails"
import { Ban, Loader2, Plus, Search, Trash2, UserX } from "lucide-react"

type BlocklistResponse = {
  emails: string[]
  count: number
}

type AddBlocklistResponse = BlocklistResponse & {
  added: string[]
  duplicates: string[]
  invalid: string[]
}

export function NextWeekMenuBlocklistCard() {
  const { toast } = useToast()
  const [emails, setEmails] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [addText, setAddText] = useState("")
  const [singleEmail, setSingleEmail] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  const parsedAddEmails = useMemo(() => parseEmailListFromText(addText), [addText])

  const fetchBlocklist = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/admin/next-week-menu-blocklist")
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Failed to load exclusion list")
      }

      setEmails(result.data.emails ?? [])
    } catch (error) {
      console.error("Error fetching blocklist:", error)
      toast({
        title: "Error",
        description: "Failed to load email exclusion list",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void fetchBlocklist()
  }, [fetchBlocklist])

  const filteredEmails = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return emails
    return emails.filter((email) => email.includes(query))
  }, [emails, searchTerm])

  const handleAdd = async () => {
    const fromText = parsedAddEmails.valid
    const fromSingle = singleEmail.trim()
    const inputs = fromSingle ? [...fromText, fromSingle] : fromText

    if (inputs.length === 0) {
      toast({
        title: "No valid emails",
        description: "Enter at least one valid email address to exclude",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch("/api/admin/next-week-menu-blocklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: inputs }),
      })
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Failed to add emails")
      }

      const data = result.data as AddBlocklistResponse
      setEmails(data.emails ?? [])
      setAddText("")
      setSingleEmail("")

      const parts: string[] = []
      if (data.added.length > 0) parts.push(`${data.added.length} added`)
      if (data.duplicates.length > 0) parts.push(`${data.duplicates.length} already on list`)
      if (data.invalid.length > 0) parts.push(`${data.invalid.length} invalid`)

      toast({
        title: "Exclusion list updated",
        description: parts.length > 0 ? parts.join(", ") : "No changes made",
      })
    } catch (error) {
      console.error("Error adding to blocklist:", error)
      toast({
        title: "Error",
        description: "Failed to add emails to exclusion list",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemove = async (email: string) => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/admin/next-week-menu-blocklist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: [email] }),
      })
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Failed to remove email")
      }

      setEmails(result.data.emails ?? [])

      toast({
        title: "Email removed",
        description: `${email} was removed from the exclusion list`,
      })
    } catch (error) {
      console.error("Error removing from blocklist:", error)
      toast({
        title: "Error",
        description: "Failed to remove email from exclusion list",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="border-2 border-rose-200/70 hover:border-rose-300/80 transition-colors">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserX className="h-5 w-5 text-rose-700" />
          Email Exclusion List
          <span className="ml-auto rounded-full bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-800">
            {emails.length} excluded
          </span>
        </CardTitle>
        <CardDescription>
          These addresses will never receive Next Week Menu Update emails when you send to all,
          select users, or paste a list. Users who unsubscribe via the email link are also
          excluded automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Textarea
            placeholder={`Add emails to exclude (one per line)\nexample@gmail.com\nanother@example.com`}
            value={addText}
            onChange={(e) => setAddText(e.target.value)}
            rows={4}
            className="font-mono text-sm"
            disabled={isSaving}
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Or add a single email"
              value={singleEmail}
              onChange={(e) => setSingleEmail(e.target.value)}
              className="font-mono text-sm"
              disabled={isSaving}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void handleAdd()
                }
              }}
            />
            <Button
              onClick={() => void handleAdd()}
              disabled={
                isSaving ||
                (parsedAddEmails.valid.length === 0 && !singleEmail.trim())
              }
              className="bg-rose-700 hover:bg-rose-800 shrink-0"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add to list
            </Button>
          </div>
          {(parsedAddEmails.valid.length > 0 ||
            parsedAddEmails.invalid.length > 0 ||
            parsedAddEmails.duplicateCount > 0) && (
            <p className="text-sm text-[#6B5F53]">
              {parsedAddEmails.valid.length} valid
              {parsedAddEmails.invalid.length > 0 &&
                ` · ${parsedAddEmails.invalid.length} invalid`}
              {parsedAddEmails.duplicateCount > 0 &&
                ` · ${parsedAddEmails.duplicateCount} duplicate${parsedAddEmails.duplicateCount === 1 ? "" : "s"} in paste`}
            </p>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B5F53]" />
          <Input
            placeholder="Search exclusion list..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            disabled={isLoading}
          />
        </div>

        <div className="rounded-lg border bg-[#F5EDE4]/30 max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-rose-700" />
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center text-sm text-[#6B5F53]">
              <Ban className="h-8 w-8 text-rose-300" />
              <p>No emails on the exclusion list yet.</p>
              <p className="text-xs">Add addresses above to prevent them from receiving menu updates.</p>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#6B5F53]">
              No emails match your search.
            </div>
          ) : (
            <ul className="divide-y">
              {filteredEmails.map((email) => (
                <li
                  key={email}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <span className="font-mono break-all">{email}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-rose-700 hover:text-rose-900 hover:bg-rose-50"
                    onClick={() => void handleRemove(email)}
                    disabled={isSaving}
                    aria-label={`Remove ${email} from exclusion list`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {searchTerm.trim() && emails.length > 0 && (
          <p className="text-xs text-[#6B5F53]">
            Showing {filteredEmails.length} of {emails.length} excluded emails
          </p>
        )}
      </CardContent>
    </Card>
  )
}
