# 物品显示

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal-ui/item>

属性加点菜单里有一个「力量」按钮，名字写着当前等级和剩余技能点。玩家每点一次，力量加一级，技能点少一点，按钮名字跟着变；技能点用完后，再点也没反应。

按钮的外观取决于两个 Signal。点击后得有人告诉菜单去重新显示这个格子，还要确保只刷新这一格。

## dependsOn 做什么

`Item.builder().dependsOn(signals...)` 声明这个物品的外观依赖哪些 Signal。其中任何一个发出通知，显示这个物品的格子就会在下一 tick 重新执行 Provider，取得新的外观。

订阅由 Sparrow UI 管理。物品显示在窗口里时自动订阅，窗口关闭时自动退订，不用自己保存 `Subscription`。

## 属性加点按钮

逐步执行，看按钮名字怎样随点击变化。

```java
MutableSignal<Integer> strength = Signal.of(1);
MutableSignal<Integer> points = Signal.of(2);  // 剩余技能点

Item strengthButton = Item.builder()
        .dependsOn(strength, points)  // 外观取决于这两个 Signal
        .setItemProvider(context -> {
            String name = "力量 Lv." + strength.get() + "（剩余 " + points.get() + " 点）";
            return named(Material.DIAMOND_SWORD, name);
        })
        .addClickGuard((item, click) -> points.get() > 0)  // 没有技能点就不响应
        .addClickHandler(click -> {
            points.update(value -> value - 1);
            strength.update(value -> value + 1);
        })
        .build();

Pane pane = Pane.builder("####S####")
        .addIngredient('S', strengthButton)
        .build();
Window.builder(pane).setTitle("属性加点").open(viewer);
```

1. **第 1-2 行**：力量 1 级，还有 2 点技能点。
2. **第 4-15 行**：按钮声明依赖 strength 和 points。守卫在没有技能点时拦下点击。
3. **第 17-20 行**：打开窗口，Provider 执行一次，显示初始名字。
4. **第 11-14 行**：玩家点了一下。两个 Signal 都变了，但同一 tick 里的多次通知只会让这一格重新显示一次。
5. **第 11-14 行**：再点一下，技能点用完。
6. **第 10 行**：第三次点击被守卫拦下，处理器不执行，数据不变，按钮也不刷新。

点击处理器只修改数据，不需要调用 `updateOnClick()`。刷新哪个格子，由 `dependsOn` 的依赖关系决定。

## 注意事项

> **注意：只在 Provider 里读取不会建立依赖**
>
> Provider 里调用 `strength.get()` 只是读一次值。忘了写 `dependsOn(strength)`，数据变了按钮也不会刷新。外观取决于几个 Signal，就把它们都传给 `dependsOn`；已经用 [combine](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/derive/combine.md) 组合好的，依赖组合结果就行。

> **注意：点击守卫要和外观读同一份数据**
>
> 按钮看起来能点，守卫却拦下，或者反过来，玩家会困惑。让守卫和 Provider 读取同一个 Signal，两边的判断就不会对不上。

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

**下一步**：[玩家与分区显示](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal-ui/player.md) — 多个窗口共用一个按钮，各自显示查看者自己的数据。
