# 标签选中态

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal-ui/tab>

分类菜单既要切换内容，也要标出当前选中的分类。`Tab.selected()` 提供选中 key 的 Signal，按钮依赖它就能改变名称。

示例中的 `viewer` 是查看菜单的玩家。请先完成 Sparrow UI 初始化；`named` 是创建带名称物品的辅助方法，实现在页尾。

## 切换分类与更新按钮

下面食品分类显示苹果，材料分类显示钻石，中间的 `C` 放当前子 Pane。初始选中食品，点击材料后，中间变为钻石，右侧按钮名称加上「已选」。

```text title="选择分类"
F###C###M
```

- `F`：食品分类（`apple`）
- `C`：当前分类内容（`apple`）
- `M`：材料分类（`diamond`）

初始选中食品，中间显示苹果。切换材料后，中间显示钻石，材料按钮名称标注已选。

```java
Pane food = Pane.builder("X")
        .addIngredient('X', Item.simple(new ItemStack(Material.APPLE))).build();
Pane material = Pane.builder("X")
        .addIngredient('X', Item.simple(new ItemStack(Material.DIAMOND))).build();
Tab<String> tabs = Tab.of(Map.of("food", food, "material", material), "food");

Item foodButton = Item.builder()
        .dependsOn(tabs.selected())
        .setItemProvider(context -> named(Material.APPLE,
                tabs.selected().get().equals("food") ? "食品（已选）" : "食品"))
        .addClickHandler(click -> tabs.select("food"))
        .build();
Item materialButton = Item.builder()
        .dependsOn(tabs.selected())
        .setItemProvider(context -> named(Material.DIAMOND,
                tabs.selected().get().equals("material") ? "材料（已选）" : "材料"))
        .addClickHandler(click -> tabs.select("material"))
        .build();
Pane pane = Pane.builder("F###C###M")
        .addIngredient('F', foodButton)
        .addIngredient('C', tabs)
        .addIngredient('M', materialButton)
        .build();
Window.builder(pane).setTitle("选择分类").open(viewer);
```

内容区通过 `addIngredient('C', tabs)` 跟随选中项，两个分类按钮则各自依赖 `selected()`。使用 `Tab.lazy` 时也采用这套绑定方式。

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

**下一步**：[窗口标题](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal-ui/title.md) — 数量变化时自动更新窗口标题。
