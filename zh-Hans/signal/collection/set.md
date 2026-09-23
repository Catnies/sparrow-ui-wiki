# SetSignal 集合

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/collection/set>

传送点菜单里，玩家到过的传送点显示成地图，没到过的显示成问号，顶上写着发现进度。玩家第一次走到某个传送点时记下来。

问题在于玩家会反复回到主城。用列表记录的话，每次都得先查一遍有没有，不然主城会被记好几次，进度也跟着算错。

## SetSignal 做什么

`SetSignal` 是可以订阅的 `Set`，元素不重复。添加一个已经存在的元素，集合不变，也不会通知任何人。

它的用法和 [ListSignal](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/collection/list.md) 基本一样，`SetSignal.of()` 返回 `MutableSetSignal`。适合记录「有没有」的数据，比如解锁的成就、发现的传送点、勾选的选项。

## 记录发现的传送点

菜单里每个传送点按钮用 `discovered.contains(name)` 决定显示地图还是问号。

```java
MutableSetSignal<String> discovered = SetSignal.of();
Signal<String> progress = discovered.mapDistinct(set ->
        "已发现 " + set.size() + " / 4"
);

discovered.add("主城");
discovered.add("沙漠神殿");
boolean addedAgain = discovered.add("主城");  // 已经有了，返回 false，不通知

System.out.println(addedAgain);                      // false
System.out.println(progress.get());                  // 已发现 2 / 4
System.out.println(discovered.contains("沙漠神殿"));  // true
```

1. **第 1-4 行**：一个传送点都没去过。
2. **第 6 行**
3. **第 7 行**
4. **第 8 行**：回到主城又记录了一次。主城已经在集合里，add 返回 false，菜单不刷新，也不用先检查 contains。
5. **第 10-12 行**：输出「false，已发现 2 / 4，true」。

## 底层集合

`SetSignal.of()` 的底层是 `LinkedHashSet`，按加入顺序迭代。需要跨线程读写时，用 `wrap` 包装一个并发集合。

```java
MutableSetSignal<String> discovered = SetSignal.wrap(ConcurrentHashMap.newKeySet());
```

`MutableSetSignal` 同样提供 `batch`、`beforeAdd` 和 `afterRemove`，用法见 [ListSignal](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/collection/list.md#用-batch-合并一批修改)。

## 注意事项

> **注意：与 ListSignal 相同的规则**
>
> `get()` 返回集合本身的活视图；`wrap` 之后只能经包装器修改；`of()` 创建的集合不保证线程安全；钩子凭证必须保存。

> **注意：add 先查重，再执行钩子**
>
> `add` 先用原元素判断是否已存在，已经存在就不执行 `beforeAdd`。钩子换出来的元素如果和集合里已有的元素相等，这次加入也不会生效。

> **注意：不要存玩家对象**
>
> 集合元素会被长期保存，不要放 `Player`、`Entity`、`World`，用 UUID、名字或编号代替。

**下一步**：[MapSignal 映射](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/collection/map.md) — 按 key 保存数据，例如击杀排行和从配置读取的传送点。
