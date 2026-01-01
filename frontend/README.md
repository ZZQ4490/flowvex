# AI Workflow Platform - Frontend

React + TypeScript + Vite前端应用，用于可视化工作流编辑。

## 技术栈

- **React 18**: UI框架
- **TypeScript**: 类型安全
- **Vite**: 构建工具
- **React Flow**: 可视化工作流画布
- **Zustand**: 状态管理
- **TanStack Query**: 数据获取

## 功能特性

### 已实现
- ✅ 工作流画布（基于React Flow）
- ✅ 节点拖拽和连接
- ✅ 节点配置面板（基础/高级模式）
- ✅ Undo/Redo功能（Ctrl+Z/Ctrl+Y）
- ✅ 状态管理（Zustand）
- ✅ TypeScript类型定义

### 待实现
- ⏳ 节点可视化样式
- ⏳ 连接线可视化
- ⏳ 实时验证
- ⏳ 错误指示器
- ⏳ 模板浏览器
- ⏳ 调试器界面

## 安装

```bash
cd ai-workflow-platform/frontend
npm install
```

## 开发

```bash
npm run dev
```

访问 http://localhost:3000

## 构建

```bash
npm run build
```

## 项目结构

```
frontend/
├── src/
│   ├── components/       # React组件
│   │   ├── WorkflowCanvas.tsx
│   │   └── NodeConfigPanel.tsx
│   ├── stores/          # Zustand状态管理
│   │   └── workflowStore.ts
│   ├── types/           # TypeScript类型定义
│   │   └── workflow.ts
│   ├── App.tsx          # 主应用组件
│   └── main.tsx         # 入口文件
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## API集成

前端通过代理连接到Rust后端API（端口8080）：

```typescript
// vite.config.ts中配置的代理
proxy: {
  '/api': {
    target: 'http://localhost:8080',
    changeOrigin: true,
  },
}
```

## 快捷键

- `Ctrl+Z` / `Cmd+Z`: 撤销
- `Ctrl+Y` / `Cmd+Y`: 重做
- `Delete`: 删除选中节点
- `Ctrl+C` / `Cmd+C`: 复制
- `Ctrl+V` / `Cmd+V`: 粘贴
