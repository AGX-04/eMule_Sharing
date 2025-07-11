const fs = require('fs')
const path = require('path')

// 忽略的文件夹
const IGNORE_DIRS = ['.git', '.vitepress', 'node_modules', '.github']
// 只识别 md 文件
const MARKDOWN_EXT = '.md'

/**
 * 递归扫描目录，生成 sidebar 配置结构
 * @param {string} dir 当前扫描目录
 * @param {string} basePath 递归过程中相对路径（用于生成 link）
 * @returns {Array} sidebar 数组项
 */
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

const sidebarItems = walk('.')

sidebarItems.unshift({
  text: '首页',
  link: '/'
})

// ✅ 关键：替换掉注释，插入 sidebar JSON 字符串
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

fs.mkdirSync('.vitepress', { recursive: true })
fs.writeFileSync('.vitepress/config.ts', configContent, 'utf8')

console.log('✅ 自动生成 .vitepress/config.ts 完成')
