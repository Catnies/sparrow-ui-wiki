# 视觉映射

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal-ui/visual>

商品菜单的第五格原本是钻石。点击右下角的标记开关后，第五格应显示为绿宝石；再点击一次，则恢复钻石。这里只改变显示，点击第五格时仍执行原钻石按钮的处理器。

示例中的 `viewer` 是查看菜单的玩家。请先完成 Sparrow UI 初始化；`named` 是创建带名称物品的辅助方法，实现在页尾。

## 切换商品标记

下面创建一扇独立的菜单。`highlighted` 初始为 `false`，表示尚未标记商品。

```text title="商品标记"
####Q###H
```

- `Q`：商品（`diamond`）
- `H`：标记开关（`lime_dye`）

初始显示钻石。开启标记后，第五格显示名为重点商品的绿宝石。

```java
MutableSignal<Boolean> highlighted = Signal.of(false);
Pane pane = Pane.builder("####Q###H")
        .addIngredient('Q', Item.builder()
                .setItemProviderConstant(named(Material.DIAMOND, "选择钻石"))
                .addClickHandler(click -> click.player().sendMessage(Component.text("选择了钻石")))
                .build())
        .addIngredient('H', Item.builder()
                .setItemProviderConstant(named(Material.LIME_DYE, "切换商品标记"))
                .addClickHandler(click -> highlighted.update(value -> !value))
                .build())
        .build();
Window window = Window.builder(pane).setTitle("商品标记").build(viewer);

ItemStack mark = named(Material.EMERALD, "重点商品");
window.setVisualizerItem(4, actual -> highlighted.get() ? mark : actual);
window.visual().bind(highlighted);
window.open();
```

`visual().bind` 会在 Signal 变化时请求刷新视觉层，映射函数再读取当前值。槽位从零开始，`4` 对应模板里的 `Q`。显示换成绿宝石后，点击它仍会收到「选择了钻石」的消息，视觉映射不改变实际内容或点击行为。

绑定属于这一扇 Window，所以只影响它的查看者。若要让同一个 Pane 的多个查看者一起看到映射变化，可以在 Pane 的视觉层配置映射并绑定来源；各层范围看[视觉映射](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/visual/layers.md)。

窗口上的视觉绑定在打开时启用，关闭时暂停，返回的 `Subscription` 可用于提前解绑。共享 Pane 的列表绑定则可能在没有窗口查看时仍保持活动，关闭一扇窗口并不等于停止所有共享来源的查询。

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

**下一步**：[监听数据包（可选）](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/network/listen.md) — 了解额外的数据包监听能力，只编写菜单时可以跳过。
