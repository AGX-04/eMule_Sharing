const fs = require('fs');
const path = require('path');

// --- 配置项 ---
// 忽略的文件夹和隐藏文件
const IGNORE_DIRS = ['.git', '.vitepress', 'node_modules', '.github'];
const MARKDOWN_EXT = '.md'; // 只识别 md 文件

// --- 自定义排序规则 ---
// 定义你希望靠前显示的文件名的优先级 (不含路径，只文件名)
const customOrderFiles = [
  'index.md', // 示例：如果你有 README.md 希望它靠前，可以放在这里
];

// 定义你希望靠前显示的文件夹的优先级
// 按照你希望的顺序排列文件夹名称
const customOrderDirs = [
  'NHK纪录片',
  'TBS纪录片',
  'TXN纪录片',
  'BBC纪录片',
  'PBS纪录片',
  '其他纪录片',
  '事件聚合',
  // 未列出的文件夹会按字母序排在这些后面
];

// 留言板排最后（不参与常规排序，后续单独追加）
const customOrderFilesAtEnd = [
  '留言板.md',   
];

/**
 * 递归扫描目录，生成 VitePress sidebar 配置结构
 * @param {string} dir 当前扫描目录
 * @param {string} basePath 相对路径（用于生成 link）
 * @returns {Array} sidebar 数组项
 */
function walk(dir, basePath = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const items = [];

  for (const entry of entries) {
    // 忽略指定文件夹和以 '.' 开头的隐藏文件/文件夹
    if (IGNORE_DIRS.includes(entry.name) || entry.name.startsWith('.')) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(basePath, entry.name);

    if (entry.isDirectory()) {
      const children = walk(fullPath, relativePath);
      if (children.length > 0) {
        // 对子目录内的条目也进行排序
        const sortedChildren = sortSidebarItems(children); // 对子项也应用排序
        items.push({
          text: entry.name,
          collapsible: true,
          collapsed: true, // 默认折叠
          items: sortedChildren // 使用排序后的子项
        });
      }
    } else if (entry.isFile() && entry.name.endsWith(MARKDOWN_EXT)) {
      // 忽略根目录下的 index.md，因为它通常是网站首页
      if (entry.name === 'index.md' && basePath === '') {
        continue;
      }
      // 留言板排最后：根目录下的留言板.md 跳过，后续单独添加
      if (customOrderFilesAtEnd.includes(entry.name) && basePath === '') {
        continue;
      }
      const name = entry.name.slice(0, -MARKDOWN_EXT.length);
      // 确保 link 使用 / 开头表示根路径，并对路径进行编码
      const link = '/' + encodeURI(relativePath.replace(/\\/g, '/').replace(MARKDOWN_EXT, ''));
      items.push({ text: name, link });
    }
  }
  return items;
}

