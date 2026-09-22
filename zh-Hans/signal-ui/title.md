# 窗口标题

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal-ui/title>

要在窗口标题中显示购买数量，可以用 `setTitleSupplier` 读取数量，再通过 `window.bind` 在数量变化时调用 `updateTitle()`。

示例共用的 `named` 辅助方法见页尾。

## 让标题跟随数量

下面初始标题为「购买 1 件」，点击钻石后变为「购买 2 件」。绑定在打开窗口之前声明。

```text title="购买 1 件"
####Q####
```

- `Q`：增加数量（`diamond`）

初始标题为购买 1 件。点击钻石后标题变为购买 2 件，物品名称保持增加数量。

```java
MutableSignal<Integer> quantity = Signal.of(1);
Pane pane = Pane.builder("####Q####")
        .addIngredient('Q', Item.builder()
                .setItemProviderConstant(named(Material.DIAMOND, "增加数量"))
                .addClickHandler(click -> quantity.update(value -> value + 1))
                .build())
        .build();
Window window = Window.builder(pane)
        .setTitleSupplier(() -> Component.text("购买 " + quantity.get() + " 件"))
        .build(viewer);
window.bind(quantity, Window::updateTitle);
window.open();
```

首次打开时会计算标题。`window.bind` 不立即调用回调，之后收到 Signal 通知才请求更新；绑定随窗口打开而启用，关闭后暂停，重新打开时恢复。`updateTitle()` 会将标题更新交给玩家线程，普通 `bind` 回调本身并不会自动切换线程。

**示例共用的物品命名方法**

```java
private static ItemStack named(Material material, String name) {
    ItemStack stack = new ItemStack(material);
    stack.setData(DataComponentTypes.CUSTOM_NAME,
            Component.text(name).decoration(TextDecoration.ITALIC, false));
    return stack;
}
```

这里使用 Paper 的 `DataComponentTypes` 和 Adventure 的 `Component`、`TextDecoration`，与[物品渲染](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/item/render.md)中的写法相同。

**下一步**：[视觉映射](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal-ui/visual.md) — 通过 Signal 切换商品的视觉标记。
