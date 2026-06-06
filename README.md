# 弦外之音 · 巡演排期系统

独立乐队「弦外之音」巡演计划管理系统，告别Excel排期，一眼看清每城每场的时间轴。

---

## ✨ 核心功能

### 📅 时间轴甘特图
- **周/月视图切换**：灵活切换时间粒度
- **城市分组**：纵向按城市分组，横向展示时间轴
- **拖拽改期**：甘特条可横向拖拽调整演出时间
- **时间吸附**：自动吸附到30分钟（周视图）或19:30（月视图）网格

### 🌳 左侧树形导航
- **层级结构**：巡演季 → 城市 → 场次
- **展开/折叠**：灵活控制显示层级
- **冲突标记**：实时显示各场次冲突状态
- **快速定位**：点击场次自动选中并跳转

### ⚠️ 智能冲突检测
拖拽改期后自动检测三类冲突：

| 冲突类型 | 检测规则 | 严重程度 |
|---------|---------|---------|
| **乐手撞档** | 同一乐手两场演出时间重叠 | 🔴 错误 |
| **乐手转场** | 同一乐手同日跨城演出间隔 < 6小时 | 🟠 警告 |
| **运输窗口** | 共享大型乐器的两场演出间隔 < 6小时 | 🔴 错误 |
| **场馆不可用** | 演出日期在场馆不可用日期列表中 | 🔴 错误 |

> 💡 冲突检测逻辑与UI完全解耦，便于单元测试

### 🎯 冲突交互
- **拖拽过程**：允许临时重叠，不阻断操作
- **释放确认**：松开鼠标时才运行冲突检测
- **可点击定位**：冲突条目可点击快速跳转到对应场次
- **可视化标记**：甘特条颜色标识冲突状态

### 🖼️ 导出PNG
- 一键导出当前时间轴视图为PNG图片
- 自动生成带时间戳的文件名
- 方便微信群发给后勤组

### 💾 离线草稿
- 所有修改自动保存到localStorage
- 页面刷新后提示恢复未提交的草稿
- 支持「恢复草稿」或「丢弃草稿」

---

## 🛠️ 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **Vue** | 3.4+ | 前端框架 |
| **TypeScript** | 5.3+ | 类型安全 |
| **Pinia** | 2.x | 状态管理 |
| **Tailwind CSS** | 3.4+ | 样式框架 |
| **Canvas API** | - | 甘特图绘制 |
| **Vite** | 5.x | 构建工具 |
| **Lucide Vue** | - | 图标库 |
| **html2canvas** | - | PNG导出（备用） |
| **Nginx** | alpine | 静态托管（Docker） |

---

## 📦 快速开始

### 前置要求
- Node.js >= 18.x
- npm >= 9.x

### 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 3. 浏览器访问
# http://localhost:5173
```

### 生产构建

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

### 代码检查

```bash
# TypeScript类型检查
npm run check

# ESLint检查
npm run lint

# ESLint自动修复
npm run lint:fix
```

---

## 🐳 Docker 一键部署

### 前置要求
- Docker >= 20.x
- Docker Compose >= 2.x

### 部署步骤

```bash
# 1. 构建生产版本
npm run build

# 2. 启动容器
docker-compose up -d

# 3. 浏览器访问
# http://localhost:8080
```

### 常用命令

```bash
# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f web

# 停止容器
docker-compose down

# 重启容器
docker-compose restart
```

### Nginx配置说明
- 静态文件gzip压缩
- 前端路由history模式支持
- 静态资源长期缓存（1年）
- HTML文件不缓存
- 404自动重定向到index.html

---

## 📁 项目结构

```
.
├── src/
│   ├── components/           # UI组件
│   │   ├── TourTree.vue          # 左侧树形导航
│   │   ├── GanttTimeline.vue     # 甘特图时间轴(Canvas)
│   │   ├── TimelineHeader.vue    # 顶部工具栏
│   │   ├── ConflictPanel.vue     # 冲突列表面板
│   │   ├── ShowDetailPanel.vue   # 场次详情面板
│   │   └── ConflictModal.vue     # 冲突提示弹窗
│   ├── pages/               # 页面组件
│   │   └── HomePage.vue          # 主页面
│   ├── stores/              # Pinia状态管理
│   │   └── tourStore.ts          # 巡演状态管理
│   ├── types/               # TypeScript类型定义
│   │   └── index.ts
│   ├── utils/               # 工具函数
│   │   ├── conflictDetector.ts   # 冲突检测引擎
│   │   ├── timelineUtils.ts      # 时间轴工具函数
│   │   └── exportPng.ts          # PNG导出工具
│   ├── data/                # 模拟数据
│   │   └── mockData.ts           # 巡演/乐手/场馆等数据
│   ├── router/              # 路由配置
│   ├── App.vue              # 根组件
│   ├── main.ts              # 入口文件
│   └── style.css            # 全局样式
├── dist/                    # 构建产物
├── docker-compose.yml       # Docker Compose配置
├── nginx.conf               # Nginx配置
├── .dockerignore            # Docker忽略文件
├── package.json             # 项目依赖
├── tailwind.config.js       # Tailwind配置
├── tsconfig.json            # TypeScript配置
├── vite.config.ts           # Vite配置
├── COMPONENTS.md            # 组件清单说明
└── README.md                # 项目说明
```

---

## 🎮 使用指南

### 基础操作

1. **查看时间轴**
   - 默认显示周视图，可切换为月视图
   - 鼠标滚轮可前后滚动日期
   - 点击「今天」按钮回到当天

2. **拖拽改期**
   - 鼠标左键按住甘特条拖动
   - 拖动过程中可看到实时预览
   - 松开鼠标自动检测冲突
   - 如有冲突会弹出提示，修改不会生效

3. **查看场次详情**
   - 点击左侧树形列表的场次
   - 或点击时间轴上的甘特条
   - 右侧面板显示完整信息

4. **处理冲突**
   - 右侧冲突面板按类型分组展示
   - 点击冲突条目的场次标签可快速定位
   - 拖拽改期时发现的冲突会弹窗提示

5. **导出图片**
   - 调整到需要的视图
   - 点击右上角「导出PNG」按钮
   - 图片自动下载到本地

### 交互说明

| 操作 | 效果 |
|------|------|
| 鼠标悬停甘特条 | 显示场次详情Tooltip |
| 拖拽甘特条 | 临时移动位置（不保存） |
| 释放甘特条 | 检测冲突，无冲突则保存 |
| 点击场次 | 选中并显示详情 |
| 点击冲突条目 | 定位到对应场次 |
| 滚轮滚动 | 前后切换日期 |

---

## 🧪 冲突检测单测

冲突检测逻辑完全独立于UI，可单独测试。

### 测试示例

```typescript
import { detectConflicts, detectMusicianOverlap, detectTransportWindow, detectVenueUnavailable } from './src/utils/conflictDetector'
import type { Show, Venue, Instrument } from './src/types'

