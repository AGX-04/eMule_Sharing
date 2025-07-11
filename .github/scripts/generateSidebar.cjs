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
const styleCss = `
/* 显示复选框样式 */
li input[type="checkbox"] {
  margin-right: 0.5em;
  transform: scale(1.2);
  vertical-align: middle; /* 垂直居中复选框，使其与文字对齐 */
}

/* --- 优化后的 CSS 规则：隐藏项目符号并调整对齐 --- */

/* 确保移除列表项的默认项目符号 */
li.task-list-item {
  list-style-type: none; /* 强制移除默认项目符号 */
  padding-left: 0;      /* 确保没有默认的左内边距导致偏移 */
  margin-left: 0;       /* 确保没有默认的左外边距导致偏移 */
}

/* 针对任务列表项内部的元素进行微调 */
/* 如果 "·" 是伪元素或默认列表符号，list-style-type: none 应该能解决 */
/* 但如果它是一个实际的 HTML 元素，我们需要更精准地处理 */

/* 尝试将所有子元素向左移动，以覆盖任何默认的项目符号空间 */
/* 这可能会影响所有 li.task-list-item 的子元素，包括 input 和 label */
li.task-list-item > input[type="checkbox"],
li.task-list-item > label {
  margin-left: -1.5em; /* 再次尝试负边距，根据实际渲染效果调整 */
  /* -1.5em 是一个起点，如果不够，可以增加到 -2em 或更多 */
  /* 如果太靠左，可以减少负值 */
}

/* 还可以考虑对 ::before 伪元素进行操作，但这个更高级，通常不需要 */
/*
li.task-list-item::before {
  content: none !important;
}
*/
`;
fs.writeFileSync(path.join(themeDir, 'style.css'), styleCss.trim(), 'utf8');

console.log('✅ 已生成 .vitepress/config.ts, theme/index.js, style.css');
