# polling 定期轮询

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/source/polling>

大厅服的小游戏菜单上，起床战争图标写着「128 人游戏中」。这个人数存在 Redis 里，由各个游戏子服更新。

大厅服收不到子服的任何事件，用 [async](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/source/async.md) 查一次，人数就停在打开菜单那一刻。自己开定时任务去查，又得操心没人看菜单时停掉它，免得一直白白访问 Redis。

## Signal.polling 做什么

`Signal.polling` 是会定期重新查询的 `Signal.async`。有人订阅期间，它每隔一段时间执行一次查询；最后一个订阅者离开后，自动停止。

前三个参数和 `Signal.async` 相同，第四个参数是轮询周期。占位值、异常处理和补查规则也和 async 一样。

## 定期查询在线人数

假设 `network.onlineCount(String)` 从 Redis 读取某个游戏的在线人数，`ioExecutor` 是后台 I/O 执行器。这个来源可以被所有打开小游戏菜单的玩家共用，插件启动时创建一次就行。

```java
AsyncSignal<Integer> bedwarsOnline = Signal.polling(
        (Integer) null,
        ioExecutor,
        () -> network.onlineCount("bedwars"),
        100L                                  // 每 100 tick 查询一次
);
Signal<String> onlineText = bedwarsOnline.map(value ->
        value == null ? "正在获取人数…" : value + " 人游戏中"
);

// 玩家打开小游戏菜单，菜单订阅了 onlineText，轮询开始
Subscription watching = onlineText.onDirty(() -> {
    System.out.println(onlineText.get());
});
// 之后每 100 tick 查询一次，人数变了才打印

// 最后一个查看的玩家关闭菜单，轮询停止
watching.close();
```

1. **第 1-9 行**：创建时提交第一次查询。现在只是创建了来源，还没有订阅，不会持续轮询。
2. **第 11-14 行**：有了订阅，轮询开始。第一次查询返回 128。输出「128 人游戏中」。
3. **第 15 行**：第二次查询还是 128，结果相同，不通知。
4. **第 15 行**：有三名玩家进了游戏，人数变成 131。输出「131 人游戏中」。
5. **第 17-18 行**：最后一个订阅关闭，轮询停止。值保留在 131。

菜单通过 `dependsOn` 等方式绑定时，打开菜单就订阅，关闭菜单就退订，不需要像上面这样手动管理。只要还有一个菜单开着，轮询就继续。

再次有人订阅时恢复轮询。距离上次查询已经超过一个周期、且当前没有查询在执行的话，会立刻补查一次，不会让玩家看到很久以前的人数。

## 按现实时间轮询

`100` tick 在 20 TPS 时约为 5 秒，服务器卡顿时间隔会变长。要按现实时间轮询，用 `pollingMillis`。

```java
AsyncSignal<Integer> bedwarsOnline = Signal.pollingMillis(
        (Integer) null,
        ioExecutor,
        () -> network.onlineCount("bedwars"),
        5000L
);
```

## 注意事项

> **注意：只创建不订阅，不会持续查询**
>
> 单独调用 `get()` 或 `map` 不会启动轮询，必须有订阅。停止轮询也不会取消已经提交的查询，它们完成后照样更新值。手动调用 `bedwarsOnline.dirty()` 刷新，不受有无订阅的限制。

> **注意：周期与补查**
>
> 相同周期的轮询共用一个时钟，按时钟的节拍查询，不是「上次查完再等 5 秒」。查询比周期还慢时，同一个 Signal 不会并行查询，会 [合并成一次补查](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/source/async.md#连续刷新会合并)。
>
> `polling` 的周期必须为正数，`pollingMillis` 至少为 50 毫秒。

> **注意：读到的是最近一次的结果**
>
> 轮询得到的只是最近一次查询的结果。玩家加入游戏时还有没有空位，仍要由游戏逻辑实时判断。

要轮询很多个游戏的人数，每个游戏写一个 `Signal.polling` 太繁琐。按游戏编号分区的 [KeyedSignal.polling](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/keyed/async.md) 只会轮询有人在看的那几个。

**下一步**：[ListSignal 列表](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/collection/list.md) — 保存会增减的列表，例如小游戏房间的等待队列。
