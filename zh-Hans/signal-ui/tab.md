# 标签选中态

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal-ui/tab>

技能菜单左右各有一个职业标签，战士和法师，中间显示当前职业的技能。玩家切到法师，中间要换成法师的技能，法师标签前面也要加上「▶」，表示正在看它。

[标签 Tab](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/pagination/tab.md) 负责切换中间的内容，但两个标签按钮不知道现在选中的是谁，外观一直不变。

## Tab.selected() 做什么

`Tab.selected()` 是当前选中 key 的 Signal。标签按钮依赖它，切换标签时就会刷新；按钮自己比较一下 `selected().get()` 是不是自己的 key，决定显示成什么样子。

中间的内容区通过 `addIngredient(identifier, tabs)` 跟随选中项，不需要额外绑定。

## 职业标签

```java
Pane warrior = Pane.builder("S")
        .addIngredient('S', Item.simple(named(Material.DIAMOND_SWORD, "旋风斩")))
        .build();
Pane mage = Pane.builder("S")
        .addIngredient('S', Item.simple(named(Material.BLAZE_POWDER, "火球术")))
        .build();
Tab<String> tabs = Tab.of(Map.of("warrior", warrior, "mage", mage), "warrior");

Item warriorButton = Item.builder()
        .dependsOn(tabs.selected())
        .setItemProvider(context -> {
            boolean selected = tabs.selected().get().equals("warrior");
            return named(Material.DIAMOND_SWORD, selected ? "▶ 战士" : "战士");
        })
        .addClickHandler(click -> tabs.select("warrior"))
        .build();
Item mageButton = Item.builder()
        .dependsOn(tabs.selected())
        .setItemProvider(context -> {
            boolean selected = tabs.selected().get().equals("mage");
            return named(Material.BLAZE_POWDER, selected ? "▶ 法师" : "法师");
        })
        .addClickHandler(click -> tabs.select("mage"))
        .build();

Pane pane = Pane.builder("W###C###M")
        .addIngredient('W', warriorButton)
        .addIngredient('C', tabs)  // 内容区跟随选中的标签
        .addIngredient('M', mageButton)
        .build();
Window.builder(pane).setTitle("技能").open(viewer);
```

1. **第 1-7 行**：两个职业各有一个子 Pane，默认选中战士。
2. **第 9-24 行**：两个按钮都依赖 selected()，各自判断选中的是不是自己。
3. **第 26-31 行**：打开菜单，中间是战士的旋风斩。
4. **第 23 行**：点法师标签。中间换成火球术，两个按钮的名字一起刷新。
5. **第 23 行**：再点一次法师，选中项没变，什么都不刷新。
6. **第 15 行**：切回战士。

使用 `Tab.lazy` 延迟创建子 Pane 时，也是这套绑定方式。

## 注意事项

> **注意：选中态属于这个 Tab**
>
> 选中的标签保存在 `Tab` 对象里。每名玩家要有自己的 `Tab` 才能独立切换；各个职业的子 Pane 可以共用。

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

**下一步**：[窗口标题](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal-ui/title.md) — 数据变化时自动更新窗口标题。
