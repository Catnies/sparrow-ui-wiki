# debounce 防抖

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/time/debounce>

物品搜索菜单里，玩家在铁砧输入框打字，下方列出匹配的物品。输入框每变一个字符，Signal 就变一次。

玩家输入 `diamond` 的过程中，`d`、`di`、`dia` 都会各触发一次搜索。这些中间结果玩家根本来不及看，服务器却要把整个物品表过滤好几遍。

## debounce 做什么

`debounce(ticks)` 返回一个延迟通知的 Signal。原 Signal 变化后，它先等一段时间；等待期间又有变化，就重新开始等。直到安静了指定的 tick 数，才通知一次。

等待期间读取它，拿到的还是上一次通知时的值。

## 打完字再搜索

输入框的原始文本写进 `input`，搜索结果只依赖防抖后的 `keyword`。假设玩家在 tick 0、3、6 各输入一次，然后停手。

```java
MutableSignal<String> input = Signal.of("");  // 输入框的原始文本
// 停顿 10 tick 后才更新，strip 去掉首尾空格，多敲一个空格不会重复搜索
Signal<String> keyword = input.debounce(10).mapDistinct(String::strip);

Subscription subscription = keyword.onDirty(() -> {
    System.out.println("搜索：" + keyword.get());
});

input.set("d");        // tick 0，开始等待
input.set("dia");      // tick 3，重新等待
input.set("diamond");  // tick 6，重新等待
// tick 16，已经安静了 10 tick，打印「搜索：diamond」
```

1. **第 1-3 行**：输入框为空，没有搜索结果。
2. **第 5-7 行**：订阅搜索词。有了订阅，防抖才会安排定时任务。
3. **第 9 行**：开始等待 10 tick。keyword 仍是旧值，不搜索。
4. **第 10 行**：等待期间又有输入，重新计时。
5. **第 11 行**：再次重新计时，最早要到 tick 16 才会通知。
6. **第 12 行**：三次输入只搜索了一次。输出「搜索：diamond」。

[GitHub 仓库](https://github.com/Catnies/sparrow-ui) 的 `example` 模块里有一个完整的实时搜索菜单 `LiveSearchMenu`，用的就是这种写法。

## 按毫秒计时

`debounce(10)` 按服务器 tick 计时，20 TPS 时约等于 500 毫秒，服务器卡顿时等待也会变长。要按现实时间计时，用 `debounceMillis`。

```java
Signal<String> keyword = input.debounceMillis(500).mapDistinct(String::strip);
```

## 注意事项

> **注意：一直输入就一直不通知**
>
> 玩家不停手，防抖就一直等下去。值持续变化、又想定期看到结果时，用 [throttle](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/time/throttle.md)。

> **注意：没有订阅时不会延迟**
>
> 防抖只在有订阅者时才安排定时任务。只创建 `keyword` 然后调用 `get()`，读到的就是原 Signal 的当前值，不会等待。最后一个订阅关闭后，还没执行的延时任务也会取消。

> **注意：通知来自调度线程**
>
> tick 版的通知在 Bukkit 主线程执行，Folia 上是全局区域线程；毫秒版在 Sparrow UI 的异步工作线程执行。两者都不是玩家所在的区域线程，回调里不要直接操作玩家或方块。
>
> 通知时会读取原 Signal，上游的 `map` 也可能在这个线程计算，整条派生链都要简短，不做耗时 I/O。

> **注意：间隔与初始化**
>
> 间隔必须大于 0，否则抛出 `IllegalArgumentException`。使用前要先完成 Sparrow UI 的 [初始化](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/getting-started/installation.md#初始化)。

**下一步**：[throttle 节流](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/time/throttle.md) — 限制刷新频率，例如建筑粘贴进度每半秒最多刷新一次。
