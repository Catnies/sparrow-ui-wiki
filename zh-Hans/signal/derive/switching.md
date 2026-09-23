# switching 切换来源

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/derive/switching>

技能菜单顶部有两个职业标签，战士和法师，下面显示当前职业的剩余技能点。两个职业的技能点各存在一个 Signal 里。

用 [combine](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/derive/combine.md) 把职业和两份技能点组合起来，结果能对，但依赖也多了。玩家正在看战士页，法师的技能点一变，这个物品照样刷新。职业越多，白白刷新的次数越多。

## switching 做什么

`Signals.switching` 接收一个「选择」Signal 和一组来源。它只跟随当前被选中的那个来源，其他来源怎么变都与它无关。

选择变了，它就改为跟随新的来源，并立刻读取新来源的当前值。

## 切换职业时显示对应的技能点

第一个参数是「选择值 → 来源」的 Map，第二个参数是选择 Signal。菜单里的技能点物品依赖 `skillPoints`。

```java
MutableSignal<Integer> warriorPoints = Signal.of(5);
MutableSignal<Integer> magePoints = Signal.of(2);
MutableSignal<String> job = Signal.of("warrior");

Signal<Integer> skillPoints = Signals.switching(
        Map.of("warrior", warriorPoints, "mage", magePoints),
        job
);

Subscription subscription = skillPoints.onDirty(() -> {
    System.out.println("当前技能点：" + skillPoints.get());
});

magePoints.set(3);     // 法师没被选中，不打印
job.set("mage");       // 打印「当前技能点：3」
warriorPoints.set(6);  // 战士已不是当前来源，不打印
magePoints.set(4);     // 打印「当前技能点：4」

subscription.close();
```

1. **第 1-8 行**：当前是战士，skillPoints 跟随 warriorPoints。
2. **第 10-12 行**：订阅技能点的变化。
3. **第 14 行**：法师技能点变了，可法师没被选中，技能点物品不刷新。
4. **第 15 行**：切到法师，改为跟随 magePoints，读到 3。输出「当前技能点：3」。
5. **第 16 行**：战士已经不是当前来源，这次变化被忽略。
6. **第 17 行**：输出「当前技能点：4」。

实际项目里选择值通常用枚举，比如 `Map.of(Job.WARRIOR, warriorPoints, Job.MAGE, magePoints)`。

## 在分区之间切换

竞技场有很多个，而且会新增，没法一个个写进 Map。每个竞技场的人数存在一个按编号分区的 [KeyedSignal](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/keyed/basics.md) 里，`switching` 可以直接接收它。

```java
MutableKeyedSignal<String, Integer> arenaPlayers = KeyedSignal.of(arena -> 0);
MutableSignal<String> selectedArena = Signal.of("desert");
Signal<Integer> shown = Signals.switching(arenaPlayers, selectedArena);

arenaPlayers.set("desert", 6);
arenaPlayers.set("forest", 2);
System.out.println(shown.get());  // 6

selectedArena.set("forest");      // 玩家在列表里点了森林竞技场
System.out.println(shown.get());  // 2
```

分区是异步加载的时候，切到一个新分区后，第一次读取才开始加载，加载期间读到占位值，见 [异步与轮询分区](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/keyed/async.md)。

## 注意事项

> **注意：Map 与选择值**
>
> 传入的 Map 会被复制，之后改原来的 Map 不会增加可选来源。Map 不能为空；读取时当前选择在 Map 里找不到对应来源，会抛出 `IllegalArgumentException`。
>
> 选择 Signal 的值不能是 `null`。

**下一步**：[merging 汇合成员](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/derive/merging.md) — 跟踪一组会增减的成员，例如队伍成员的血量总和。
