import React, { type ReactNode } from 'react'

// Original drawings: one 32px grid, rounded 1.7px strokes, warm translucent accents.
export const kapiooIconNames = ['location', 'bento', 'box', 'prep', 'cook', 'delivery', 'calendar', 'heat', 'clock', 'choice', 'portion', 'heart'] as const
export type KapiooIconName = typeof kapiooIconNames[number]
const artwork: Record<KapiooIconName, ReactNode> = {
  location: <><path d="M24 13c0 6-8 13-8 13S8 19 8 13a8 8 0 1 1 16 0Z" /><circle cx="16" cy="13" r="2.8" /><path d="M8 25c-2 .6-3 1.3-3 2 0 1.6 4.9 3 11 3s11-1.4 11-3c0-.7-1-1.4-3-2" opacity=".45" /></>,
  bento: <><rect x="4" y="7" width="24" height="20" rx="5" /><path d="M4 17h24M17 7v10M13 17v10m-5-5 2 1 2-1M20 11h4M20 14h2" /><path d="M18 22c1.8-3 4.2-3 6 0-1.8 3-4.2 3-6 0Z" fill="currentColor" fillOpacity=".12" /></>,
  box: <><path d="m5 11 11-6 11 6-11 6-11-6Z" /><path d="M5 11v13l11 5 11-5V11M16 17v12M10 8l11 6" /><path d="M9 20c-2-2-4 1 2 4 5-3 3-6 1-4-1-1-2-1-3 0Z" fill="currentColor" fillOpacity=".12" /></>,
  prep: <><path d="M5 18h22c-1 7-5 10-11 10S6 25 5 18ZM8 23h16M16 17C8 13 9 6 9 6s8 0 9 8M17 17C17 9 25 6 25 6s3 9-6 12M12 10l4 7" /><path d="M5 6v4M3 8h4" opacity=".5" /></>,
  cook: <><path d="M6 15h20v9a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4v-9ZM6 18H3v5h3M26 18h3v5h-3M4 15h24" /><path d="M10 10c-3-3 3-4 0-7M16 10c-3-3 3-4 0-7M22 10c-3-3 3-4 0-7" opacity=".65" /><path d="M13 21c-2-2-4 1 3 5 7-4 5-7 3-5-1-1-2-1-3 0-1-1-2-1-3 0Z" fill="currentColor" fillOpacity=".12" stroke="none" /></>,
  delivery: <><path d="M3 8h17v16H3V8ZM20 14h5l4 5v5h-9M21 14v6h8M3 13h10M3 17h7" /><circle cx="9" cy="25" r="3" fill="var(--kh-paper, #f8f2e9)" /><circle cx="24" cy="25" r="3" fill="var(--kh-paper, #f8f2e9)" /><path d="m8 5 2-2M14 5l1-3" opacity=".5" /></>,
  calendar: <><rect x="5" y="7" width="22" height="22" rx="4" /><path d="M5 14h22M10 4v6M22 4v6" /><rect x="10" y="18" width="4" height="4" rx="1" fill="currentColor" fillOpacity=".15" /><rect x="19" y="22" width="4" height="4" rx="1" fill="currentColor" fillOpacity=".15" /></>,
  heat: <><rect x="3" y="12" width="26" height="17" rx="4" /><rect x="7" y="16" width="15" height="9" rx="2" /><path d="M25 17v1M25 22v2M10 8c-2-2 2-3 0-5M16 8c-2-2 2-3 0-5M22 8c-2-2 2-3 0-5" /></>,
  clock: <><circle cx="16" cy="17" r="11" /><path d="M16 10v8l5 3M5 6l3-3M24 3l3 3M13 3h6" /></>,
  choice: <><rect x="6" y="6" width="21" height="24" rx="4" /><path d="M12 6V3h9v3M17 14h6M17 22h6m-8-9-3 3-2-2m5 7-3 3-2-2" /></>,
  portion: <><rect x="3" y="7" width="18" height="16" rx="4" /><path d="M7 27h17a4 4 0 0 0 4-4V12M3 15h18M12 7v8M24 5v4M22 7h4" /></>,
  heart: <><path d="M16 26C-3 15 6 3 16 11 26 3 35 15 16 26Z" fill="currentColor" fillOpacity=".1" /><path d="M8 11c-2 1-2 4-1 6M24 4l1-2M28 8l2-1" opacity=".5" /></>,
}
export function KapiooIcon({ name, size = 32, className = '' }: { name: KapiooIconName; size?: number; className?: string }) {
  return <svg className={`kh-icon ${className}`} data-kapioo-icon={name} viewBox="0 0 32 32" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{artwork[name]}</svg>
}
