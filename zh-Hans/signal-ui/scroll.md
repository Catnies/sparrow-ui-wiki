# 滚动内容

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal-ui/scroll>

成就菜单用三列显示已解锁的成就，一次只看得到两行。玩家往下滚动时，按钮上要显示现在滚到了第几行；滚到底以后，按钮不再响应。

成就还会随时解锁新的。列表变长了，能滚动的范围也要跟着变大。

## Scroll 的 Signal 做什么

`Scroll.vertical(list, width, rows)` 可以直接接收 `ListSignal`，列表变化时，可见内容和可滚动范围一起更新。

它提供两个 Signal。`line()` 是当前停在第几行，从 0 开始；`maxLine()` 是最多能滚到第几行，内容不足一屏时为 0。按钮依赖它们，滚动或列表变化时就会刷新。

## 成就列表

```java
MutableListSignal<String> achievements = ListSignal.of();
achievements.addAll(List.of(
        "初次挖矿", "获得铁锭", "钻石！", "附魔师", "下界之旅", "烈焰人猎手",
        "末影之眼", "进入末地", "屠龙前夜", "信标", "海底神殿", "满级附魔"
));
Scroll<String> scroll = Scroll.vertical(achievements, 3, 2);  // 3 列，一次显示 2 行

Item down = Item.builder()
        .dependsOn(scroll.line(), scroll.maxLine())
        .setItemProvider(context -> {
            String text = "向下滚动（第 " + (scroll.line().get() + 1) + " 行）";
            return named(Material.ARROW, text);
        })
        .addClickGuard((item, click) -> scroll.line().get() < scroll.maxLine().get())
        .addClickHandler(click -> scroll.advance(1))
        .build();

Pane pane = Pane.builder("###MMM###", "###MMM###", "########D")
        .addIngredient('M', scroll, name ->
                Element.item(Item.simple(named(Material.GOLD_INGOT, name)))
        )
        .addIngredient('D', down)
        .build();
Window.builder(pane).setTitle("成就").open(viewer);

achievements.add("屠龙者");  // 列表变长，可以多滚一行
```

1. **第 1-6 行**：十二个成就排成四行，一次显示两行，最多滚到第 2 行（从 0 数）。
2. **第 18-24 行**：打开菜单，显示前六个成就。
3. **第 14-15 行**：向下滚一行，显示第 4 到第 9 个成就。相邻两屏是重叠的，一次只换一行。
4. **第 14-15 行**：滚到底了。
5. **第 14 行**：再点被守卫拦下，位置不变。
6. **第 26 行**：解锁了新成就。列表变成五行，maxLine 变成 3，按钮又能继续往下滚了。

需要上下两个按钮时，向上按钮用 `scroll.advance(-1)`，守卫写成 `scroll.line().get() > 0`。

## 注意事项

> **注意：滚动位置属于这个 Scroll**
>
> 和 `Page` 一样，当前行保存在 `Scroll` 对象里。每名玩家要有自己的 `Scroll` 才能独立滚动，底层的成就列表可以共用。

> **注意：列表缩短时位置会回退**
>
> 列表变短、可滚动的范围变小时，当前行会自动落回 `[0, maxLine]` 之内。内容不足一屏时，哪边都滚不动。

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

**下一步**：[标签选中态](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal-ui/tab.md) — 切换标签内容，同时标出当前选中的标签。
