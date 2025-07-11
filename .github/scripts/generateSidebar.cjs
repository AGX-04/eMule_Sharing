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
}

/* --- 新增的 CSS 规则：隐藏列表项目符号并调整对齐 --- */
/*
  重要：
  如果下面的 .task-list-item 不起作用，你需要通过浏览器开发者工具
  检查渲染后的 HTML 中 <li> 标签的实际 class 名。
  通常 markdown-it-task-checkbox 会添加 task-list-item。
  如果实际没有这个 class，或者有其他更具体的类，我们需要调整这里的选择器。
*/
li.task-list-item {
  list-style-type: none; /* 移除列表项前面的默认项目符号（例如“·”） */
}

/* 调整缩进，使复选框对齐 */
li.task-list-item {
  margin-left: -1.25em; /* 这是一个推荐值，你可能需要根据实际显示效果微调 */
  /* 如果仍有问题，可以尝试更通用的选择器，但要注意可能影响其他列表： */
  /* margin-left: -1em; /* 另一个尝试值 */
}

/* 如果上述 .task-list-item 仍无效，可以尝试更通用的但可能影响其他列表的样式 */
/*
ul > li {
  list-style-type: none;
  margin-left: -1.25em;
}
*/
`;
fs.writeFileSync(path.join(themeDir, 'style.css'), styleCss.trim(), 'utf8');

console.log('✅ 已生成 .vitepress/config.ts, theme/index.js, style.css');