/**
 * 对侧边栏条目进行自定义排序
 * @param {Array} items 待排序的侧边栏条目数组
 * @returns {Array} 排序后的数组
*/
function sortSidebarItems(items) {
  // 将文件和文件夹分开，以便独立排序
  const files = items.filter(item => item.link); // 有link的是文件
  const dirs = items.filter(item => item.items); // 有items的是文件夹

  // 文件排序
  files.sort((a, b) => {
    const aIndex = customOrderFiles.indexOf(a.text + MARKDOWN_EXT);
    const bIndex = customOrderFiles.indexOf(b.text + MARKDOWN_EXT);
    if (aIndex === -1 && bIndex === -1) return a.text.localeCompare(b.text);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  // 目录排序
  dirs.sort((a, b) => {
    const aIndex = customOrderDirs.indexOf(a.text);
    const bIndex = customOrderDirs.indexOf(b.text);
    if (aIndex === -1 && bIndex === -1) return a.text.localeCompare(b.text);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  // 合并排序后的文件夹和文件，通常文件夹在前
  return [...dirs, ...files];
}

// --- 主要执行逻辑 ---

// 自动构建 sidebar 项
let sidebarItems = walk('.');

// 对顶层侧边栏项进行排序
sidebarItems = sortSidebarItems(sidebarItems);

// 首页加到最前 (确保它在排序后依然是第一个)
sidebarItems.unshift({
  text: '首页',
  link: '/'
});

// === 留言板单独追加到最后 ===
for (const filename of customOrderFilesAtEnd) {
  const filePath = path.join('.', filename);
  if (fs.existsSync(filePath)) {
    const name = filename.slice(0, -MARKDOWN_EXT.length);
    const link = '/' + encodeURI(filename.replace(/\\/g, '/').replace(MARKDOWN_EXT, ''));
    sidebarItems.push({
      text: name,
      link: link
    });
  }
}

// 生成 .vitepress/config.ts 文件
const configContent = `import { defineConfig } from 'vitepress'
import markdownItTaskCheckbox from 'markdown-it-task-checkbox'
import { chineseSearchOptimize, pagefindPlugin } from 'vitepress-plugin-pagefind'

export default defineConfig({
  base: '/eMule_Sharing/', // 你的 GitHub Pages 仓库名称
  lang: 'zh-CN',
  title: 'Emule Sharing',
  description: '提供道兰当年发布纪录片的ed2k链接资源并持续供源',
  srcDir: '.', // 文档源目录，这里是项目根目录
  themeConfig: {
    sidebar: ${JSON.stringify(sidebarItems, null, 2)}, // 动态生成的侧边栏
  },
  markdown: {
    config: (md) => {
      md.use(markdownItTaskCheckbox); // 任务列表插件
    }
  },
  // --- 新增：Vite 配置，用于集成 Pagefind 插件 ---
  vite: {
    plugins: [
      pagefindPlugin({
        customSearchQuery: chineseSearchOptimize // pagefind的中文搜索优化语句
      })
    ]
  }
})
`;

fs.mkdirSync('.vitepress', { recursive: true }); // 创建 .vitepress 目录
fs.writeFileSync('.vitepress/config.ts', configContent.trim(), 'utf8'); // 写入 config.ts

// 生成 .vitepress/theme/index.js 文件
const themeDir = '.vitepress/theme';
const themeIndex = `
import DefaultTheme from 'vitepress/theme'
import './style.css' // 引入自定义样式

export default {
  ...DefaultTheme
}
`;
fs.mkdirSync(themeDir, { recursive: true }); // 创建 theme 目录
fs.writeFileSync(path.join(themeDir, 'index.js'), themeIndex.trim(), 'utf8'); // 写入 index.js

// 生成 .vitepress/theme/style.css 文件
const styleCss = `
/* --- 布局和侧边栏宽度调整 --- */
:root {
  --vp-sidebar-width: 280px; /* 根据需要调整侧边栏宽度 */
  --vp-layout-max-width: 1440px; /* 根据需要调整整个布局的最大宽度，以提供更多内容空间 */
}

/* --- 侧边栏文本换行样式 --- */
.VPSidebarItem .text {
  word-break: break-all; /* 强制在任何字符处换行，包括英文单词内部 */
}
/* --- 侧边栏文本换行样式 结束 --- */

/* --- 复选框任务列表样式 --- */

/* 隐藏 VitePress 默认的列表项目符号 */
ul {
  list-style-type: none; /* 移除无序列表的默认项目符号 */
  padding-left: 0;
  margin: 0;
}

/* 任务列表项的基本样式 */
li.task-list-item {
  list-style-type: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: baseline;
  gap: 0.5em;
  line-height: 1.5;
}

/* 针对任务列表项内部的 p 标签，强制清除其上下外边距和内边距 */
li.task-list-item p {
  margin: 0 !important;
  padding: 0 !important;
  display: inline;
}

/* 复选框本身的样式调整 */
li input[type="checkbox"] {
  margin: 0;
  padding: 0;
  transform: scale(1.2);
  flex-shrink: 0;
}

/* 文本标签的样式 */
li.task-list-item label {
  margin: 0;
  padding: 0;
  white-space: normal;
  flex-grow: 1;
}

/* --- 勾选复选框时行变暗效果 --- */
li.task-list-item input[type="checkbox"]:checked + label {
  color: #888;
  opacity: 0.7;
  transition: color 0.3s ease, opacity 0.3s ease;
}

/* 确保 <del> 标签没有删除线，颜色和不透明度恢复默认 */
del {
  text-decoration: none;
  color: inherit;
  opacity: 1;
}
`;
fs.writeFileSync(path.join(themeDir, 'style.css'), styleCss.trim(), 'utf8');

// === 自动生成 .vitepress/components/Giscus.vue 组件，集成你的 giscus 参数 ===
const componentsDir = '.vitepress/components';
const giscusVueContent = `
<script setup>
import { Giscus } from '@giscus/vue'
</script>

<template>
  <Giscus
    repo="AGX-04/eMule_Sharing"
    repo-id="R_kgDOKu7dZw"
    category="General"
    category-id="DIC_kwDOKu7dZ84Cs3PD"
    mapping="pathname"
    strict="0"
    reactions-enabled="1"
    emit-metadata="0"
    input-position="bottom"
    theme="preferred_color_scheme"
    lang="zh-CN"
  />
</template>
`.trim();

fs.mkdirSync(componentsDir, { recursive: true }); // 创建组件目录
fs.writeFileSync(path.join(componentsDir, 'Giscus.vue'), giscusVueContent, 'utf8'); // 写入 Giscus.vue

console.log('✅ 已生成 .vitepress/config.ts, theme/index.js, style.css, components/Giscus.vue');