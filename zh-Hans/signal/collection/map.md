# MapSignal 映射

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/collection/map>

一局团战里，要按玩家名记录击杀数，计分菜单顶部显示当前领先的玩家。

击杀数天然就是「名字 → 数量」的映射。用 `MutableSignal<Map<...>>` 保存的话，每记一次击杀都要复制整张表再 `set` 回去。

## MapSignal 做什么

`MapSignal` 是可以订阅的 `Map`。`put`、`remove`、`merge`、`compute` 等修改都会通知依赖它的地方。`MapSignal.of()` 返回 `MutableMapSignal`。

注意两个 `get` 的区别。`kills.get("Bob")` 是 `Map` 的方法，读取一个值；无参数的 `kills.get()` 是 `Signal` 的方法，返回整张映射。

## 统计击杀排行

领先者取决于所有人的击杀数，正好让它依赖整张映射。

```java
MutableMapSignal<String, Integer> kills = MapSignal.of();
Signal<String> leader = kills.map(map -> map.entrySet().stream()
        .max(Map.Entry.comparingByValue())
        .map(entry -> entry.getKey() + "（" + entry.getValue() + " 杀）")
        .orElse("暂无")
);

kills.merge("Alice", 1, Integer::sum);  // key 不存在时放入 1
kills.merge("Bob", 1, Integer::sum);
kills.merge("Bob", 1, Integer::sum);    // 已存在时累加

System.out.println(kills.get("Bob"));   // 2
System.out.println(leader.get());       // Bob（2 杀）
```

1. **第 1-6 行**：开局，还没有人击杀。
2. **第 8 行**
3. **第 9 行**：平手，max 取到先出现的 Alice。leader 是 map 派生的，结果没变也会通知。
4. **第 10 行**：Bob 反超。
5. **第 12-13 行**：输出「2，Bob（2 杀）」。

如果每个显示位置只关心一个 key，比如每个玩家头像下只显示他自己的击杀数，那么 Alice 的变化也会让 Bob 的显示刷新。这种情况改用 [KeyedSignal](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/keyed/basics.md)，每个 key 单独通知。

## 包装从配置读取的数据

传送点列表从配置文件读取，配置加载器返回一个 `LinkedHashMap`，保留了配置里的顺序。用 `wrap` 包装它，之后添加的传送点排在后面。

```java
record Waypoint(String world, int x, int y, int z) {}

Map<String, Waypoint> loaded = new LinkedHashMap<>();
loaded.put("主城", new Waypoint("world", 0, 64, 0));
loaded.put("矿区", new Waypoint("world", 320, 12, -150));

MutableMapSignal<String, Waypoint> waypoints = MapSignal.wrap(loaded);
Signal<List<String>> names = waypoints.map(map -> List.copyOf(map.keySet()));

waypoints.put("下界门", new Waypoint("world", -88, 70, 42));
System.out.println(names.get());  // [主城, 矿区, 下界门]
```

传送点用世界名和坐标保存，没有用 `Location`，因为 `Location` 会持有 `World` 对象。

## 底层映射与钩子

`MapSignal.of()` 的底层是 `LinkedHashMap`，按插入顺序迭代，允许 `null` key 和值。需要跨线程读写时，包装一个 `ConcurrentHashMap`，它不保证迭代顺序，也不接受 `null`。

```java
MutableMapSignal<String, Integer> kills = MapSignal.wrap(new ConcurrentHashMap<>());
```

`MutableMapSignal` 提供 `batch`，用法和 [ListSignal](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/collection/list.md#用-batch-合并一批修改) 相同。钩子的名字略有不同。

| 钩子 | 时机 |
| - | - |
| `beforePut((key, value) -> ...)` | 值存入之前，返回真正存进去的值 |
| `afterRemove((key, value) -> ...)` | 映射移除之后，收到被移除的 key 和值 |

例如 `kills.beforePut((name, count) -> Math.max(0, count))` 保证击杀数不会是负数。覆盖已有的 key 时，先对旧值执行 `afterRemove`，再对新值执行 `beforePut`。

## 注意事项

> **注意：wrap 之后只能经包装器修改**
>
> `wrap` 不复制原映射。绕过包装器调用 `loaded.put(...)` 不会发出通知。`keySet()`、`values()`、`entrySet()` 和 `Map.Entry.setValue` 的修改会经过包装器，也会通知。`of()` 创建的映射不保证线程安全。

> **注意：钩子在并发映射上的限制**
>
> 带钩子的 `put` 会先读再写，在并发映射上不是原子操作。`compute` 一类方法会在重算函数里执行钩子，钩子可能被执行多次，而且不能再操作同一张映射。钩子凭证必须保存。

**下一步**：[只读视图与在线玩家](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/collection/read-only.md) — 对外只提供读取，以及使用 Sparrow UI 内置的在线玩家列表。
