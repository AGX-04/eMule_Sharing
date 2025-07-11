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

// 写入 theme/style.css
const styleCss = `
/* 显示复选框样式 */
li input[type="checkbox"] {
  margin-right: 0.5em;
  transform: scale(1.2);
  vertical-align: middle; /* 垂直居中复选框，使其与文字对齐 */
}

/* --- 最终解决方案：针对文本节点“mark”的隐藏和对齐 --- */

li.task-list-item {
  list-style-type: none; /* 确保移除任何可能的默认列表样式 */
  position: relative;    /* 允许子元素进行定位 */
  padding-left: 1.5em;   /* 为复选框和内容留出空间，同时覆盖掉“mark”的位置 */
  /* 这个 1.5em 需要根据实际情况调整，它决定了复选框距离左边缘的距离 */
}

li.task-list-item input[type="checkbox"] {
  position: absolute;    /* 将复选框绝对定位 */
  left: 0;               /* 放置在列表项的最左边 */
  top: 0.25em;           /* 垂直方向微调，使其与文本基线对齐 */
  margin-top: 0;         /* 移除默认上外边距 */
  margin-right: 0.5em;   /* 复选框与文本的间距 */
  transform: scale(1.2);
  vertical-align: middle;
}

li.task-list-item label {
  /* 调整 label 的样式，确保它在复选框之后且没有被“mark”影响 */
  margin-left: 0.5em; /* 确保标签文本与复选框之间有适当间距 */
}

/* 隐藏在 input 之前的所有文本节点 (这个是关键，但可能不是万能) */
/* 这种方法更像是一个高级技巧，依赖于 Markdown 的特定渲染行为 */
/* 如果直接的文本节点无法通过常规CSS隐藏，我们则通过覆盖其显示区域 */
/*
li.task-list-item::before {
  content: "";
  display: block;
  position: absolute;
  left: 0;
  top: 0;
  width: 1.5em; /* 覆盖掉“mark”文本的宽度 */
  height: 100%;
  background-color: transparent; /* 或者你的背景色，以覆盖 */
  z-index: 1; /* 确保覆盖在“mark”之上 */
}
*/
`;
fs.writeFileSync(path.join(themeDir, 'style.css'), styleCss.trim(), 'utf8');

console.log('✅ 已生成 .vitepress/config.ts, theme/index.js, style.css');
