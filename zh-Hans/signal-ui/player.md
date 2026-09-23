# 玩家与分区显示

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal-ui/player>

小游戏大厅里有一个「准备」按钮。Alice 点了之后，她看到的按钮变成「已准备」，Bob 看到的还是「点击准备」。

每次打开菜单都新建一个按钮、捕获当时的 `viewer`，能做到，但按钮就没法在多个窗口之间共用了。想共用同一个按钮，它就得在渲染时知道「现在是谁在看」。

## 按查看者绑定分区做什么

`dependsOn(signal, keyOf)` 接收一个 [KeyedSignal](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/keyed/basics.md) 和一个取 key 的函数。函数收到当前显示位置的渲染上下文，返回这个位置要绑定的分区 key。

按玩家分区时，取 `context.player().getUniqueId()`，每个查看者就绑定自己的分区。Alice 的分区变化，只有 Alice 看到的按钮刷新。

## 共用的准备按钮

`ready` 按玩家 UUID 保存准备状态，见 [玩家分区](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/keyed/player.md)。演示里上一行是 Alice 看到的按钮，下一行是 Bob 看到的，它们是同一个 `readyButton`。

```java
MutableKeyedSignal<UUID, Boolean> ready = KeyedSignal.of(playerId -> false);
Signals.evictOnQuit(ready);

// 按钮只创建一次，放进每名玩家打开的大厅菜单
Item readyButton = Item.builder()
        .dependsOn(ready, context -> context.player().getUniqueId())
        .setItemProvider(context -> {
            boolean isReady = ready.get(context.player().getUniqueId());
            return isReady
                    ? named(Material.LIME_DYE, "已准备")
                    : named(Material.GRAY_DYE, "点击准备");
        })
        .addClickHandler(click -> {
            ready.update(click.player().getUniqueId(), value -> !value);
        })
        .build();

Pane pane = Pane.builder("####R####")
        .addIngredient('R', readyButton)
        .build();
Window.builder(pane).setTitle("小游戏大厅").open(viewer);
```

1. **第 1-2 行**：每名玩家的准备状态默认是 false，退出时自动清理。
2. **第 5-16 行**：按钮用渲染上下文里的查看者 UUID 选择分区，Provider 也用它读取。
3. **第 18-21 行**：Alice 和 Bob 各自打开大厅。同一个按钮在两扇窗口里分别绑定了两人的分区。
4. **第 13-15 行**：Alice 点击，只更新她自己的分区，只有她看到的按钮刷新。
5. **第 13-15 行**：Bob 也点了准备。
6. **第 13-15 行**：Alice 取消准备，Bob 不受影响。

## 按业务 key 绑定

key 不一定来自玩家。竞技场入口按钮显示沙漠竞技场的人数，所有查看者都绑定同一个分区 `"desert"`。

```java
MutableKeyedSignal<String, Integer> arenaPlayers = KeyedSignal.of(arena -> 0);

Item desertButton = Item.builder()
        .dependsOn(arenaPlayers, context -> "desert")  // 所有查看者都绑定 desert 分区
        .setItemProvider(context -> {
            String name = "沙漠竞技场：" + arenaPlayers.get("desert") + " 人";
            return named(Material.SAND, name);
        })
        .build();
```

业务代码调用 `arenaPlayers.update("desert", count -> count + 1)` 后，所有看着这个按钮的人都会看到新人数；森林竞技场的变化不会惊动它。

## 注意事项

> **注意：不要捕获创建菜单时的 viewer**
>
> 共用的 Provider 和点击处理器里，查看者用 `context.player()`，点击者用 `click.player()`。捕获创建菜单时的某个 `viewer`，所有人看到的都会是那个人的数据。

> **注意：keyOf 在挂载时求值**
>
> 取 key 的函数在物品挂到格子上时执行一次。玩家中途换了队伍，函数现在会返回别的 key，但已经挂上的格子不会自动改绑。需要跟着选择切换来源时，用 [switching](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/derive/switching.md)。

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

**下一步**：[列表内容](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal-ui/list.md) — 把会增减的列表映射到一组格子上。
