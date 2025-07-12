const fs = require('fs');
const path = require('path');

// --- 配置项 ---
// 忽略的文件夹和隐藏文件
const IGNORE_DIRS = ['.git', '.vitepress', 'node_modules', '.github'];
const MARKDOWN_EXT = '.md'; // 只识别 md 文件

// --- 自定义排序规则 ---
const customOrderFiles = [
  'index.md',
];
const customOrderDirs = [
  'NHK纪录片',
  'TBS纪录片',
  'TXN纪录片',
  'BBC纪录片',
  'PBS纪录片',
  '其他纪录片',
  '事件聚合',
];
const customOrderFilesAtEnd = [
  '留言板.md',
];

/**
 * 递归扫描目录，生成 VitePress sidebar 配置结构
 */
function walk(dir, basePath = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const items = [];
  for (const entry of entries) {
    if (IGNORE_DIRS.includes(entry.name) || entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(basePath, entry.name);
    if (entry.isDirectory()) {
      const children = walk(fullPath, relativePath);
      if (children.length > 0) {
        const sortedChildren = sortSidebarItems(children);
        items.push({
          text: entry.name,
          collapsible: true,
          collapsed: true,
          items: sortedChildren
        });
      }
    } else if (entry.isFile() && entry.name.endsWith(MARKDOWN_EXT)) {
      if (entry.name === 'index.md' && basePath === '') continue;
      if (customOrderFilesAtEnd.includes(entry.name) && basePath === '') continue;
      const name = entry.name.slice(0, -MARKDOWN_EXT.length);
      const link = '/' + encodeURI(relativePath.replace(/\\/g, '/').replace(MARKDOWN_EXT, ''));
      items.push({ text: name, link });
    }
  }
  return items;
}

/**
 * 对侧边栏条目进行自定义排序
 */
function sortSidebarItems(items) {
  const files = items.filter(item => item.link);
  const dirs = items.filter(item => item.items);

  files.sort((a, b) => {
    const aIndex = customOrderFiles.indexOf(a.text + MARKDOWN_EXT);
    const bIndex = customOrderFiles.indexOf(b.text + MARKDOWN_EXT);
    if (aIndex === -1 && bIndex === -1) return a.text.localeCompare(b.text);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  dirs.sort((a, b) => {
    const aIndex = customOrderDirs.indexOf(a.text);
    const bIndex = customOrderDirs.indexOf(b.text);
    if (aIndex === -1 && bIndex === -1) return a.text.localeCompare(b.text);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  return [...dirs, ...files];
}

// --- 主要执行逻辑 ---

let sidebarItems = walk('.');
sidebarItems = sortSidebarItems(sidebarItems);

sidebarItems.unshift({
  text: '首页',
  link: '/'
});

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
  base: '/eMule_Sharing/',
  lang: 'zh-CN',
  title: 'Emule Sharing',
  description: '提供道兰当年发布纪录片的ed2k链接资源并持续供源',
  srcDir: '.',
  themeConfig: {
    sidebar: ${JSON.stringify(sidebarItems, null, 2)},
  },
  markdown: {
    config: (md) => {
      md.use(markdownItTaskCheckbox);
    }
  },
  vite: {
    plugins: [
      pagefindPlugin({
        customSearchQuery: chineseSearchOptimize
      })
    ]
  }
})
`;

fs.mkdirSync('.vitepress', { recursive: true });
fs.writeFileSync('.vitepress/config.ts', configContent.trim(), 'utf8');

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

const styleCss = `
:root {
  --vp-sidebar-width: 280px;
  --vp-layout-max-width: 1440px;
}
.VPSidebarItem .text {
  word-break: break-all;
}
ul {
  list-style-type: none;
  padding-left: 0;
  margin: 0;
}
li.task-list-item {
  list-style-type: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: baseline;
  gap: 0.5em;
  line-height: 1.5;
}
li.task-list-item p {
  margin: 0 !important;
  padding: 0 !important;
  display: inline;
}
li input[type="checkbox"] {
  margin: 0;
  padding: 0;
  transform: scale(1.2);
  flex-shrink: 0;
}
li.task-list-item label {
  margin: 0;
  padding: 0;
  white-space: normal;
  flex-grow: 1;
}
li.task-list-item input[type="checkbox"]:checked + label {
  color: #888;
  opacity: 0.7;
  transition: color 0.3s ease, opacity 0.3s ease;
}
del {
  text-decoration: none;
  color: inherit;
  opacity: 1;
}
`;
fs.writeFileSync(path.join(themeDir, 'style.css'), styleCss.trim(), 'utf8');

// === 自动在留言板.md 末尾插入 Giscus 评论代码（如果没插过） ===
const giscusHtml = `
<div id="giscus-comments"></div>
<script src="https://giscus.app/client.js"
        data-repo="AGX-04/eMule_Sharing"
        data-repo-id="R_kgDOKu7dZw"
        data-category="General"
        data-category-id="DIC_kwDOKu7dZ84Cs3PD"
        data-mapping="pathname"
        data-strict="0"
        data-reactions-enabled="1"
        data-emit-metadata="0"
        data-input-position="bottom"
        data-theme="preferred_color_scheme"
        data-lang="zh-CN"
        crossorigin="anonymous"
        async>
</script>
`.trim();

const boardPath = './留言板.md';
if (fs.existsSync(boardPath)) {
  let content = fs.readFileSync(boardPath, 'utf8');
  if (!content.includes('giscus.app/client.js')) {
    content += '\n\n' + giscusHtml;
    fs.writeFileSync(boardPath, content, 'utf8');
    console.log('✅ 已自动插入 Giscus 评论代码到留言板.md');
  } else {
    console.log('ℹ️ 留言板.md 已包含 Giscus 评论代码，无需重复插入');
  }
} else {
  // 如果留言板不存在，自动生成一个带评论的留言板
  const boardContent = `# 留言板

欢迎留言、提问或建议！

${giscusHtml}
`;
  fs.writeFileSync(boardPath, boardContent.trim(), 'utf8');
  console.log('✅ 已新建留言板.md并插入 Giscus 评论代码');
}

console.log('✅ 已生成 .vitepress/config.ts, theme/index.js, style.css');