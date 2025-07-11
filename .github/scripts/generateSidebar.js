const fs = require('fs')
const path = require('path')

const IGNORE_DIRS = ['.git', '.vitepress', 'node_modules', '.github']
const MARKDOWN_EXT = '.md'

function walk(dir, basePath = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const items = []

  for (const entry of entries) {
    if (IGNORE_DIRS.includes(entry.name)) continue
    const fullPath = path.join(dir, entry.name)
    const relativePath = path.join(basePath, entry.name)

    if (entry.isDirectory()) {
      const children = walk(fullPath, relativePath)
      if (children.length > 0) {
        items.push({
          text: entry.name,
          collapsible: true,
          items: children,
        })
      }
    } else if (entry.isFile() && entry.name.endsWith(MARKDOWN_EXT)) {
      const name = entry.name.replace(MARKDOWN_EXT, '')
      const link = '/' + relativePath.replace(/\\/g, '/').replace(MARKDOWN_EXT, '')
      items.push({ text: name, link })
    }
  }

  return items
}

const sidebar = walk('.')

const configContent = `import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: '纪录片索引',
  description: '通过ed2k链接整理各类纪录片资源',
  srcDir: '.',
  themeConfig: {
    sidebar: ${JSON.stringify(sidebar, null, 2)}
  }
})
`

fs.mkdirSync('.vitepress', { recursive: true })
fs.writeFileSync('.vitepress/config.ts', configContent, 'utf8')

console.log('✅ 自动生成 config.ts 已完成')
