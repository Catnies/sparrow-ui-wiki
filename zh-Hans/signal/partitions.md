# 分区状态

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/partitions>

商店中的苹果和面包各有库存。苹果详情页只需要订阅苹果库存，面包售出时不应触发它的刷新。

`KeyedSignal` 按 key 保存状态，各分区独立发送变更通知。按玩家划分状态时，使用 `PlayerKeyedSignal`。

## 让不同 key 独立更新

下面按商品编号保存库存，初始值都是 10。通过 `at("apple")` 获取苹果分区并订阅，再分别修改面包和苹果库存，观察哪些修改触发回调。

```java
MutableKeyedSignal<String, Integer> stock = KeyedSignal.of(id -> 10);
MutableSignal<Integer> apples = stock.at("apple");

System.out.println(apples.get());
Subscription subscription = apples.onDirty(() ->
        System.out.println("苹果库存 " + apples.get()));

// 售出面包不会通知苹果详情页.
stock.set("bread", 8);
stock.update("apple", amount -> amount - 1);
// 盘点后用实际数量修正苹果库存.
apples.set(6);

subscription.close();
```

回调只输出苹果库存的两次变化：9 和 6。修改面包库存不会触发它。`apples.set(6)` 与 `stock.set("apple", 6)` 写入同一个分区。

`KeyedSignal.of(initial)` 在分区首次读取时调用 `initial`，之后缓存结果。装载发生在读取线程，函数应当耗时短、无副作用，并允许重复执行；数据库查询应使用异步版本。`update` 的计算函数也可能因并发更新而重试，规则与普通 `MutableSignal.update` 一致。

需要从来源重新读取时，调用 `dirty(key)`。同步分区会发送失效通知，在下次读取时重新执行装载函数；异步分区会提交重新查询。`dirtyAll()` 处理当前已有的所有分区，`dirty(key)` 不会创建新的分区。

## 清理分区与保留句柄

一个限时商品活动结束后，业务可能不再需要保留它的分区，可以用 `remove(key)` 清理缓存。其他代码之前取得的 `apples` 仍可使用，再次读取时会重建分区。

```java
MutableKeyedSignal<String, Integer> stock = KeyedSignal.of(id -> 10);
MutableSignal<Integer> apples = stock.at("apple");

apples.set(6);
stock.remove("apple");
System.out.println(stock.keys().get().isEmpty());

System.out.println(apples.get());
System.out.println(stock.keys().get().contains("apple"));
```

清理后通过原句柄读取，会重新执行初始化函数，恢复初始值 `10`，并将该 key 加回 `keys()`。

`remove(key)` 不会删除数据库记录，也不会向该分区的订阅者发送通知。已有句柄的订阅与派生关系会保留，重建后继续跟随新分区。所以业务上的「商品下架」仍需要更新商品目录，不能只靠清理缓存表达。

`clear()` 清理全部分区。`keys()` 返回一个 Signal，记录当前已经创建的 key；建分区和删分区会通知它，修改某个分区的值则不会。它的值是顺序不定的不可修改快照。

读取尚未使用过的 key、甚至仅调用 `at(key)`，都会创建分区。所以 `keys()` 不能直接当作商品目录或在线玩家名单；这些名单应由业务数据单独维护。

## 按玩家保存状态

Alice 和 Bob 同时打开商店，各自选择购买数量。Alice 加购一件时，Bob 的数量应保持不变；Alice 进入确认页时，则需要保留刚才的选择。

下面在商店服务中保存一份 `PlayerKeyedSignal`，让多个菜单按玩家读取购买数量。`alice` 和 `bob` 是两名在线玩家。

```java
MutablePlayerKeyedSignal<Integer> quantities = PlayerKeyedSignal.of(uuid -> 1);

MutableSignal<Integer> aliceQuantity = quantities.at(alice);
MutableSignal<Integer> bobQuantity = quantities.at(bob);

// Alice 点击加号后, 只更新她的购买数量.
aliceQuantity.update(value -> value + 1);

System.out.println(aliceQuantity.get());
System.out.println(bobQuantity.get());
System.out.println(quantities.get(alice));
```

