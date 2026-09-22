# 动画

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/visual/animation>

动画在一段时间内按帧改变格子的显示，播完后恢复原来的样子。它和 [视觉映射](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/visual/layers.md) 一样只改变显示，不改动格子里的真实物品，也不影响点击。

## 播放动画

`visual().play(definition)` 播放一段动画。动画可以播在 Pane、容器或窗口上，显示范围取决于播放动画的对象：

| 播放对象 | 写法 | 槽位编号 | 可见范围 |
| - | - | - | - |
| Pane | `pane.visual().play(...)` | Pane 的格子序号 | 所有显示这块 Pane 的窗口 |
| 容器 | `inventory.visual().play(...)` | 容器的格子序号 | 所有显示这个容器的窗口 |
| 窗口 | `window.visual().play(...)` | 窗口的格子序号 | 只有这个窗口的查看者 |

下面的宝箱打开后，奖励先被灰色玻璃板盖住，再从左到右逐个露出：

```java
public static void openChest(Player viewer, VirtualInventory rewards) {
    Pane pane = Pane.builder(
                    "#########",
                    "#RRRRRRR#",
                    "#########"
            )
            .addIngredient('R', rewards)
            .setFrozen(true)
            .build();

    Window.builder(pane)
            .setTitle("宝箱")
            // 窗口打开后再播放, 玩家能看到完整的过程
            .addOpenHandler(window -> pane.visual().play(
                    // R 的 7 格先盖上灰色玻璃板, 每隔 4 tick 从左到右露出一格
                    AnimationDefinition.reveal(pane.slots("R"), 4, glass(Material.GRAY_STAINED_GLASS_PANE))
            ))
            .open(viewer);
}
```

**glass() 的实现**

```java
private static ItemStack glass(Material material) {
    ItemStack stack = new ItemStack(material);
    // 名称留空, 只作为装饰
    stack.setData(DataComponentTypes.CUSTOM_NAME, Component.empty());
    return stack;
}
```

`pane.slots("R")` 按从左到右、从上到下的顺序取出模板中 `R` 的格子。时间以 tick 为单位，服务器保持 20 TPS 时，20 tick 约为 1 秒。

动画开始后按服务器的 tick 推进，没有人看着也不会暂停。在窗口的打开处理器中播放，玩家能看到完整的过程；在打开之前就播放的话，前面一部分可能在窗口出现之前就播完了。

动画盖在它所在位置的视觉映射之上，播完后露出原来的显示。它只改变显示：上例冻结了 Pane，玩家在奖励露出之前拿不走它们；不冻结的话，被盖住的物品照样可以取出。

## 内置动画

`AnimationDefinition` 提供四种常用的动画：

| 方法 | 效果 | 总时长 |
| - | - | - |
| `frames(slots, period, frames)` | 所有格子同时播放一串帧 | 帧数 × 周期 |
| `loop(slots, period, frames)` | 所有格子同时循环播放一串帧 | 不会自己结束 |
| `reveal(order, stagger, cover)` | 格子先被盖住，再按顺序逐个露出 | 间隔 × (格数 − 1) |
| `staggeredFrames(order, stagger, period, frames, cover)` | 按顺序错开开始时间，每格各播一遍帧 | 间隔 × (格数 − 1) + 帧数 × 周期 |

`period` 是每帧持续的 tick 数，必须是正数；`stagger` 是相邻两格开始时间相隔的 tick 数，`reveal` 要求它是正数，`staggeredFrames` 允许为 0。参数不合法或帧列表为空时抛出 `IllegalArgumentException`。帧列表中的物品在创建动画时复制，之后修改原物品不影响动画。

动画描述不可变，可以做成常量反复播放，也可以同时在几处播放，每次播放互不影响。

### 同时播放：frames

`frames` 让所有格子同时换帧，最后一帧播完后结束。下面的奖励格在领取时闪烁两次：

