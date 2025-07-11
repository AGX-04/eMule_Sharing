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
// 引入 markdown-it-task-checkbox 插件
import markdownItTaskCheckbox from 'markdown-it-task-checkbox'

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
    config: (md) => {
      // 使用 markdown-it-task-checkbox 插件
      md.use(markdownItTaskCheckbox, {
        // 可选配置，通常默认即可
        // disabled: false // 确保不是禁用状态
      });
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
// 修正后的 styleCss 定义，确保使用反引号，并且只定义一次
const styleCss = `
/* 显示复选框本身样式 */
li input[type="checkbox"] {
  margin-right: 0.5em; /* 复选框与文字间的间距 */
  transform: scale(1.2);
  vertical-align: middle; /* 垂直居中复选框，使其与文字对齐 */
}

/* --- 最终优化 CSS 规则：处理“mark”文本和列表对齐 --- */

li.task-list-item {
  list-style-type: none; /* 确保移除任何可能的默认列表符号 */
  
  /* 关键：使用 text-indent 负值将“mark”文本推到左边看不见的地方 */
  text-indent: -1.5em; /* 负值，将行首内容向左推。这个值可能需要微调！ */

  /* 关键：使用 padding-left 为复选框和文字内容留出空间 */
  padding-left: 1.5em; /* 正值，为复选框留出空间，同时覆盖掉 text-indent 推出去的部分 */
  
  /* 确保没有额外的外边距和内边距影响布局 */
  margin: 0;
}

/* 确保复选框和标签的默认样式没有异常 */
li.task-list-item input[type="checkbox"],
li.task-list-item label {
  /* 移除任何可能从父级继承的 text-indent 影响 */
  text-indent: 0; 
  /* 确保它们没有额外的 margin/padding */
  margin: 0;
  padding: 0;
  display: inline-block; /* 确保它们作为行内块级元素正常布局 */
}
`;
fs.writeFileSync(path.join(themeDir, 'style.css'), styleCss.trim(), 'utf8');

console.log('✅ 已生成 .vitepress/config.ts, theme/index.js, style.css');