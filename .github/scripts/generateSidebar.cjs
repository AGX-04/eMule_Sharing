const fs = require('fs');
const path = require('path');

// 忽略的文件夹
const IGNORE_DIRS = ['.git', '.vitepress', 'node_modules', '.github'];
// 只识别 md 文件
const MARKDOWN_EXT = '.md';

/**
 * 递归扫描目录，生成 sidebar 配置结构
 * @param {string} dir 当前扫描目录
 * @param {string} basePath 相对路径（用于生成 link）
 * @returns {Array} sidebar 数组项
 */
function walk(dir, basePath = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const items = [];

  for (const entry of entries) {
    if (IGNORE_DIRS.includes(entry.name)) continue;
    if (entry.name.startsWith('.')) continue;

    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(basePath, entry.name);

    if (entry.isDirectory()) {
      const children = walk(fullPath, relativePath);
      if (children.length > 0) {
        items.push({
          text: entry.name,
          collapsible: true,
          collapsed: true,
          items: children
        });
      }
    } else if (entry.isFile() && entry.name.endsWith(MARKDOWN_EXT)) {
      if (entry.name === 'index.md' && basePath === '') continue;
      const name = entry.name.slice(0, -MARKDOWN_EXT.length);
      const link = '/' + encodeURI(relativePath.replace(/\\/g, '/').replace(MARKDOWN_EXT, ''));
      console.log(`✔️ 文件: ${entry.name} -> link: ${link}`);
      items.push({ text: name, link });
    }
  }

  return items;
}

// 自动构建 sidebar 项
const sidebarItems = walk('.');

// 首页加到最前
sidebarItems.unshift({
  text: '首页',
  link: '/'
});

// 生成 config.ts
const configContent = `import { defineConfig } from 'vitepress'

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
    // 明确启用 GFM (GitHub Flavored Markdown) 的所有特性
    // 这里的 lineNumbers 是一个示例，你可以移除或保留
    lineNumbers: true, // 可选，如果不需要行号可以移除
    // 重点：尝试通过 config 函数更细致地配置 markdown-it
    // VitePress 可能会对一些默认的 markdown-it 插件进行封装
    // 再次强调，我们不在这里手动引入 markdown-it-task-lists
    config: (md) => {
      // 检查 VitePress 是否提供了内置的 GFM 插件
      // 或者尝试直接开启 markdown-it 内部的 task_lists 规则
      // 有些 markdown-it 版本可能通过 enable/disable 来控制
      try {
        md.enable('task_lists'); // 尝试直接启用 markdown-it 的 task_lists 规则
      } catch (e) {
        console.warn('Failed to enable task_lists via md.enable:', e);
      }
    }
  }
})
`;

fs.mkdirSync('.vitepress', { recursive: true });
fs.writeFileSync('.vitepress/config.ts', configContent.trim(), 'utf8');

// 写入 theme/index.js
const themeDir = '.vitepress/theme';
const themeIndex = `
import DefaultTheme from 'vitepress/theme'
import './style.css'

export default {
  ...DefaultTheme
}
`;
fs.mkdirSync(themeDir, { recursive: true });
fs.writeFileSync(path.join(themeDir, 'index.js'), themeIndex.trim(), 'utf8');

// 写入 theme/style.css
const styleCss = `
/* 显示复选框样式 */
li input[type="checkbox"] {
  margin-right: 0.5em;
  transform: scale(1.2);
}
`;
fs.writeFileSync(path.join(themeDir, 'style.css'), styleCss.trim(), 'utf8');

console.log('✅ 已生成 .vitepress/config.ts, theme/index.js, style.css');
