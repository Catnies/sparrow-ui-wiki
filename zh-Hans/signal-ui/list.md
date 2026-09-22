# 列表内容

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal-ui/list>

管理员上架钻石时，已打开的目录应多出一个物品。此时变化的是一组格子的内容，用 `addIngredient` 绑定列表就行。

示例中的 `viewer` 是查看菜单的玩家。请先完成 Sparrow UI 初始化；`named` 是创建带名称物品的辅助方法，实现在页尾。

## 商品增删后，重新填充格子

下面初始只有苹果和面包，九个 `M` 从左到右接收列表中的商品。点击右下角的钻石按钮可以模拟上架，最多添加到九组。

```text title="商品目录"
AB#######
########D
```

- `A`：苹果（`apple`）
- `B`：面包（`bread`）
- `D`：上架一组钻石（`diamond`）

预览为初始内容：第一行只有苹果和面包，右下角是上架按钮。

```java
ListSignal<Material> products = ListSignal.of();
products.addAll(List.of(Material.APPLE, Material.BREAD));

Pane pane = Pane.builder("MMMMMMMMM", "########A")
        .addIngredient('M', products,
                material -> Element.item(Item.simple(new ItemStack(material))))
        .addIngredient('A', Item.builder()
                .setItemProviderConstant(named(Material.DIAMOND, "上架一组钻石"))
                .addClickGuard((item, click) -> products.size() < 9)
                .addClickHandler(click -> products.add(Material.DIAMOND))
                .build())
        .build();
Window.builder(pane).setTitle("商品目录").open(viewer);
```

首次显示时，第一、二格分别是苹果和面包，后面为空。点击上架按钮后，第三格出现钻石。删除列表第一项时，后面的商品向前补位，末尾空出来的格子会清空。

`toElement` 把一条业务数据转换成放进格子的 `Element`，不能返回 `null`。默认首次转换在 `build()` 的调用线程执行，后续更新在 Paper 全局异步调度器执行；转换函数应只处理准备好的数据。列表超出九项时，只能显示前九项，更多内容应使用分页或滚动。

若业务已提供合适的 `Executor`，也可以将它作为第四个参数传给 `addIngredient('M', products, toElement, executor)`。它决定后续转换在哪个执行器上运行，首次仍在构建线程完成。异步查询结果只要是 `Signal<List<T>>`，也能使用相同入口。

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

**下一步**：[分页与筛选](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal-ui/page.md) — 让分页内容、箭头和页码一起跟随数据更新。