`quantities.get(alice)` 与 `aliceQuantity.get()` 读取同一分区，Bob 的分区不受影响。

`at`、`get`、`set`、`update`、`dirty` 和 `remove` 都提供接收 `Player` 或 UUID 的入口。接收 `Player` 时会立即取出 UUID，内部不会因为传入了玩家对象就持有它。

示例中的 `quantities` 应创建一次供多个菜单复用。若状态只属于某一扇窗口，例如这次确认框中的勾选项，直接为窗口创建一个普通 `MutableSignal` 就够了。按商品、队伍等业务 key 划分时用 `KeyedSignal`；按玩家划分且需要离线清理时用 `PlayerKeyedSignal`。

玩家退出时，其分区会自动移除；也可以主动调用 `quantities.remove(alice)`。与普通分区一样，之后的读取或写入仍可能重建它，所以离线清理不能替代业务定时任务和订阅的结束处理。

> **注意：不要让状态长期持有玩家对象**
>
> 集合的元素、映射的 key 和值、分区的值都会被保存。这里应存 UUID、商品编号和业务数据，避免存放 `Player`、`Entity`、`World`，也不要让装载函数捕获这些对象。

## 按玩家异步查询与轮询

商店的首页和确认页都需要显示玩家余额。为了让它们共用同一名玩家最近查到的结果，可以把[异步加载](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/async.md)中的单个余额来源，改成按玩家保存结果的 `PlayerKeyedSignal`。

沿用异步页的业务约定，`economy.loadBalance(UUID)` 查询数据库并返回金币余额，`ioExecutor` 是后台 I/O 执行器。下面的 `balances` 在商店服务初始化时创建，随后用正在打开菜单的 `viewer` 获取他的余额文字。

```java
PlayerKeyedSignal<Long> balances = PlayerKeyedSignal.async(
        (Long) null, ioExecutor, economy::loadBalance);

Signal<Long> balance = balances.at(viewer);
Signal<String> balanceText = balance.map(value ->
        value == null ? "加载中…" : "余额：" + value);
System.out.println(balanceText.get());
```

创建 `balances` 时还不会查询任何玩家。`balances.at(viewer)` 创建分区并返回句柄，也不会提交查询；最后一行读取派生文字时才会触发首次加载。若查询尚未完成，会输出「加载中…」；完成后再次读取就能得到余额。需要收到更新通知时，像异步页一样订阅 `balanceText`，或把它绑定到菜单。

另一个菜单再调用 `balances.at(viewer)`，取用的是同一个玩家分区；换成另一个玩家，则有各自的占位值和查询结果。这与创建时立即提交查询的 `Signal.async` 不同。

数据库写入完成后，调用 `balances.dirty(playerId)` 刷新对应玩家，这里的 `playerId` 是写入操作对应的 UUID。重新查询期间保留上次结果，重复刷新会合并补查，执行器和异常处理沿用[异步加载](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/async.md)的规则。

如果余额还会被其他子服修改，可以把上面创建 `balances` 的语句替换为轮询版本，每 `100` tick 重查一次。后面按玩家取用的代码保持相同。

```java
PlayerKeyedSignal<Long> balances = PlayerKeyedSignal.polling(
        (Long) null, ioExecutor, economy::loadBalance, 100L);
```

**只有句柄存在订阅的玩家分区才会轮询。** 单独取句柄不会启动轮询；一个玩家停止订阅，也不会影响其他玩家。玩家退出时，对应分区的轮询随清理一起停止。

按现实时间轮询可用 `PlayerKeyedSignal.pollingMillis(null, ioExecutor, economy::loadBalance, 5000L)`，周期和订阅规则看[定期轮询](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/polling.md)。普通 `KeyedSignal` 也提供 `async`、`polling` 和 `pollingMillis`，适合查询商品库存等非玩家数据。异步来源返回只读分区句柄，结果由查询函数提供，不能通过 `at(key).set(...)` 写入。

**下一步**：[Signal 在 UI 中的使用](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal-ui/item.md) — 把集合与玩家状态用于物品、分页和窗口显示，让菜单跟随数据更新。
