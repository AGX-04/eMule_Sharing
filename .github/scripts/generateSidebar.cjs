const fs = require('fs');
const path = require('path');

// --- 配置项 ---
const IGNORE_DIRS = ['.git', '.vitepress', 'node_modules', '.github']; // 忽略的文件夹
const MARKDOWN_EXT = '.md'; // 只识别 md 文件

// --- 侧边栏生成函数 ---
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
    if (IGNORE_DIRS.includes(entry.name) || entry.name.startsWith('.')) {
      continue;
    }

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
      if (entry.name === 'index.md' && basePath === '') {
        continue; // 忽略根目录下的 index.md，因为它通常是网站首页
      }
      const name = entry.name.slice(0, -MARKDOWN_EXT.length);
      const link = '/' + encodeURI(relativePath.replace(/\\/g, '/').replace(MARKDOWN_EXT, ''));
      console.log(`✔️ 文件: ${entry.name} -> link: ${link}`);
      items.push({ text: name, link });
    }
  }
  return items;
}

// --- 主要执行逻辑 ---

// 自动构建 sidebar 项
const sidebarItems = walk('.');

// 首页加到最前
sidebarItems.unshift({
  text: '首页',
  link: '/'
});

// 生成 .vitepress/config.ts 文件
const configContent = `import { defineConfig } from 'vitepress'
import markdownItTaskCheckbox from 'markdown-it-task-checkbox' // 引入任务列表插件

export default defineConfig({
  base: '/eMule_Sharing/', // 你的 GitHub Pages 仓库名称
  lang: 'zh-CN',
  title: 'Emule Sharing',
  description: '提供道兰当年发布纪录片的ed2k链接资源并持续供源',
  srcDir: '.', // 文档源目录，这里是项目根目录
  themeConfig: {
    sidebar: ${JSON.stringify(sidebarItems, null, 2)} // 动态生成的侧边栏
  },
  markdown: {
    config: (md) => {
      // 使用 markdown-it-task-checkbox 插件来处理复选框
      md.use(markdownItTaskCheckbox, {
        // 可选配置：如果希望点击复选框能改变文件内容，可以设为 true。
        // 但对于静态页面，通常保持默认或 false，只关注渲染效果。
        // disabled: false
      });
    }
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
/* --- 基本复选框和列表样式 --- */

/* 隐藏 VitePress 默认的列表项目符号 */
ul {
  list-style-type: none; /* 移除无序列表的默认项目符号 */
  padding-left: 0;      /* 移除默认左内边距 */
  margin: 0;            /* 移除默认外边距 */
}

/* 任务列表项（li.task-list-item）的布局 */
li.task-list-item {
  list-style-type: none; /* 再次确保移除列表项本身的符号 */
  margin: 0;             /* 移除默认外边距 */
  padding: 0;            /* 移除默认内边距 */
  
  display: grid;         /* 启用 CSS Grid 布局 */
  /* 定义列：0em（隐藏“·”）、min-content（复选框）、1em（间距）、auto（文本内容）*/
  grid-template-columns: 0em min-content 1em auto;
  grid-template-areas: ". checkbox gap content"; /* 定义网格区域名称 */
  
  align-items: baseline; /* 垂直对齐，使复选框与文本基线对齐 */
  line-height: 1.5;      /* 调整行高，可根据实际效果微调 */
  margin-bottom: 0.5em;  /* 任务列表项之间的垂直间距 */
}

/* 复选框本身的样式和定位 */
li input[type="checkbox"] {
  grid-area: checkbox;   /* 将复选框放入“checkbox”区域 */
  margin: 0;             /* 移除所有默认外边距 */
  padding: 0;            /* 移除所有默认内边距 */
  transform: scale(1.2); /* 放大复选框图标 */
  vertical-align: middle; /* 垂直居中，即使在Grid中也可能有用 */
  justify-self: center; /* 在其网格单元格内水平居中 */
  align-self: center;   /* 在其网格单元格内垂直居中 */
}

/* 文本标签的样式和定位 */
li.task-list-item label {
  grid-area: content;    /* 将标签文本放入“content”区域 */
  margin: 0;             /* 移除所有默认外边距 */
  padding: 0;            /* 移除所有默认内边距 */
  white-space: normal;   /* 确保文本正常换行 */
}

/* --- 勾选复选框时行变暗和删除线效果 --- */

/* 当复选框被勾选时，选择其相邻的 label 元素（包含文本），并改变样式 */
li.task-list-item input[type="checkbox"]:checked + label {
  color: #888; /* 文本颜色变暗（深灰色）*/
  /* text-decoration: line-through; /* 添加删除线（已注释取消） */
  opacity: 0.7; /* 降低不透明度，使整行显得更暗淡 */
  /* 添加平滑过渡效果，使样式变化更柔和 */
  transition: color 0.3s ease, text-decoration 0.3s ease, opacity 0.3s ease; 
}
`;
fs.writeFileSync(path.join(themeDir, 'style.css'), styleCss.trim(), 'utf8'); // 写入 style.css

console.log('✅ 已生成 .vitepress/config.ts, theme/index.js, style.css');