```java
private static final List<ItemStack> FLASH = List.of(
        glass(Material.LIME_STAINED_GLASS_PANE),
        glass(Material.WHITE_STAINED_GLASS_PANE),
        glass(Material.LIME_STAINED_GLASS_PANE),
        glass(Material.WHITE_STAINED_GLASS_PANE)
);

// R 的每一格同时闪烁, 每帧 3 tick, 4 帧共 12 tick
pane.visual().play(AnimationDefinition.frames(pane.slots("R"), 3, FLASH));
```

### 循环播放：loop

`loop` 与 `frames` 相同，但播完最后一帧后回到第一帧，不会自己结束。下面的边框循环切换七种颜色：

```java
private static final List<ItemStack> RAINBOW = List.of(
        glass(Material.RED_STAINED_GLASS_PANE),
        glass(Material.ORANGE_STAINED_GLASS_PANE),
        glass(Material.YELLOW_STAINED_GLASS_PANE),
        glass(Material.LIME_STAINED_GLASS_PANE),
        glass(Material.LIGHT_BLUE_STAINED_GLASS_PANE),
        glass(Material.BLUE_STAINED_GLASS_PANE),
        glass(Material.PURPLE_STAINED_GLASS_PANE)
);

// 边框的 # 每 4 tick 换一种颜色, 七种颜色循环, 不会自己结束
AnimationHandle border = pane.visual().play(AnimationDefinition.loop(pane.slots("#"), 4, RAINBOW));
```

