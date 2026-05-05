"use client"

import { useEffect, useState, type ChangeEvent } from "react"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type DelimitedArrayFieldProps = {
  id?: string
  value?: string[]
  onChange: (value: string[]) => void
  className?: string
  placeholder?: string
  multiline?: boolean
  rows?: number
}

function parseDelimitedList(value: string) {
  return value.split(/\n|;/).map((item) => item.trim()).filter(Boolean)
}

function formatDelimitedList(value: string[] | undefined, multiline: boolean) {
  return (value ?? []).join(multiline ? "\n" : "; ")
}

/**
 * Array editor for semicolon/newline separated admin fields.
 * Keeps raw draft text while focused so spaces and semicolons do not disappear mid-typing.
 */
export function DelimitedArrayField({
  id,
  value,
  onChange,
  className,
  placeholder,
  multiline = false,
  rows = 4,
}: DelimitedArrayFieldProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [draft, setDraft] = useState(() => formatDelimitedList(value, multiline))

  useEffect(() => {
    if (!isFocused) {
      setDraft(formatDelimitedList(value, multiline))
    }
  }, [isFocused, multiline, value])

  const commit = () => {
    const parsed = parseDelimitedList(draft)
    onChange(parsed)
    setDraft(formatDelimitedList(parsed, multiline))
  }

  const commonProps = {
    id,
    className,
    value: draft,
    placeholder,
    onFocus: () => setIsFocused(true),
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft(event.target.value),
    onBlur: () => {
      setIsFocused(false)
      commit()
    },
  }

  if (multiline) {
    return <Textarea {...commonProps} rows={rows} />
  }

  return <Input {...commonProps} />
}