// 测试乐手重叠检测
const testShows: Show[] = [
  {
    id: 's1',
    tourId: 't1',
    city: '深圳',
    venueId: 'v1',
    venueName: '深圳保利剧院',
    startTime: '2026-06-14T19:30:00',
    durationMinutes: 150,
    musicianIds: ['m1', 'm2'],
    instrumentIds: ['i1'],
  },
  {
    id: 's2',
    tourId: 't1',
    city: '广州',
    venueId: 'v2',
    venueName: '广州中山纪念堂',
    startTime: '2026-06-14T20:00:00',  // 与s1重叠
    durationMinutes: 150,
    musicianIds: ['m1', 'm2'],  // 相同乐手
    instrumentIds: ['i1'],
  },
]

const conflicts = detectMusicianOverlap(testShows)
console.log(conflicts.length)  // 应为 1（乐手时间重叠）
```

### 运行测试

```bash
# 项目预留了测试入口，可配置vitest运行
npm install -D vitest @vue/test-utils
npm run test
```

---

## 🔧 开发说明

### 扩展数据模型

所有数据类型定义在 `src/types/index.ts`：

```typescript
// 添加新的冲突类型
export type ConflictType = 'musician_overlap' | 'transport_window' | 'venue_unavailable' | 'your_new_type'

// 添加新的检测规则
// 在 src/utils/conflictDetector.ts 中添加新函数
export function detectYourRule(shows: Show[]): Conflict[] {
  // 实现检测逻辑
}
```

### 自定义主题

Tailwind配置在 `tailwind.config.js`，可自定义颜色主题：

```javascript
export default {
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        secondary: '#8b5cf6',
        // ...
      },
    },
  },
}
```

### localStorage键名

当前使用的存储键名：`tour-scheduler-draft`

可在 `src/stores/tourStore.ts` 中修改：
```typescript
const STORAGE_KEY = 'your-custom-key'
```

---

## 📋 预载示例数据

系统默认加载「弦外之音·2026夏季巡演」数据：

| 城市 | 场馆 | 日期 | 乐手 | 大型乐器 |
|------|------|------|------|---------|
| 深圳 | 保利剧院 | 6.14 | 林晓、王磊、张雅、李明 | 架子鼓、电子琴 |
| 广州 | 中山纪念堂 | 6.15 | 全员5人 | 架子鼓、低音提琴、电子琴 |
| 上海 | 东方艺术中心 | 6.21 | 林晓、王磊、张雅、李明 | 架子鼓、电子琴 |
| 杭州 | 大剧院 | 6.22 | 全员5人 | 架子鼓、低音提琴、电子琴 |
| 南京 | 保利大剧院 | 6.28 | 林晓、王磊、张雅、李明 | 架子鼓、电子琴 |
| 武汉 | 琴台音乐厅 | 7.5 | 全员5人 | 架子鼓、低音提琴、电子琴 |
| 成都 | 锦城艺术宫 | 7.12 | 林晓、王磊、张雅、李明 | 架子鼓、电子琴 |
| 北京 | 国家大剧院 | 7.18 | 全员5人 | 架子鼓、低音提琴、电子琴 |

> ⚠️ 示例数据中深圳场(6.14)与广州场(6.15)间隔不足，
> 广州场(6.15)与深圳保利剧院的不可用日期(6.15)冲突，
> 系统会自动检测并高亮显示这些冲突。

---

## 🚩 常见问题

**Q: 拖拽改期后没有生效？**
A: 请检查是否有冲突弹窗提示，有冲突时修改会被阻断，需要先调整到无冲突的时间。

**Q: 刷新页面后数据丢失了？**
A: 系统会自动保存草稿，刷新后会提示是否恢复。如果选择了「丢弃草稿」，会重置为默认数据。

**Q: 导出的PNG看不清？**
A: PNG导出使用Canvas原生分辨率，支持高DPI屏幕。如果需要更高分辨率，可以调整Canvas的devicePixelRatio。

**Q: 如何修改冲突检测的时间阈值？**
A: 编辑 `src/utils/conflictDetector.ts`，修改 `minRequiredHours` 的值（默认6小时）。

---

## 📄 License

MIT License

---

## 🤝 技术支持

如有问题，请查看 [COMPONENTS.md](./COMPONENTS.md) 了解详细的组件说明和API文档。
