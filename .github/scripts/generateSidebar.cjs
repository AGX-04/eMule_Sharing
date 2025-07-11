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
/* 显示复选框本身样式 */
li input[type="checkbox"] {
  /* 移除所有默认的边距，由Grid来控制定位 */
  margin: 0;
  padding: 0;
  transform: scale(1.2); /* 保持复选框大小 */
  vertical-align: middle; /* 垂直居中，即使在Grid中也可能有用 */
  /* 设置Grid区域，确保它只占据第一列 */
  grid-area: checkbox; 
}

/* --- 最终解决方案：使用 CSS Grid 布局 --- */

li.task-list-item {
  list-style-type: none; /* 确保移除任何可能的默认列表符号 */
  margin: 0;             /* 移除默认外边距 */
  padding: 0;            /* 移除默认内边距 */
  
  display: grid;         /* 将li变为Grid容器 */
  /* 定义两列：第一列给复选框，第二列给文本内容 */
  /* 0em 是为了确保“·”文本节点占据零宽度，effectively hiding it */
  /* auto 让第二列（文本内容）占据剩余所有空间 */
  grid-template-columns: 0em min-content auto; /* 非常重要！ */
  
  /* 定义网格区域：第一列是“mark”，第二列是“checkbox”，第三列是“content” */
  /* 这样复选框和文本就分开了，不会重叠 */
  grid-template-areas: ". checkbox content"; /* 注意：点号表示一个空白单元格 */
  
  /* 确保行高对齐 */
  align-items: baseline; /* 或者 center, start, end 依据你的偏好 */
}

/* 隐藏实际的“mark”文本节点 */
/* 由于我们使用了 grid-template-columns: 0em ...，它应该已经被挤压不可见了 */
/* 如果仍可见，可以尝试更复杂的隐藏方法，但通常不需要 */


/* 将文本标签放到对应的Grid区域 */
li.task-list-item label {
  grid-area: content; /* 将label放到第三列的content区域 */
  margin: 0;          /* 移除默认边距 */
  padding: 0;         /* 移除默认内边距 */
  white-space: normal; /* 确保文本正常换行，避免单行显示导致溢出 */
}
`;
fs.writeFileSync(path.join(themeDir, 'style.css'), styleCss.trim(), 'utf8');

console.log('✅ 已生成 .vitepress/config.ts, theme/index.js, style.css');