`#` 没有绑定内容，同样可以用 `pane.slots("#")` 取出它的格子。循环动画要保留 `play` 返回的句柄，不需要时调用 `cancel()` 停止，看 [播放句柄](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/visual/animation.md#播放句柄)。

### 逐格露出：reveal

`reveal` 先用 `cover` 盖住所有格子，再按顺序每隔 `stagger` tick 露出一格，效果看本页开头的预览。第 1 格在开始时立即露出，第 n 格在 `stagger × (n − 1)` tick 时露出，最后一格露出时动画结束。

`cover` 传入 `null` 时不盖住任何格子，动画只剩一段计时，可以配合 [播放句柄](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/visual/animation.md#播放句柄) 在一段时间后执行代码。

### 错开播放：staggeredFrames

`staggeredFrames` 按顺序错开每一格的开始时间：还没轮到的格子显示 `cover`，轮到后播放一遍帧，播完露出原来的内容。下面按列逐格点亮整个窗口：

```java
private static final List<ItemStack> SPARK = List.of(
        glass(Material.WHITE_STAINED_GLASS_PANE),
        glass(Material.YELLOW_STAINED_GLASS_PANE),
        glass(Material.ORANGE_STAINED_GLASS_PANE),
        glass(Material.RED_STAINED_GLASS_PANE)
);

// 按列排列全部格子: 每列从上到下, 列从左到右
SlotSequence order = SlotSequence.all(pane.size()).transform(SlotPatterns.COLUMN_MAJOR);
// 每格比前一格晚 2 tick 开始, 开始前显示黑色玻璃板, 开始后每 tick 换一帧, 播完露出原来的内容
pane.visual().play(AnimationDefinition.staggeredFrames(order, 2, 1, SPARK, glass(Material.BLACK_STAINED_GLASS_PANE)));
```

`stagger` 必须是 `period` 的整数倍，否则抛出 `IllegalArgumentException`。`stagger` 为 0 时所有格子同时开始。

## 自定义帧函数

内置动画不能表达的效果，用 `AnimationDefinition.of` 自己计算每一格的帧。帧函数收到这一格在动画中的次序 `orderIndex`、格子序号 `slot`、已经播放的 tick 数 `elapsedTicks` 和这一格当前的物品 `actual`，返回这一刻要显示的 `ItemProvider`，返回 `null` 表示这一格露出原来的内容。下面是一条 45 tick 填满的进度条：

```java
// 帧提前建好, 每次调用直接返回同一个实例
private static final ImmediateItemProvider FILLED = ItemProvider.constant(glass(Material.LIME_STAINED_GLASS_PANE));
private static final ImmediateItemProvider UNFILLED = ItemProvider.constant(glass(Material.GRAY_STAINED_GLASS_PANE));

int[] bar = pane.slots("P").toArray();
// 进度条: 每 5 tick 多填满一格, 9 格在 45 tick 后结束
pane.visual().play(AnimationDefinition.of(bar, 5, 45,
        (orderIndex, slot, elapsedTicks, actual) -> orderIndex <= elapsedTicks / 5 ? FILLED : UNFILLED));
```

`of` 的第二、三个参数是换帧周期和总时长，总时长为负数时动画不会自己结束。帧只在周期到达时刷新。

> **注意：帧函数只根据参数计算**
>
> 同一个 tick 中帧函数可能被调用多次，也可能一次都不调用，所以不能靠调用次数推进状态，也不要在里面播放音效或发送消息。需要随动画变化的数据提前算好，帧函数只按 `elapsedTicks` 查表。`actual` 只能读取。帧函数在渲染时调用，要尽快返回，帧物品像上例一样提前建好。

## 选择格子与顺序

格子数组的顺序就是播放顺序，对应帧函数收到的 `orderIndex`。`frames`、`loop`、`reveal`、`staggeredFrames` 也接受 `SlotSequence`，`of` 需要用 `toArray()` 转成数组。

常用的取法：

- `pane.slots("R")`：模板中某个标志符的格子，从左到右、从上到下
- `pane.slots(SlotPatterns.COLUMN_MAJOR, "R")`：同上，改为按列排列
- `SlotSequence.all`、`row`、`column`、`borders`、`rectangle`：按形状选取，看 [程序化布局](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/pane/programmatic.md)
- `int[]`：直接写出格子序号，按写出的顺序播放

下面先露出棋盘格中的一半，再露出另一半：

```java
SlotSequence all = SlotSequence.all(pane.size());
// 先露出棋盘格中的一半, 再露出另一半
SlotSequence order = SlotSequence.concat(
        all.transform(SlotPatterns.CHECKERBOARD_EVEN),
        all.transform(SlotPatterns.CHECKERBOARD_ODD)
);
pane.visual().play(AnimationDefinition.reveal(order, 1, glass(Material.GRAY_STAINED_GLASS_PANE)));
```

格子序号超出播放对象的范围时，`play` 抛出 `IndexOutOfBoundsException`；同一格出现两次时抛出 `IllegalArgumentException`。格子列表为空的动画立即结束。

## 播放句柄

`play` 返回 `AnimationHandle`。`cancel()` 立即停止动画，被盖住的格子马上恢复；`whenFinished` 注册结束回调，收到结束的原因：

| 原因 | 什么时候 |
| - | - |
| `COMPLETED` | 总时长走完，自然结束 |
| `CANCELLED` | 调用了 `cancel()` |
| `WINDOW_CLOSED` | 动画播在窗口上，窗口关闭 |

```java
AnimationHandle opening = pane.visual().play(
        AnimationDefinition.reveal(pane.slots("R"), 4, glass(Material.GRAY_STAINED_GLASS_PANE)));
opening.whenFinished(reason -> {
    // 只在自然播完时提示, 被取消时不提示
    if (reason == AnimationHandle.FinishReason.COMPLETED) {
        viewer.sendMessage(Component.text("宝箱已打开。", NamedTextColor.GREEN));
    }
});
```

每次注册的回调恰好收到一次；注册时动画已经结束的话，立即在当前线程回调。回调可能在任意线程执行：自然结束时在计时的线程，取消时在调用 `cancel()` 的线程，所以回调里只使用线程安全的操作。

动画的开始时刻会对齐到周期的节拍，周期相同的动画同时换帧，代价是第一帧最多比其他帧短一个周期。

> **注意：播在 Pane 或容器上的动画不随窗口关闭而结束**
>
> 只有播在窗口上的动画会在窗口关闭时结束。播在 Pane 或容器上的动画在窗口关闭后继续播放，`loop` 永远不会自己结束。
>
> 每次打开时新建的 Pane，如果关闭窗口后没有其他引用，就可以被回收；动画也随之消失，但不会调用 `whenFinished` 的回调。多名玩家共用的 Pane、长期存在的容器上播放的动画，在不需要时自己取消：
>
> ```java
> AnimationHandle border = pane.visual().play(AnimationDefinition.loop(pane.slots("#"), 4, RAINBOW));
>
> Window.builder(pane)
>         .setTitle("宝箱")
>         // 动画播在 Pane 上, 不随窗口关闭而结束, 关闭时取消
>         .addCloseHandler((window, reason) -> border.cancel())
>         .open(viewer);
> ```

## 多个动画叠加

同一处可以同时播放多个动画。后开始的盖在上面；它在某一格返回 `null` 时，露出更早开始的动画。下面先让整个窗口循环闪烁，再在上面逐列点亮，每格点亮后露出下面仍在闪烁的那一层：

```java
private static final List<ItemStack> BLINK = List.of(
        glass(Material.LIME_STAINED_GLASS_PANE),
        glass(Material.GREEN_STAINED_GLASS_PANE)
);

SlotSequence all = SlotSequence.all(pane.size());
// 先开始的在下面: 全部格子循环闪烁
pane.visual().play(AnimationDefinition.loop(all, 5, BLINK));
// 后开始的在上面: 逐列点亮, 每格播完就露出下面还在闪烁的那一层
pane.visual().play(AnimationDefinition.staggeredFrames(
        all.transform(SlotPatterns.COLUMN_MAJOR), 2, 1, SPARK, glass(Material.BLACK_STAINED_GLASS_PANE)));
```

播在不同地方的动画按 [视觉映射](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/visual/layers.md#显示是怎样叠出来的) 的顺序叠加：窗口上的动画盖住 Pane 上的，Pane 上的盖住容器上的。

## 标题动画

`window.playTitleAnimation` 播放标题动画，同样返回 `AnimationHandle`。下面在奖励逐个露出期间，标题显示「开启中」和跳动的省略号：

```java
private static final TitleAnimationDefinition OPENING_TITLE = TitleAnimationDefinition.loop(10, List.of(
        Component.text("开启中"),
        Component.text("开启中."),
        Component.text("开启中.."),
        Component.text("开启中...")
));

// 这里每隔 10 tick 露出一格, 便于观察标题换帧
AnimationHandle opening = pane.visual().play(
        AnimationDefinition.reveal(pane.slots("R"), 10, glass(Material.GRAY_STAINED_GLASS_PANE)));

// 标题每 10 tick 换一帧, 循环播放
AnimationHandle title = window.playTitleAnimation(OPENING_TITLE);
// 奖励全部露出后停止, 标题恢复成 setTitle 设置的内容
opening.whenFinished(reason -> title.cancel());
```

点击播放后，标题每 10 tick 换一帧；第 60 tick，七个奖励全部露出，标题恢复为「宝箱」。点击「停止」也会恢复原来的标题。

`TitleAnimationDefinition` 与格子动画的写法对应：`frames(period, frames)` 播完一遍后结束，`loop(period, frames)` 循环播放，`of(period, total, elapsedTicks -> ...)` 自己计算每一刻的标题，返回 `null` 时显示原来的标题。

播放期间，动画的帧盖住 `setTitle` 或 `setTitleSupplier` 设置的标题，播完后恢复。同一个窗口中播放多个标题动画时，后开始的在上面。窗口关闭时，标题动画以 `WINDOW_CLOSED` 结束。

> **注意：标题每变一次都要重新发送整个窗口**
>
> 客户端不能直接修改已经打开的窗口标题。标题每变化一次，Sparrow UI 都要重新打开这个窗口，并把所有格子的内容重新发给客户端。窗口里的物品越多，开销越大。周期不要太短，也不要长时间循环播放。

**下一步**：[为什么需要 Signal](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/why.md) — 用 Signal 描述数据，让菜单在数据变化时自动更新。
