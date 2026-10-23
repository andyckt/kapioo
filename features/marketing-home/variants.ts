export const finalists = [
  { id: 'daylight', number: '01', name: 'Daylight', note: 'The signature choice', description: 'A centred welcome, generous food photography and a warm portrait kitchen story. A clear, address-first path to your first order.', motion: 'A gently expanding photo, floating captions and softly rising chapters.' },
  { id: 'linen', number: '02', name: 'Linen', note: 'The refined direction', description: 'A centred welcome, a soft photo collection and a light portrait film section. Complete, readable chapters with room to breathe.', motion: 'Photos drift subtly, kitchen details reveal together and the closing mascot tilts gently.' },
  { id: 'journal', number: '03', name: 'Morning Journal', note: 'A story worth scrolling', description: 'Quiet editorial framing, a portrait kitchen film beside its story and a browsable food collection.', motion: 'Drifting photography, a sideways food gallery and a passage that brightens as you scroll.' },
  { id: 'open-house', number: '04', name: 'Open House', note: 'Warm & full of character', description: 'A soft photo mosaic, familiar rounded details and the mascot woven into real food photography.', motion: 'Photography settles into place, kitchen details rise gently and a small mascot follows the scroll.' },
  { id: 'sunday', number: '05', name: 'Slow Sunday', note: 'The most minimal', description: 'Light typography, a calm portrait film and a generous food gallery. An understated path from discovery to checking your address.', motion: 'A widening photo window, a word-by-word scroll passage and subtle image movement.' },
] as const

export type HomeVariant = typeof finalists[number]['id']
export function isHomeVariant(value: string): value is HomeVariant {
  return finalists.some(item => item.id === value)
}
