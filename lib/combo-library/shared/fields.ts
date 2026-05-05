export type ComboLibraryFieldDefinition<Key extends string = string> = {
  key: Key
  label: string
  csvHeader?: string
  csvSample?: string
  placeholder?: string
  required?: boolean
  isArray?: boolean
  includeInTemplate?: boolean
}

export function getTemplateFields<Key extends string>(
  fields: readonly ComboLibraryFieldDefinition<Key>[]
) {
  return fields.filter((field) => field.includeInTemplate !== false)
}

export function getCsvHeaders<Key extends string>(
  fields: readonly ComboLibraryFieldDefinition<Key>[]
) {
  return getTemplateFields(fields).map((field) => field.csvHeader ?? field.key)
}

export function getCsvSampleRow<Key extends string>(
  fields: readonly ComboLibraryFieldDefinition<Key>[]
) {
  return getTemplateFields(fields).map((field) => field.csvSample ?? "")
}

export function getCanonicalCsvColumns<Key extends string>(
  fields: readonly ComboLibraryFieldDefinition<Key>[]
) {
  return new Set(
    getTemplateFields(fields).flatMap((field) => [field.key, field.csvHeader ?? field.key])
  )
}

export function getArrayCsvColumns<Key extends string>(
  fields: readonly ComboLibraryFieldDefinition<Key>[]
) {
  return new Set(
    fields
      .filter((field) => field.isArray)
      .flatMap((field) => [field.key, field.csvHeader ?? field.key])
  )
}

export function getFieldDefinition<Key extends string>(
  fields: readonly ComboLibraryFieldDefinition<Key>[],
  key: Key
) {
  const field = fields.find((entry) => entry.key === key)
  if (!field) {
    throw new Error(`Unknown combo library field: ${key}`)
  }
  return field
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

export function buildCsvTemplate<Key extends string>(
  fields: readonly ComboLibraryFieldDefinition<Key>[]
) {
  return `\uFEFF${getCsvHeaders(fields).join(",")}\n${getCsvSampleRow(fields).map(csvCell).join(",")}`
}
