# 玩家与分区显示

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal-ui/player>

Alice 在商店选择购买两件，Bob 仍选择一件，两人可以共用同一个 Item。区别在于这次依赖的是玩家分区，Provider 要读取当前查看者的值，点击时也更新点击者的分区。

示例共用的 `named` 辅助方法见页尾。

## 共用按钮，各自显示玩家的数据

下面的 `quantities` 和 `amountButton` 可以在商店服务中创建一次，让多个窗口复用。每次打开菜单时，把这个按钮放进对应 Pane 就行。

```text title="选择数量"
####Q####
```

- `Q`：当前玩家的数量（`diamond`）

Alice 和 Bob 初次打开时都显示 1。Alice 点击一次后，她的按钮名称显示 2，Bob 仍显示 1。

```java
MutablePlayerKeyedSignal<Integer> quantities = PlayerKeyedSignal.of(uuid -> 1);
Item amountButton = Item.builder()
        .dependsOn(quantities)
        .setItemProvider(context -> named(Material.DIAMOND,
                "购买数量：" + quantities.get(context.player())))
        .addClickHandler(click -> quantities.update(click.player(), value -> value + 1))
        .build();

Pane pane = Pane.builder("####Q####")
        .addIngredient('Q', amountButton)
        .build();
Window.builder(pane).setTitle("选择数量").open(viewer);
```

`dependsOn(PlayerKeyedSignal)` 会按每个查看者的 UUID 绑定分区。Alice 改变数量时，只通知使用她的分区的显示位置，Bob 的按钮仍读取一件。不要在共用 Provider 里捕获创建菜单时的某个 `viewer`，应使用 `context.player()`。

### 按其他业务 key 绑定

若一个共用按钮显示的是钻石库存，可以使用 `KeyedSignal` 的重载。这里 `stock` 是商店持有的库存来源，演示初始库存为十件；所有查看者都绑定商品编号 `"diamond"`。

```java
MutableKeyedSignal<String, Integer> stock = KeyedSignal.of(productId -> 10);
Item stockButton = Item.builder()
        .dependsOn(stock, player -> "diamond")
        .setItemProvider(context -> named(Material.DIAMOND,
                "剩余库存：" + stock.get("diamond")))
        .build();
```

将 `stockButton` 放进 Pane 后，业务代码调用 `stock.set("diamond", 9)`，所有查看它的人都会看到新库存。`keyOf` 也可以根据玩家计算队伍编号等业务 key，但它在挂载时求值；玩家中途切换队伍，不会仅因函数的返回值变了就自动重新绑定。需要动态切换来源时，可以使用 [`switching`](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/derive.md)。

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

**下一步**：[列表内容](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal-ui/list.md) — 把不断增删的商品列表映射到菜单格子。
