import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { KapiooIcon, kapiooIconNames } from '../features/marketing-home/kapioo-icons'

async function main() {
  const destination = path.join(process.cwd(), 'public/brand-icons')
  await mkdir(destination, { recursive: true })
  for (const name of kapiooIconNames) {
    const svg = renderToStaticMarkup(createElement(KapiooIcon, { name, size: 32 }))
      .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" style="color:#987044" ')
    await writeFile(path.join(destination, name + '.svg'), svg + '\n')
  }
  console.log('Exported 12 original Kapioo SVG icons.')
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
