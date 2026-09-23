# 异步与轮询分区

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/keyed/async>

公会菜单要显示公会名称和等级，资料在数据库里。服务器上有几百个公会，玩家一次只看其中一两个。

每个公会写一个 [Signal.async](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/source/async.md) 太繁琐，而且它一创建就查询，几百个公会就是几百次查询。跨服菜单要显示各子服的人数，也是一样的问题。

## 异步分区做什么

`KeyedSignal.async` 和 `KeyedSignal.polling` 让每个分区单独在后台加载，相当于按 key 批量创建 async 和 polling，但**只有用到的分区才会查询**。

它们接收占位值、执行器和查询函数，查询函数收到分区的 key，返回这个分区的值。

| 时机 | 是否查询 |
| - | - |
| 创建 `KeyedSignal.async(...)` | 不查询 |
| 调用 `at(key)` 取得句柄 | 不查询 |
| 第一次读取某个分区 | 提交这个分区的查询 |

## 按公会编号加载资料

假设 `guildRepository.load(String)` 按公会编号查询并返回 `GuildInfo`，`ioExecutor` 是后台 I/O 执行器。

```java
record GuildInfo(String name, int level, int members) {}

KeyedSignal<String, GuildInfo> guilds = KeyedSignal.async(
        (GuildInfo) null, ioExecutor, guildRepository::load
);

Signal<GuildInfo> moon = guilds.at("moon");  // 只取句柄，还不查询
Signal<String> moonTitle = moon.map(info ->
        info == null ? "读取中…" : info.name() + " Lv." + info.level()
);

System.out.println(moonTitle.get());  // 读取中…，第一次读取才提交查询
// 查询完成后，菜单显示「月影 Lv.5」

guilds.dirty("moon");  // 公会升级后，只重新查询这一个公会
// 新的结果回来，菜单显示「月影 Lv.6」
```

1. **第 1-5 行**：创建时不查询任何公会。
2. **第 7-10 行**：取得句柄、派生文字，仍然不查询。
3. **第 12 行**：第一次读取 moon 分区，这时才提交查询。其他几百个公会都没被查。输出「读取中…」。
4. **第 13 行**：结果返回，菜单刷新。另一个菜单再调用 at("moon")，共用这份结果。
5. **第 15 行**：重新查询期间保留旧结果，连续刷新会合并成一次补查。
6. **第 16 行**

异步分区的值只能由查询函数提供，`at(key)` 返回的句柄是只读的 `Signal`，没有 `set`。

## 按服务器编号轮询人数

跨服菜单要显示每个子服的在线人数，人数由各子服写入 Redis。假设 `servers.onlineCount(String)` 查询某个子服的人数。

```java
KeyedSignal<String, Integer> serverOnline = KeyedSignal.polling(
        (Integer) null, ioExecutor, servers::onlineCount, 100L
);

Signal<Integer> survival = serverOnline.at("survival");
```

每个分区单独轮询，只有句柄有订阅的分区才会轮询。玩家打开菜单查看生存服，就只有 `survival` 每 100 tick 查询一次，没人看的子服不会被查。某个分区的订阅全部关闭后，它自己停止轮询，不影响其他分区。

按现实时间轮询用 `pollingMillis`。

```java
KeyedSignal<String, Integer> serverOnline = KeyedSignal.pollingMillis(
        (Integer) null, ioExecutor, servers::onlineCount, 5000L
);
```

## 注意事项

> **注意：和单个 async、polling 相同的规则**
>
> 重新查询期间保留旧结果，连续刷新合并为一次补查，规则见 [async](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/source/async.md#连续刷新会合并)。轮询周期、共享时钟和补查见 [polling](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/source/polling.md#注意事项)。
>
> 查询函数只访问数据库、网络或线程安全的数据，加载完成的通知从执行查询的线程发出。

> **注意：分区的清理**
>
> 异步和轮询分区同样支持 `remove(key)`、`clear()` 和 `keys()`，规则见 [KeyedSignal 分区](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/keyed/basics.md#清理分区)。移除后再读取，会重新提交查询。

**下一步**：[玩家分区](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/keyed/player.md) — 按 UUID 为每名玩家保存状态，并在玩家退出时自动清理。
