# 窗口布局

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/window/layout>

窗口上方是容器，下方是玩家物品栏。下方固定有三行主背包和一行快捷栏，共 36 格。可以只安排上方的菜单，也可以把下方一起用来放菜单内容。

| 创建方式 | 上部区域 | 下部区域 |
| - | - | - |
| `Window.builder(upper)` | 提供的 `upper` | 自动连接查看者的真实背包 |
| `Window.splitBuilder(upper, lower)` | 提供的 `upper` | 提供的 `lower` |
| `Window.mergedBuilder(pane)` | `pane` 的前面几行 | 同一块 `pane` 的最后 4 行 |

这三种写法都打开箱子界面，区别在于上下两部分由哪些 Pane 提供内容。箱子的行数只计算上部，下方的玩家物品栏单独保留。

## 普通布局：保留玩家物品栏

`Window.builder(upper)` 只需要提供上部 Pane，下方自动连接查看者的真实背包。下面的模板对应一个三行箱子：

```java
Pane upper = Pane.builder(
                "#########",
                "####B####",
                "########X"
        )
        .addIngredient('B', Item.simple(new ItemStack(Material.BOOK)))
        .addIngredient('X', Item.builder()
                .setItemProviderConstant(new ItemStack(Material.BARRIER))
                .addClickHandler(click -> click.window().close())
                .build())
        .build();

Window.builder(upper)
        .setTitle("帮助菜单")
        .open(viewer);
```

```text title="帮助菜单"
#########
####B####
########X

PPPPPPPPP
PPPPPPPPP
PPPPPPPPP
PPPPPPPPP
```

空行下面的 4 行是玩家物品栏。

- `#`：留空
- `B`：书（`book`）
- `X`：关闭按钮（`barrier`）
- `P`：玩家背包（自动映射）

玩家可以照常操作下方的背包物品。下部 Pane 的槽位从主背包开始，快捷栏排在最后，不包含盔甲槽和副手槽：

| 下部 Pane 槽位 | 对应 Bukkit 玩家背包槽位 |
| - | - |
| 0～8 | 9～17 |
| 9～17 | 18～26 |
| 18～26 | 27～35 |
| 27～35 | 0～8，即快捷栏 |

每次 `build(viewer)` 都会为这名查看者创建默认下部 Pane，连接他自己的背包。

> **注意：上部 Pane 的尺寸**
>
> 普通箱子窗口要求上部 Pane 为 9 列、1～6 行。尺寸不符合时，构建 Window 会抛出 `IllegalArgumentException`。

## 分离布局：分别安排上下区域

要在玩家物品栏的位置放菜单内容，可以用 `splitBuilder(upper, lower)` 分别指定上下 Pane。这里沿用上例的 `upper`，下方铺上灰色玻璃板，并在快捷栏最右侧放一个关闭按钮：

```java
Pane lower = Pane.builder(
                "#########",
                "#########",
                "#########",
                "########X"
        )
        .setBackground(new ItemStack(Material.GRAY_STAINED_GLASS_PANE))
        .addIngredient('X', Item.builder()
                .setItemProviderConstant(new ItemStack(Material.BARRIER))
                .addClickHandler(click -> click.window().close())
                .build())
        .build();

Window.splitBuilder(upper, lower)
        .setTitle("帮助菜单")
        .open(viewer);
```

上方的内容保持不变，下方连同快捷栏一起显示 `lower` 的内容：

```text title="帮助菜单"
#########
####B####
########X

#########
#########
#########
########X
```

空行下面的 4 行是玩家物品栏。

- `#`：留空
- `B`：书（`book`）
- `X`：关闭按钮（`barrier`）
- `G`：下部背景（lower 中的 #）（`gray_stained_glass_pane`）

上下 Pane 各自从槽位 0 开始编号，分别位于容器和主背包区域的左上角。它们也有各自的背景和冻结设置，调用 `lower.setFrozen(true)` 只会冻结下方的 36 格。

> **注意：自定义下部不会自动连接玩家背包**
>
> `lower` 必须是 9×4，这 36 格的显示和点击都由它决定。未绑定的格子留空或显示背景，玩家原有的背包物品会暂时隐藏。
>
> 图中的玻璃板只是菜单背景，玩家原有物品仍在真实背包中。要在自定义布局里显示、操作这些物品，需要连接对应的容器，看 [映射容器](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/inventory/referencing.md)。

## 合并布局：用一份模板安排上下区域

`mergedBuilder(pane)` 让一块 Pane 同时提供上下两部分的内容。模板的最后 4 行放在玩家物品栏区域，前面的行放在箱子区域。

下面用一份七行模板同时安排三行箱子和下方的玩家物品栏。两个区域共用背景，上下各放一个关闭按钮。

```java
Pane pane = Pane.builder(
                "#########",
                "####B####",
                "########X",
                "#########",
                "#########",
                "#########",
                "########X"
        )
        .setBackground(new ItemStack(Material.GRAY_STAINED_GLASS_PANE))
        .addIngredient('B', Item.simple(new ItemStack(Material.BOOK)))
        .addIngredient('X', Item.builder()
                .setItemProviderConstant(new ItemStack(Material.BARRIER))
                .addClickHandler(click -> click.window().close())
                .build())
        .build();

Window.mergedBuilder(pane)
        .setTitle("帮助菜单")
        .open(viewer);
```

