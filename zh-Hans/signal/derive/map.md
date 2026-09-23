# map 转换

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/derive/map>

玩家的血量存在一个 `Signal<Integer>` 里，菜单上要显示的却是「❤ 14 / 20」这样的文字，还想再画一条十格的血条。

每次改血量时顺手把文字也改一遍，当然可以。可文字和血条只是血量换了个样子，没必要单独保存，更不该让每个修改血量的地方都记得去更新它们。

## map 做什么

`map` 接收一个转换函数，从原 Signal 派生出一个新 Signal。原 Signal 变了，新 Signal 跟着变。

派生出来的 Signal 只能读，不能写。原值变了它也不急着算，等有人读取时才算一次，算完缓存起来。

## 显示血量文字和血条

`map` 返回的还是 Signal，可以接着 `map`。下面从血量派生出文字，再换算成百分比，画成十格血条。菜单里的两个物品分别依赖 `healthText` 和 `bar`。

逐步执行时留意「待计算」。血量变了，派生值只是被标记为过期，直到有人读取才真正计算。

```java
MutableSignal<Integer> health = Signal.of(20);
Signal<String> healthText = health.map(value -> "❤ " + value + " / 20");
Signal<Integer> percent = health.map(value -> value * 100 / 20);
Signal<String> bar = percent.map(value ->
        "■".repeat(value / 10) + "□".repeat(10 - value / 10)
);

health.set(14);
health.set(9);

System.out.println(healthText.get());  // ❤ 9 / 20
System.out.println(bar.get());         // ■■■■□□□□□□
```

1. **第 1-6 行**：满血。菜单读取两个派生值并显示。
2. **第 8 行**：血量变成 14。两个派生值收到通知，只是标记为过期，此刻并不计算。
3. **第 9 行**：又变成 9。「❤ 14 / 20」从头到尾没有被计算过。
4. **第 11-12 行**：读取时才用最新的血量 9 计算一次。菜单也是一样，下一 tick 重新显示时才读取。输出「❤ 9 / 20，■■■■□□□□□□」。

## 注意事项

> **注意：结果没变也会通知**
>
> 原 Signal 每通知一次，`map` 就向下游通知一次，不管算出来的结果变没变。血量从 13 降到 12，血条还是六格，依赖 `bar` 的物品照样会刷新一次。
>
> 多刷新一次通常无所谓。结果经常不变、刷新代价又高时，改用 [mapDistinct](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/derive/map-distinct.md)。

> **注意：转换函数只看参数**
>
> 函数在调用 `get()` 的线程执行，并发读取时同一个输入可能被算好几次。函数里只根据参数算出结果，不要改状态、发消息或查数据库。
>
> 在函数里读另一个 Signal，不会建立依赖，那个 Signal 变了结果也不会更新。依赖多个 Signal 时用 [combine](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/derive/combine.md)。

**下一步**：[mapDistinct 去重](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/derive/map-distinct.md) — 结果没变就不通知，例如只在玩家进入新区块时更新。
