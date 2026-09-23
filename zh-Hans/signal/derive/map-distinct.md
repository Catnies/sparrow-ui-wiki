# mapDistinct 去重

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/derive/map-distinct>

状态菜单上有一个图标，按血量显示「健康」「受伤」「濒死」三种样子。战斗中血量几乎每秒都在掉，图标却很久才换一次。

用 [map](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/derive/map.md) 派生这个状态，每掉一滴血图标就刷新一次，其中绝大多数刷新前后完全一样。

## mapDistinct 做什么

`mapDistinct` 和 `map` 一样根据原值算出新值。多出来的一步是比较，这次的结果和上次相同，就不通知下游。

默认用 `Objects.equals` 比较结果，也可以传入自己的比较函数。

## 只在状态阶段变化时刷新

血量高于 10 为健康，高于 4 为受伤，其余为濒死。点「下一步」逐行执行，看图标什么时候刷新。

```java
MutableSignal<Integer> health = Signal.of(20);
Signal<String> condition = health.mapDistinct(value ->
        value > 10 ? "健康" : value > 4 ? "受伤" : "濒死"
);

Subscription subscription = condition.onDirty(() -> {
    System.out.println("状态变为：" + condition.get());
});

health.set(16);  // 仍是健康，不打印
health.set(8);   // 打印「状态变为：受伤」
health.set(6);   // 仍是受伤，不打印
health.set(3);   // 打印「状态变为：濒死」
health.set(2);   // 仍是濒死，不打印

subscription.close();
```

1. **第 1-4 行**：满血，状态为健康。
2. **第 6-8 行**：订阅状态变化。订阅时不会补发当前值。
3. **第 10 行**：重新计算后还是健康，结果相同，图标不刷新。
4. **第 11 行**：结果变成受伤，通知下游，图标刷新。输出「状态变为：受伤」。
5. **第 12 行**：还是受伤，不通知。
6. **第 13 行**：进入濒死，图标刷新。输出「状态变为：濒死」。
7. **第 14 行**：五次写入，图标只刷新了两次。换成 map 就是五次。

## 只在进入新区块时更新

领地提示只关心玩家站在哪个区块，不关心具体坐标。方块坐标右移 4 位就是区块坐标，record 自带 `equals`，坐标相同的 `ChunkPos` 会被判为相同。

```java
record BlockPos(int x, int z) {}
record ChunkPos(int x, int z) {}

MutableSignal<BlockPos> position = Signal.of(new BlockPos(3, 3));
Signal<ChunkPos> chunk = position.mapDistinct(pos ->
        new ChunkPos(pos.x() >> 4, pos.z() >> 4)
);

Subscription subscription = chunk.onDirty(() -> {
    System.out.println("进入区块 " + chunk.get());
});

position.set(new BlockPos(9, 3));    // 还在区块 (0, 0)，不打印
position.set(new BlockPos(15, 12));  // 还在区块 (0, 0)，不打印
position.set(new BlockPos(16, 12));  // 打印「进入区块 ChunkPos[x=1, z=0]」
position.set(new BlockPos(20, -1));  // 打印「进入区块 ChunkPos[x=1, z=-1]」

subscription.close();
```

1. **第 4-7 行**：玩家在区块 (0, 0)。
2. **第 13 行**：换了坐标，区块没变。
3. **第 14 行**
4. **第 15 行**：x 到了 16，跨进区块 (1, 0)。输出「进入区块 ChunkPos\[x=1, z=0]」。
5. **第 16 行**：z 变成负数，进入区块 (1, -1)。输出「进入区块 ChunkPos\[x=1, z=-1]」。

## 自定义结果的比较方式

聊天频道名不区分大小写，首尾空格也不算数。把比较函数作为第二个参数传入。

```java
MutableSignal<String> input = Signal.of("moon");
Signal<String> channel = input.mapDistinct(String::strip, String::equalsIgnoreCase);

Subscription subscription = channel.onDirty(() -> {
    System.out.println("切换到频道：" + channel.get());
});

input.set(" MOON ");   // 去掉空格后和 moon 相同，不打印
input.set(" trade ");  // 打印「切换到频道：trade」

subscription.close();
```

输入框本身的 `input` 仍然保存着 `" MOON "`，只有派生出来的 `channel` 忽略了这次变化。

## 注意事项

> **提示：和 map 怎么选**
>
> `mapDistinct` 得先算出结果才能比较，所以有订阅者时，原值每变一次它就算一次。`map` 可以拖到读取时再算。
>
> 结果几乎每次都会变，比如血量文字、倒计时秒数，用 `map`。结果经常不变，比如状态阶段、所在区块、能否购买这种布尔值，用 `mapDistinct`。

> **注意：函数会在写入线程执行**
>
> 有订阅者时，函数在原值被写入的线程上执行，用来判断要不要通知。函数要短，只根据参数计算。

> **注意：比较函数的约定**
>
> 比较函数的规则与 [Signal.of](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/basics/mutable.md#注意事项) 相同。满足等价关系，保持简短，没有副作用。

**下一步**：[combine 组合](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/derive/combine.md) — 由多个 Signal 共同算出一个结果，例如法力、消耗和沉默决定技能能否释放。