```text title="帮助菜单"
#########
####B####
########X

#########
#########
#########
########X
```

空行下面的 4 行是玩家物品栏。

- `#`：背景（`gray_stained_glass_pane`）
- `B`：书（`book`）
- `X`：关闭按钮（`barrier`）

这块 Pane 的槽位连续编号：0～26 显示在箱子中，27～53 显示在主背包位置，54～62 显示在快捷栏位置。界面里的两处间隔由客户端保留，不占槽位，模板中也不用为它们留空行。

上下两部分共用这块 Pane 的背景和冻结设置。合并布局同样需要自己连接容器，才会显示玩家的真实背包。

> **注意：合并 Pane 的尺寸**
>
> 合并 Pane 必须是 9 列、5～10 行。最后 4 行分给玩家物品栏，前面的 1～6 行作为箱子区域。例如，5 行模板对应一行箱子和下方的玩家物品栏。尺寸不符合时，构建 Window 会抛出 `IllegalArgumentException`。

## 修改默认玩家物品栏

`window.lowerPane()` 可以取得默认下部 Pane。例如，冻结它后，玩家仍能看到背包物品，但无法在这个窗口中操作它们：

```java
Window window = Window.builder(upper)
        .setTitle("背包只读预览")
        .build(viewer);

window.lowerPane().setFrozen(true);
window.open();
```

调用 `window.lowerPane().setFrozen(false)` 就能恢复操作。冻结期间仍会显示真实背包的内容。

需要访问下部连接的容器时，可以调用 `window.defaultLowerInventory()`。它通过下部 Pane 的形状与第一格连接查找 `ReferencingInventory`，结构被改写后可能返回 `null`。这个容器映射玩家的真实背包，通过它修改物品会写回真实背包，具体用法看 [映射容器](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/inventory/referencing.md)。

> **注意：修改下部结构后，操作跟随实际连接**
>
> 默认下部 Pane 的内容和连接都可以修改。修改后，数字键交换的目标是当前快捷栏位置连接的容器槽位；Shift 点击转移和双击收集也按实际连接的容器及其规则处理。
>
> 通过 `ReferencingInventory` 写入真实背包时，应在能访问该玩家容器的线程执行；Pane 的冻结只限制玩家在窗口中的操作，不会阻止插件主动修改容器。

合并布局的 `lowerPane()` 返回整块合并 Pane，调用 `setFrozen(true)` 会冻结整个菜单。要单独冻结下半部分，使用分离布局。

## 冻结单个格子与副手

Pane 的冻结作用于整块 Pane。只想锁住窗口中的某几格时，用 Window 自己的冻结：

| 方法 | 作用 |
| - | - |
| `frozenAt(windowSlot, frozen)` | 冻结或解冻一个 Window 槽位 |
| `frozenAt(windowSlot)` | 查询这一格是否被窗口冻结 |
| `windowSlotAtHotbar(hotbarSlot)` | 快捷栏第 `hotbarSlot` 格（0～8）对应的 Window 槽位 |
| `offhandFrozen(frozen)`、`offhandFrozen()` | 冻结或查询副手交换 |

Window 槽位的编号与 `click.windowSlot()` 相同，先编上方容器，再编下方玩家物品栏。被冻结的格子与冻结 Pane 中的格子待遇相同：玩家的点击不生效，不派发 Bukkit 与 Sparrow 的事件，不执行 Item 的点击处理器，也不参与 Shift 点击转移和双击收集。格子的显示和刷新不受影响。

下面的菜单由玩家手中的物品打开。打开期间冻结这件物品所在的快捷栏格子，玩家就无法在菜单里拿走它或换位置：

```java
public static void openForHeldItem(Player viewer, Pane upper) {
    int heldSlot = viewer.getInventory().getHeldItemSlot();

    Window window = Window.builder(upper)
            .setTitle("编辑手中的物品")
            .build(viewer);
    // 冻结手持物品所在的快捷栏格子
    window.frozenAt(window.windowSlotAtHotbar(heldSlot), true);
    window.open();
}
```

`windowSlotAtHotbar` 按窗口的实际布局换算，上方容器有几格都不用自己计算。

副手不是 Window 槽位，`frozenAt` 和 Pane 的冻结都管不到它。物品在副手时，调用 `offhandFrozen(true)`。之后玩家在这个窗口里按副手交换键，被点的格子和副手都不会变化，也不会派发事件：

```java
window.offhandFrozen(true);
```

> **信息：窗口冻结与 Pane 冻结互相独立**
>
> `frozenAt` 与 Pane 的 `setFrozen` 任意一个生效，这一格就不能操作。`frozenAt(slot, false)` 只撤销窗口这一侧的冻结，Pane 仍然冻结时，这一格照样不能操作；`frozenAt(slot)` 也只反映窗口这一侧的设置。
>
> 这些冻结都只限制玩家在这个窗口中的操作，插件直接修改容器或副手不受影响。

冻结可以在 `build` 之后、`open` 之前设置，也可以在菜单打开期间切换。修改交给玩家的实体线程执行，刚调用完就查询时，`frozenAt(slot)` 不一定已经反映这次修改。同一个 Window 关闭后再打开，冻结设置仍然保留。槽位或快捷栏索引超出范围时抛出 `IndexOutOfBoundsException`。

**下一步**：[窗口类型](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/window/types.md) — 选择箱子、漏斗、铁砧等原版容器，并使用它们各自的功能。
