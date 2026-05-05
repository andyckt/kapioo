"use client"

import { DelimitedArrayField } from "@/components/admin/delimited-array-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  DAILY_COMBO_LIBRARY_FIELDS,
  type DailyComboLibraryFieldKey,
} from "@/lib/combo-library/daily/fields"
import { getFieldDefinition } from "@/lib/combo-library/shared/fields"

export type DailyComboMetadataFormValue = {
  calories?: number
  proteinGrams?: number
  tags?: string[]
  tagsEn?: string[]
  allergensZh?: string[]
  allergensEn?: string[]
  descriptionZh?: string
  descriptionEn?: string
}

type DailyComboMetadataFieldsProps<T extends DailyComboMetadataFormValue> = {
  value: T
  onChange: (updates: Partial<T>) => void
}

function field(key: DailyComboLibraryFieldKey) {
  return getFieldDefinition(DAILY_COMBO_LIBRARY_FIELDS, key)
}

export function DailyComboMetadataFields<T extends DailyComboMetadataFormValue>({
  value,
  onChange,
}: DailyComboMetadataFieldsProps<T>) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label>{field("calories").label}</Label>
        <Input
          type="number"
          value={value.calories ?? 0}
          onChange={(event) => onChange({ calories: Number(event.target.value) } as Partial<T>)}
        />
      </div>
      <div className="space-y-2">
        <Label>{field("proteinGrams").label}</Label>
        <Input
          type="number"
          min={0}
          value={value.proteinGrams ?? ""}
          onChange={(event) =>
            onChange({
              proteinGrams: event.target.value === "" ? undefined : Number(event.target.value),
            } as Partial<T>)
          }
          placeholder={field("proteinGrams").placeholder}
        />
      </div>
      <div className="space-y-2">
        <Label>{field("tags").label}</Label>
        <DelimitedArrayField
          value={value.tags}
          onChange={(tags) => onChange({ tags } as Partial<T>)}
          placeholder={field("tags").placeholder}
        />
      </div>
      <div className="space-y-2">
        <Label>{field("tagsEn").label}</Label>
        <DelimitedArrayField
          value={value.tagsEn}
          onChange={(tagsEn) => onChange({ tagsEn } as Partial<T>)}
          placeholder={field("tagsEn").placeholder}
        />
      </div>
      <div className="space-y-2">
        <Label>{field("allergensZh").label}</Label>
        <DelimitedArrayField
          value={value.allergensZh}
          onChange={(allergensZh) => onChange({ allergensZh } as Partial<T>)}
          placeholder={field("allergensZh").placeholder}
        />
      </div>
      <div className="space-y-2">
        <Label>{field("allergensEn").label}</Label>
        <DelimitedArrayField
          value={value.allergensEn}
          onChange={(allergensEn) => onChange({ allergensEn } as Partial<T>)}
          placeholder={field("allergensEn").placeholder}
        />
      </div>
      <div className="space-y-2">
        <Label>{field("descriptionZh").label}</Label>
        <Textarea
          rows={3}
          value={value.descriptionZh ?? ""}
          placeholder={field("descriptionZh").placeholder}
          onChange={(event) => onChange({ descriptionZh: event.target.value } as Partial<T>)}
        />
      </div>
      <div className="space-y-2">
        <Label>{field("descriptionEn").label}</Label>
        <Textarea
          rows={3}
          value={value.descriptionEn ?? ""}
          placeholder={field("descriptionEn").placeholder}
          onChange={(event) => onChange({ descriptionEn: event.target.value } as Partial<T>)}
        />
      </div>
    </div>
  )
}
