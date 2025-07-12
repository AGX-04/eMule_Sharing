const fs = require('fs');
const path = require('path');

// --- 配置项 ---
// 忽略的文件夹和隐藏文件
const IGNORE_DIRS = ['.git', '.vitepress', 'node_modules', '.github'];
const MARKDOWN_EXT = '.md'; // 只识别 md 文件

// --- 自定义排序规则 ---
const customOrderFiles = [ // 主页排在首位
  'index.md',
];
const customOrderDirs = [ // 文件夹按设定排序
  'NHK纪录片',
  'TBS纪录片',
  'TXN纪录片',
  'BBC纪录片',
  'PBS纪录片',
  '其他纪录片',
  '事件聚合',
];
const customOrderFilesAtEnd = [ // 留言板排在最末
  '留言板.md',
];

// --- 递归扫描目录，生成 VitePress sidebar 配置结构 ---
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
      // 这里的 customOrderFilesAtEnd 检查保留，确保在主扫描中跳过，以便在后续步骤中统一添加到末尾
      if (customOrderFilesAtEnd.includes(entry.name) && basePath === '') continue; 
      const name = entry.name.slice(0, -MARKDOWN_EXT.length);
      const link = '/' + encodeURI(relativePath.replace(/\\/g, '/').replace(MARKDOWN_EXT, ''));
      items.push({ text: name, link });
    }
  }
  return items;
}

// --- 对侧边栏条目进行自定义排序 ---
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

// 将 customOrderFilesAtEnd 中的文件添加到侧边栏末尾
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
import markdownItTaskCheckbox from 'markdown-it-task-checkbox' // 复选框插件
import { chineseSearchOptimize, pagefindPlugin } from 'vitepress-plugin-pagefind' // 搜索插件

export default defineConfig({
  base: '/eMule_Sharing/',
  lang: 'zh-CN',
  title: 'Emule Sharing',
  description: '提供道兰当年发布纪录片的ed2k链接资源并持续供源',
  srcDir: '.',
  themeConfig: {
    sidebar: ${JSON.stringify(sidebarItems, null, 2)},
  },
// --- 复选框插件
  markdown: {
    config: (md) => {
      md.use(markdownItTaskCheckbox);
    }
  },
// 搜索插件以及中文强化
  vite: {
    plugins: [
      pagefindPlugin({
        customSearchQuery: chineseSearchOptimize
      })
    ]
  },
  head: [
    // 这里确保 Giscus 脚本不存在，因为它只应在留言板页面加载
  ]
})
`;

fs.mkdirSync('.vitepress', { recursive: true });
fs.writeFileSync('.vitepress/config.ts', configContent.trim(), 'utf8');

// --- 生成主题相关文件 ---
const themeDir = '.vitepress/theme';
const componentsDir = path.join(themeDir, 'components'); // 新增：组件目录

// 生成主题入口文件 index.js
const themeIndex = `
import DefaultTheme from 'vitepress/theme'
import './style.css'
import GiscusComments from './components/GiscusComments.vue' // <-- 导入 GiscusComments 组件

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    app.component('GiscusComments', GiscusComments) // <-- 注册 GiscusComments 组件
  }
}
`;
fs.mkdirSync(themeDir, { recursive: true });
fs.writeFileSync(path.join(themeDir, 'index.js'), themeIndex.trim(), 'utf8');

// 生成 GiscusComments.vue 组件文件
const giscusCommentsVueContent = `
<template>
  <div class="giscus-container">
    </div>
</template>

<script setup>
import { onMounted } from 'vue';

// IMPORTANT: 从你的 Giscus 官网复制的配置，请确保这里的参数与你之前获得的完全一致
// 替换为你自己的实际值
const giscusConfig = {
  src: 'https://giscus.app/client.js',
  'data-repo': 'AGX-04/eMule_Sharing',      // <-- 你的 GitHub 用户名/你的仓库名
  'data-repo-id': 'R_kgDOKu7dZw',          // <-- 你的仓库 ID
  'data-category': 'General',              // <-- 你的 Discussions 分类名
  'data-category-id': 'DIC_kwDOKu7dZ84Cs3PD', // <-- 你的分类 ID
  'data-mapping': 'title',
  'data-strict': '0',
  'data-reactions-enabled': '1',
  'data-emit-metadata': '0',
  'data-input-position': 'bottom',
  'data-theme': 'preferred_color_scheme',
  'data-lang': 'zh-CN',
  crossorigin: 'anonymous',
  async: ''
};

onMounted(() => {
  const container = document.querySelector('.giscus-container');
  if (container) {
    // 移除旧的 Giscus 实例，防止在组件重新渲染时重复加载
    const oldGiscus = container.querySelector('iframe.giscus-frame');
    if (oldGiscus) {
      oldGiscus.remove();
    }

    const script = document.createElement('script');
    for (const key in giscusConfig) {
      script.setAttribute(key, giscusConfig[key]);
    }
    container.appendChild(script);
  }
});
</script>

<style scoped>
.giscus-container {
  margin-top: 40px; /* 留言板顶部留白 */
  padding-top: 20px; /* 留言板内部留白 */
  border-top: 1px solid var(--vp-c-divider); /* 添加一条分隔线 */
}
</style>
`;
fs.mkdirSync(componentsDir, { recursive: true }); // 确保组件目录存在
fs.writeFileSync(path.join(componentsDir, 'GiscusComments.vue'), giscusCommentsVueContent.trim(), 'utf8'); // 写入组件文件


// 生成 style.css
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

console.log('✅ 已生成 .vitepress/config.ts, theme/index.js, components/GiscusComments.vue, style.css');