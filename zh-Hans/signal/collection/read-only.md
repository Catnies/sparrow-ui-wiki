# 只读视图与在线玩家

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/collection/read-only>

房间的等待队列只应该由房间自己修改，菜单、计分板、其他插件模块只负责显示。可你把 `MutableListSignal` 交出去，谁都能 `clear()` 一下，排好的队就没了。

另一个常见需求是在线玩家列表。自己监听进服、退服事件维护一份名单，还得处理同一 tick 里好几个人进出的情况。

## 只读视图与在线玩家列表做什么

集合 Signal 都可以通过 `asReadOnly()` 得到一个只读视图，能读取、能订阅、能派生，调用任何修改方法都会抛出 `UnsupportedOperationException`。它是同一个集合的另一个视角，没有复制数据，源集合变了，视图的订阅者也会收到通知。

`Signals.onlinePlayers()` 是 Sparrow UI 内置的在线玩家列表，类型是只读的 `ListSignal<Player>`，玩家进出服务器时自动更新。

## 对外只提供读取

字段用 `MutableListSignal`，对外返回只读视图。

```java
public final class GameRoom {
    private final MutableListSignal<UUID> waiting = ListSignal.of();

    // 同一个列表多次调用 asReadOnly()，返回的是同一个视图对象
    public ListSignal<UUID> waiting() {
        return this.waiting.asReadOnly();
    }

    public void join(UUID playerId) {
        if (!this.waiting.contains(playerId)) {
            this.waiting.add(playerId);
        }
    }

    public void leave(UUID playerId) {
        this.waiting.remove(playerId);
    }
}
```

其他代码拿到 `waiting()` 之后的样子如下，`alice`、`bob` 是两名玩家的 UUID。

```java
GameRoom room = new GameRoom();
ListSignal<UUID> waiting = room.waiting();
Signal<Integer> waitingCount = waiting.mapDistinct(List::size);

room.join(alice);
room.join(bob);
System.out.println(waitingCount.get());  // 2

waiting.clear();  // 抛出 UnsupportedOperationException
```

1. **第 1-3 行**：拿到的是只读视图，可以照常派生。
2. **第 5 行**：房间修改自己的队列，视图的订阅者同样收到通知。
3. **第 6 行**
4. **第 7 行**：输出「2」。
5. **第 9 行**：通过视图修改会抛出异常，队列保持不变。输出「UnsupportedOperationException」。

视图的 `get()`、迭代器、`subList` 同样不能用来修改。`SetSignal` 和 `MapSignal` 的 `asReadOnly()` 规则相同，`MapSignal` 视图的 `keySet()`、`values()`、`entrySet()` 和 `Map.Entry.setValue` 也不能修改。

## 显示在线玩家

大厅菜单的标题显示在线人数，下方列出玩家名字。不需要自己监听任何事件。

```java
ListSignal<Player> online = Signals.onlinePlayers();
Signal<String> onlineText = online.mapDistinct(players ->
        "在线：" + players.size() + " 人"
);
Signal<List<String>> names = online.mapDistinct(players ->
        players.stream().map(Player::getName).toList()
);

// Alice 和 Bob 在同一 tick 里加入服务器
// 下一 tick，onlineText 和 names 各收到一次通知
```

1. **第 1-7 行**：服务器上只有 Steve。
2. **第 9 行**：进服事件处理完，get() 立刻能读到新名单。通知先攒着，合并到下一 tick 发出。
3. **第 10 行**：下一 tick 只通知一次，两个人进服，菜单只刷新一次。

在菜单格子里显示列表内容的写法见 [列表内容](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal-ui/list.md)。

## 注意事项

> **注意：只读的是集合本身**
>
> 视图不允许修改集合，但元素如果是可变对象，仍然可以改元素内部的字段。元素最好不可变。

> **注意：在线玩家列表的 get() 返回快照**
>
> 名单每变化一次，`get()` 生成一份新的不可修改列表；名单没变时重复返回同一份。已经拿到手的列表不会随之后的进出变化。
>
> 通知在 Bukkit 主线程发出，Folia 上是全局区域线程。全服共用一个实例，每次调用返回同一个对象。使用前要先完成 Sparrow UI 的 [初始化](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/getting-started/installation.md#初始化)。

> **注意：不要长期保存 Player**
>
> 列表里的 `Player` 由 Sparrow UI 管理，玩家退出时移除。不要把这些 `Player` 复制到自己的集合、映射或分区里长期保存，需要记住玩家时保存 UUID。
>
> 派生函数可能在不属于该玩家的线程上执行，只读取名字、UUID 这类不需要所属线程的数据。

**下一步**：[KeyedSignal 分区](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/keyed/basics.md) — 按 key 保存互相独立的状态，每个 key 单独通知。
