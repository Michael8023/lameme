# Lameme v2

一个基于 React + Vite 的排便记录 PWA。支持计时、记录、统计、导出、奖章系统，并可安装到手机桌面。

## 功能概览

- 计时记录
  - 手动开始/结束计时
  - 记录排便时长、类型（7 类）、顺畅度、地点（含自定义）、心情、备注
  - 每条记录保存北京时间（`beijingTime` / `beijingTimestamp`）用于统计分析
- 历史与管理
  - 查看历史列表与详情
  - 单条记录可编辑 / 删除
  - 一键清空全部记录（初始化）
- 统计分析
  - 当前画像（便秘型 / 流畅型 / 平衡型）
  - 点击画像进入统计面板
  - 默认统计当月，也可自定义日期区间
  - 图表：
    - 拉屎时长折线图
    - 每日时间分布图（小时维度）
    - 质量柱状图（7 类）
  - 月度总结与年度总结
- 奖章墙
  - 彩色（已解锁）/ 灰色（未解锁）
  - 支持“全部 / 仅已解锁”筛选
  - 点击奖章查看详细说明
- 数据导出
  - JSON 导出
  - Excel 兼容导出（CSV）
- 薪资系统
  - 时薪可自定义，默认 `1` 元/小时
  - 年度收益统计与月度分布
- PWA 能力
  - 可添加到手机桌面
  - Service Worker 离线缓存
  - 计时中通知栏显示（浏览器支持时）

## 技术栈

- React 18 + TypeScript
- Vite 7
- Zustand（本地持久化）
- Framer Motion（动画）
- Tailwind CSS
- React Router

## 数据存储说明

本项目默认**仅本地存储**（`localStorage`），不会上传到服务器。

- 数据键名：`poop-tracker-storage`
- 特性：同一设备同一浏览器可保留
- 注意：清除浏览器数据、换设备或换浏览器后数据不会自动同步

## 本地开发

```bash
npm install
npm run dev
```

默认开发地址：`http://localhost:5173`

## 构建与预览

```bash
npm run build
npm run preview
```

## 发布

推荐：Vercel / Cloudflare Pages / 国内静态托管（OSS/COS + CDN）。

发布要点：

- 构建命令：`npm run build`
- 输出目录：`dist`
- 若面向中国大陆，建议使用自定义域名和可达性更好的入口

## PWA 使用说明

- Android（Chrome）：打开站点后可“添加到主屏幕”
- iOS（Safari）：分享 -> 添加到主屏幕
- 首次通知需要授权

如果改动了 Service Worker，建议强制刷新或在浏览器开发者工具中重新注册 SW。

## 目录结构（核心）

```text
src/
  pages/
    HomePage.tsx
    TimerPage.tsx
    CalendarPage.tsx
    HistoryPage.tsx
    SalaryPage.tsx
  store/
    index.ts
  types/
    index.ts
public/
  sw.js
  manifest.webmanifest
  offline.html
  icons/
```

## 版本更新流程

```bash
git add .
git commit -m "feat: your change"
git push origin main
```

已接入自动部署的平台会在 push 后自动发布新版本。
