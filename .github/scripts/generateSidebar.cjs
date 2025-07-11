const fs = require('fs')
const path = require('path')

// 忽略的文件夹
const IGNORE_DIRS = ['.git', '.vitepress', 'node_modules', '.github']
const MARKDOWN_EXT = '.md'

function walk(dir, basePath = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const items = []

  for (const entry of entries) {
    if (IGNORE_DIRS.includes(entry.name)) continue
    if (entry.name.startsWith('.')) continue

    const fullPath = path.join(dir, entry.name)
    const relativePath = path.join(basePath, entry.name)

    if (entry.isDirectory()) {
      const children = walk(fullPath, relativePath)
      if (children.length > 0) {
        items.push({
          text: entry.name,
          collapsible: true,
          collapsed: true,
          items: children
        })
      }
    } else if (entry.isFile() && entry.name.endsWith(MARKDOWN_EXT)) {
      if (entry.name === 'index.md' && basePath === '') continue

      const name = entry.name.slice(0, -MARKDOWN_EXT.length)
      const link = '/' + encodeURI(relativePath.replace(/\\/g, '/').replace(MARKDOWN_EXT, ''))

      console.log(`✔️ 文件: ${entry.name} -> link: ${link}`)

      items.push({ text: name, link })
    }
  }

  return items
}

// 生成 sidebar
const sidebarItems = walk('.')
sidebarItems.unshift({ text: '首页', link: '/' })

// 生成 .vitepress/config.ts
const configContent = `import { defineConfig } from 'vitepress'
import './theme/style.css'

export default defineConfig({
  base: '/eMule_Sharing/',
  lang: 'zh-CN',
  title: 'Emule Sharing',
  description: '提供道兰当年发布纪录片的ed2k链接资源并持续供源',
  srcDir: '.',
  themeConfig: {
    sidebar: ${JSON.stringify(sidebarItems, null, 2)}
  },
  markdown: {
    taskLists: true
  }
})
`

// 确保 .vitepress/theme/style.css 存在
const stylePath = path.join('.vitepress', 'theme', 'style.css')
const styleContent = `
/* 确保任务列表样式可见 */
li input[type="checkbox"] {
  margin-right: 0.5em;
  transform: scale(1.2);
}
`

fs.mkdirSync(path.dirname(stylePath), { recursive: true })
fs.writeFileSync(stylePath, styleContent, 'utf8')

// 写 config.ts
fs.mkdirSync('.vitepress', { recursive: true })
fs.writeFileSync('.vitepress/config.ts', configContent, 'utf8')

console.log('✅ 自动生成 .vitepress/config.ts 和 theme/style.css 完成')
