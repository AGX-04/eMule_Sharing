const fs = require('fs');
const path = require('path');

// --- 配置项 ---
const IGNORE_DIRS = ['.git', '.vitepress', 'node_modules', '.github']; // 忽略的文件夹
const MARKDOWN_EXT = '.md'; // 只识别 md 文件

// --- 自定义排序规则 ---
// 定义你希望靠前显示的文件的优先级
const customOrderFiles = [
  'index.md',       // 示例：如果你有 README.md 希望它靠前，可以放在这里
  // 'Getting-Started.md', // 示例：可以添加更多具体文件
];

// 定义你希望靠前显示的文件夹的优先级
// 按照你希望的顺序排列文件夹名称
const customOrderDirs = [
  'NHK纪录片',  // 将“其他纪录片”放在“书籍”之前
  'TBS纪录片',
  'TXN纪录片',
  'BBC纪录片',
  'PBS纪录片',
  '其他纪录片',
  '事件聚合',
  // 你可以根据你的侧边栏实际文件夹名称和期望顺序，继续添加或调整这里
  // 列表中未提及的文件夹会按照字母顺序排在这些指定文件夹之后
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
          collapsed: true,
          items: sortedChildren // 使用排序后的子项
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

/**
 * 对侧边栏条目进行自定义排序
 * @param {Array} items 待排序的侧边栏条目数组
 * @returns {Array} 排序后的数组
 */
function sortSidebarItems(items) {
  // 将文件和文件夹分开，以便独立排序
  const files = items.filter(item => item.link); // 有link的是文件
  const dirs = items.filter(item => item.items); // 有items的是文件夹

  // 根据 customOrderFiles 排序文件
  files.sort((a, b) => {
    const aIndex = customOrderFiles.indexOf(a.text + MARKDOWN_EXT); // 加上扩展名与 customOrderFiles 匹配
    const bIndex = customOrderFiles.indexOf(b.text + MARKDOWN_EXT);

    if (aIndex === -1 && bIndex === -1) {
      return a.text.localeCompare(b.text); // 都不在自定义列表里，按字母顺序
    }
    if (aIndex === -1) return 1; // A 不在自定义列表，B 在，B 靠前
    if (bIndex === -1) return -1; // B 不在自定义列表，A 在，A 靠前
    return aIndex - bIndex; // 都在自定义列表里，按自定义顺序
  });

  // 根据 customOrderDirs 排序文件夹
  dirs.sort((a, b) => {
    const aIndex = customOrderDirs.indexOf(a.text);
    const bIndex = customOrderDirs.indexOf(b.text);

    if (aIndex === -1 && bIndex === -1) {
      return a.text.localeCompare(b.text); // 都不在自定义列表里，按字母顺序
    }
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

// 生成 .vitepress/config.ts 文件
const configContent = `import { defineConfig } from 'vitepress'
import markdownItTaskCheckbox from 'markdown-it-task-checkbox'

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
      md.use(markdownItTaskCheckbox); // 任务列表插件
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
/* --- 布局和侧边栏宽度调整 --- */
:root {
  --vp-sidebar-width: 240px; /* 根据需要调整侧边栏宽度 */
  --vp-layout-max-width: 1440px; /* 根据需要调整整个布局的最大宽度，以提供更多内容空间 */
}

/* --- 复选框任务列表样式 --- */

/* 隐藏 VitePress 默认的列表项目符号 */
ul {
  list-style-type: none; /* 移除无序列表的默认项目符号 */
  padding-left: 0;      /* 移除默认左内边距 */
  margin: 0;            /* 移除默认外边距 */
}

/* 任务列表项的基本样式 */
li.task-list-item {
  list-style-type: none; /* 再次确保移除列表项本身的符号 */
  margin: 0;       /* 任务列表项之间的垂直间距 */
  padding: 0;            /* 移除默认内边距 */
  /* 可以选择添加 flexbox 布局以更好地对齐复选框和文本 */
  display: flex;
  align-items: baseline; /* 垂直对齐，使复选框与文本基线对齐 */
  /* 我们可以通过 line-height 和 gap 协同控制间距 */
  line-height: 1.2;      /* 尝试一个稍微比 1 大一点的值，防止文字粘连 */
  gap: 0.5em;            /* 复选框和文本之间的间距 */
}

/* 复选框本身的样式调整 */
li input[type="checkbox"] {
  margin: 0;             /* 移除所有默认外边距 */
  padding: 0;            /* 移除所有默认内边距 */
  transform: scale(1.2); /* 放大复选框图标，使其更易点击和查看 */
  flex-shrink: 0;        /* 防止复选框在空间不足时缩小 */
}

/* 文本标签的样式 */
li.task-list-item label {
  margin: 0;             /* 移除所有默认外边距 */
  padding: 0;            /* 移除所有默认内边距 */
  white-space: normal;   /* 确保文本正常换行 */
  flex-grow: 1;          /* 允许文本占据剩余空间 */
}

/* --- 勾选复选框时行变暗效果 --- */
/* 当复选框被勾选时，选择其相邻的 label 元素（包含文本），并改变样式 */
li.task-list-item input[type="checkbox"]:checked + label {
  color: #888; /* 文本颜色变暗（深灰色）*/
  opacity: 0.7; /* 降低不透明度，使整行显得更暗淡 */
  transition: color 0.3s ease, opacity 0.3s ease; /* 添加平滑过渡效果 */
}

/* 确保 <del> 标签没有删除线，颜色和不透明度恢复默认 */
del {
  text-decoration: none;
  color: inherit;
  opacity: 1;
}
`;
fs.writeFileSync(path.join(themeDir, 'style.css'), styleCss.trim(), 'utf8');

console.log('✅ 已生成 .vitepress/config.ts, theme/index.js, style.css');