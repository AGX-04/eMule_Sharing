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
    if (entry.name.startsWith('.')) continue // 忽略隐藏文件夹或文件

    const fullPath = path.join(dir, entry.name)
    const relativePath = path.join(basePath, entry.name)

    if (entry.isDirectory()) {
      const children = walk(fullPath, relativePath)
      if (children.length > 0) {
        items.push({
          text: entry.name,
          collapsible: true,
          collapsed: true, // 文件夹默认折叠
          items: children,
        })
      }
    } else if (entry.isFile() && entry.name.endsWith(MARKDOWN_EXT)) {
      if (relativePath === 'index.md') continue // ✅ 跳过 index.md
      const name = entry.name.slice(0, -MARKDOWN_EXT.length) // 去掉扩展名
      const link = '/' + relativePath.replace(/\\/g, '/').replace(MARKDOWN_EXT, '')
      items.push({ text: name, link })
    }
  }

  return items
}

const sidebarItems = walk('.')  // 先定义 sidebarItems
sidebarItems.unshift({
  text: '首页',
  link: '/'
})

const sidebar = sidebarItems    // 再赋值给 sidebar

const configContent = `export default {
  base: '/eMule_Sharing/',
  lang: 'zh-CN',
  title: '纪录片索引',
  description: '通过ed2k链接整理各类纪录片资源',
  srcDir: '.',
  themeConfig: {
    sidebar: ${JSON.stringify(sidebar, null, 2)}
  }
}
`

// 确保 .vitepress 文件夹存在
fs.mkdirSync('.vitepress', { recursive: true })
// 写入 config.ts
fs.writeFileSync('.vitepress/config.ts', configContent, 'utf8')

console.log('✅ 自动生成 .vitepress/config.ts 完成')
