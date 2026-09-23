# 窗口标题

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal-ui/title>

副本大厅的窗口标题写着「副本大厅 · 已准备 1 / 4」。每有一名队员点了准备，标题里的数字就要加一。

标题不是格子里的物品，`dependsOn` 管不到它。窗口打开后标题就固定了，除非有人主动让它重新计算。

## setTitleSupplier 和 window\.bind 做什么

`setTitleSupplier` 让标题由一个函数算出，窗口打开时调用一次。`window.bind(signal, callback)` 在 Signal 通知时执行回调，把回调设为 `Window::updateTitle`，标题就会重新计算并发给玩家。

绑定跟着窗口走。窗口打开时启用，关闭时暂停，重新打开时恢复。

## 标题显示准备人数

```java
MutableSignal<Integer> readyCount = Signal.of(0);

Pane pane = Pane.builder("####R####")
        .addIngredient('R', Item.builder()
                .setItemProviderConstant(named(Material.LIME_DYE, "准备"))
                .addClickHandler(click -> readyCount.update(value -> Math.min(value + 1, 4)))
                .build()
        )
        .build();

Window window = Window.builder(pane)
        .setTitleSupplier(() -> Component.text("副本大厅 · 已准备 " + readyCount.get() + " / 4"))
        .build(viewer);
window.bind(readyCount, Window::updateTitle);  // 在 open 之前声明
window.open();
```

1. **第 1 行**：还没有人准备。
2. **第 11-13 行**：标题由函数计算。这时窗口还没打开，函数也还没执行。
3. **第 14 行**：声明绑定。bind 不会立刻执行回调，收到通知后才请求更新标题。
4. **第 15 行**：打开窗口，第一次计算标题。
5. **第 6 行**：有人点了准备，updateTitle 重新计算标题。
6. **第 6 行**
7. **第 6 行**：全员准备完毕。

## 注意事项

> **注意：bind 的回调不会切换线程**
>
> `updateTitle()` 会把标题更新交给玩家的线程执行。自己写的其他 `bind` 回调不会自动切换线程，需要操作玩家时要自己调度。

> **注意：先绑定再打开**
>
> 绑定写在 `open()` 之前，窗口打开时它就生效。标题函数只读取数据，不要在里面修改状态。

**示例共用的物品命名方法**

```java
private static ItemStack named(Material material, String name) {
    ItemStack stack = new ItemStack(material);
    stack.setData(DataComponentTypes.CUSTOM_NAME,
            Component.text(name).decoration(TextDecoration.ITALIC, false)
    );
    return stack;
}
```

这里使用 Paper 的 `DataComponentTypes` 和 Adventure 的 `Component`、`TextDecoration`，与 [物品渲染](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/item/render.md) 中的写法相同。

**下一步**：[视觉映射](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal-ui/visual.md) — 用 Signal 切换格子的显示，不改变它的实际内容和点击行为。
