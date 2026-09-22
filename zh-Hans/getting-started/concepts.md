# 核心概念与层级

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/getting-started/concepts>

写一个菜单会用到 Window、Pane 和 Element。Window 负责打开和关闭窗口，Pane 安排布局，Element 表示格子里的内容。一扇 Window 可以连接多块 Pane，Pane 里面也可以嵌套其他 Pane。

## 组件层级

点选节点，可以查看它的职责和连接方式。每块 Pane 都可以放置 Item、连接 Inventory，或继续嵌套 Pane。

一个 Window 可以连接多块 Pane

- [Window · UI 窗口](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/window/lifecycle.md)：每位玩家都有独立的 Window，无法在玩家之间共享。Window 管理容器、标题和打开关闭的过程；它连接的 Pane、Item 等 UI 组件则可以被多个窗口共享。
  - [Pane](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/pane/structure.md)：Pane 决定每个槽位放什么。它的槽位由 Element 描述：可以直接摆 Item，也可以连接子 Pane 或 Inventory 的某一格，还可以留空。
    - [Item](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/item/create.md)（Element.Item · 直接摆物品）：Item 提供槽位显示的物品，并处理点击。Pane 通过 Element.Item 把它放进布局。
    - [Pane](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/pane/structure.md)（Element.PaneLink · 连接子 Pane 的槽位）：父 Pane 通过 Element.PaneLink 连接子 Pane 的槽位。子 Pane 同样可以放置 Item、连接 Inventory，或继续嵌套 Pane。
      - [Item](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/item/create.md)（Element.Item · 直接摆物品）：嵌套 Pane 中的 Item 仍然负责物品显示和点击。Window 沿着 Pane 之间的槽位连接找到对应内容。
  - [Pane](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/window/layout.md)：同一个 Window 可以连接多块并列的 Pane。每块 Pane 独立组织自己的槽位，具有相同的布局能力。
    - [Inventory](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/inventory/basics.md)（Element.InventoryLink · 连接库存槽位）：Inventory 存放可交互的物品。Pane 通过 Element.InventoryLink 连接到 Inventory 的某个槽位，显示和操作其中的物品。

布局之外：内容更新与视觉效果

- [Signal · 让内容随数据更新](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/why.md)：Signal 是一个会通知依赖者的值。物品或布局声明依赖后，值发生变化就会触发更新；它不占据图中的某一层。
- [Visual · 在内容之上叠加画面](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/visual/layers.md)：Visual 用来叠加高亮和动画等视觉效果。它改变玩家看到的画面，不会改动库存中实际存放的物品。

多扇 Window 串成一条流程时，前进后退由 [会话](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/session/navigation.md) 管。

## 打开菜单时，组件从哪来

每名玩家需要独立的 Window。Pane 和 Element 可以每次打开时新建，也可以让多个窗口共用；它们自身不保存显示位置和查看者。

| | 每次打开新建 | 共享同一份 |
| - | - | - |
| 适用 | 绝大多数菜单 | 多人应该看到同一份内容 |
| 玩家之间 | 互不干扰 | 一处变化，所有人立刻看到 |
| 要注意什么 | 没有额外约束 | 组件里不能存玩家状态 |

### 每次打开新建

普通菜单可以在每次打开时创建 Pane 和 Item。[快速开始](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/getting-started/quick-start.md) 就是这样写的，构建时只解析布局、创建物品，不需要读文件或查数据库。

```java
public static void open(Player viewer) {
    // 每次调用都建一份新的 Pane 和 Window
    Window.builder(buildPane())
            .setTitle(Component.text("欢迎菜单"))
            .open(viewer);
}
```

这样，每名玩家的菜单组件和菜单状态都是独立的，不会互相影响。

### 共享同一份

把同一个 Item、同一块 Pane 或同一个容器给多扇 Window 用。组件变化后所有观察者都会收到通知，每扇 Window 只刷新受影响的格子。

公共仓库、全服排行榜这类需要同步显示同一份内容的菜单，可以共用组件。

```java
// 一块公告 Pane，两名玩家各开一扇窗看同一份内容
Window.builder(boardPane).setTitle(Component.text("公告")).open(alice);
Window.builder(boardPane).setTitle(Component.text("公告")).open(bob);
```

> **注意：共享时不能在组件里存玩家状态**
>
> 一个组件同时给多名玩家用时，不要在组件中保存某一名玩家作为当前查看者。渲染和点击时，从 `RenderContext` 或 `ItemClick` 获取本次操作对应的玩家。
>
> 每次打开时新建的独立组件可以保存对应玩家的状态。

**下一步**：[创建物品](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/item/create.md) — 创建 Item，设置物品外观和点击行为
