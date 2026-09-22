# 集合状态

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/collections>

一个商店菜单最初出售苹果和面包。管理员上架钻石后，商品列表要多一项，「共几种商品」也要跟着变化；下架苹果时，两处又要一起更新。

集合 Signal 保留了 `List`、`Set`、`Map` 的操作方式，增删内容后会通知依赖者。下面分别用它们保存商品列表、选中项和价格表；显示到菜单中的用法见 [列表内容](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal-ui/list.md)。

## 直接修改列表、集合和映射

先处理上架与下架。`products` 保存当前出售的商品名称，`count` 是菜单需要显示的商品种类数。它由列表大小计算，后面只修改商品列表就行。

这段例子可以独立运行，按顺序模拟管理员的两次操作。`ListSignal` 同时是一个 `List` 和一个 `Signal<List<E>>`，所以既能增删，又能派生出 `count`。

```java
ListSignal<String> products = ListSignal.of();
products.addAll(List.of("苹果", "面包"));

Signal<Integer> count = products.mapDistinct(List::size);
System.out.println(count.get());

// 管理员上架钻石, 商品数随列表更新.
products.add("钻石");
System.out.println(count.get());

// 管理员下架苹果.
products.remove("苹果");
System.out.println(products.get());
System.out.println(count.get());
```

依次输出 `2`、`3`、`[面包, 钻石]` 和 `2`。上架时商品数从两种变成三种，下架后又变成两种，全程没有单独设置 `count`。

商店还允许玩家勾选要比较的商品。同一件商品只能选中一次，可以用 `SetSignal` 保存商品编号。下面模拟玩家连续选中两次苹果，再查看选中了几种商品。

```java
SetSignal<String> selected = SetSignal.of();
Signal<Integer> selectedCount = selected.mapDistinct(Set::size);
selected.add("apple");
boolean addedAgain = selected.add("apple");
System.out.println(addedAgain);
System.out.println(selectedCount.get());
```

输出 `false` 和 `1`。第二次添加没有改变集合，也不会通知订阅者。

价格表则需要按商品编号查价。用 `MapSignal` 保存它，可以派生出当前苹果的价格文字。下面模拟管理员把苹果从 `20` 金币调到 `25` 金币。

```java
MapSignal<String, Integer> prices = MapSignal.of();
prices.put("apple", 20);
Signal<String> applePrice = prices.map(map -> "苹果 " + map.get("apple") + " 金币");
System.out.println(applePrice.get());

prices.compute("apple", (id, price) -> price + 5);
System.out.println(applePrice.get());
```

输出从「苹果 20 金币」变成「苹果 25 金币」。`prices.get("apple")` 可以直接读取价格，无参数的 `prices.get()` 则返回整张映射。这里任意商品的价格变化都会让映射的依赖失效；需要按商品分别订阅时，看[分区状态](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/partitions.md)。

这些集合的 `get()` 返回当前集合的**活视图**，后续增删也会反映在这份引用上。需要保存某一刻的内容，或者派生一个集合值时，应复制为独立结果，例如 `products.map(List::copyOf)`。不要用 `products.map(list -> list)` 保留同一份可变集合；直接修改元素对象内部的字段，也不会自动通知集合的订阅者。

## 包装已有集合

如果配置加载器已经返回了一张 `LinkedHashMap` 价格表，里面的插入顺序就是菜单的展示顺序，可以用 `wrap` 接入现有数据。

下面按苹果、面包的顺序创建价格表，包装后再加入钻石。

```java
Map<String, Integer> initialPrices = new LinkedHashMap<>();
initialPrices.put("apple", 20);
initialPrices.put("bread", 30);

MapSignal<String, Integer> prices = MapSignal.wrap(initialPrices);
Signal<List<String>> productIds = prices.map(map -> List.copyOf(map.keySet()));

prices.put("diamond", 100);
System.out.println(productIds.get());
```

输出 `[apple, bread, diamond]`。`wrap` 不复制原集合，包装之后应统一通过 `prices` 修改它；绕过包装器调用 `initialPrices.put(...)`，数据虽然变了，却不会发送通知。

`of()` 会创建一个空集合，其底层实现如下。

| 类型 | `of()` 使用的集合 | 选择时需要注意 |
| - | - | - |
| `ListSignal` | `CopyOnWriteArrayList` | 允许并发迭代，每次写入会复制底层数组 |
| `SetSignal` | `CopyOnWriteArraySet` | 同样采用写时复制，查找元素需要遍历 |
| `MapSignal` | `ConcurrentHashMap` | 不保证迭代顺序，不接受 `null` key 或值 |

`wrap` 后的线程安全和可修改性仍由原集合决定。上面的 `LinkedHashMap` 示例应在同一线程使用；包上一层 Signal 不会让它变成并发集合。集合较大或写入频繁时，可以按实际访问方式选择其他底层集合。

## 用 batch 合并一批通知

管理员执行重载命令后，配置里的商品变成了苹果、面包和钻石。我们要替换菜单使用的列表，希望订阅者一次收到完整的新内容，而不是先收到空列表、再收到新商品。

下面的 `products` 最初只有「旧商品」。`onDirty` 模拟一个观察商品列表的消费者，重载时用 `batch` 包住清空与填入两步。

```java
ListSignal<String> products = ListSignal.of();
products.add("旧商品");

Subscription subscription = products.onDirty(() ->
        System.out.println(products.get()));

products.batch(() -> {
    products.clear();
    products.addAll(List.of("苹果", "面包", "钻石"));
});

subscription.close();
```

回调只输出一次 `[苹果, 面包, 钻石]`，不会收到清空列表时的通知。`SetSignal` 和 `MapSignal` 也提供 `batch`。嵌套调用时，通知延后到最外层结束；期间没有变更，就不会通知。

> **注意：batch 不提供回滚或隔离**
>
> 每一步修改都会立即生效。回调中途抛出异常时，已经完成的修改会保留，并通知订阅者。`batch` 只合并当前线程对当前集合的通知，其他线程仍可能读到中间状态，或对它进行修改并单独发送通知。

## 在元素加入和移除时处理数据

商品编辑菜单允许管理员输入标签。输入「  限时商品  」时，我们希望实际保存的是去掉两端空格的「限时商品」；删除标签时，还要记录被删内容。

`beforeAdd` 处理准备存入的元素，`afterRemove` 处理已经移除的元素。下面创建一个独立的标签列表，模拟一次输入和删除。

```java
ListSignal<String> tags = ListSignal.of();
Subscription normalize = tags.beforeAdd(String::strip);
Subscription removed = tags.afterRemove(tag ->
        System.out.println("已移除 " + tag));

tags.add("  限时商品  ");
System.out.println(tags.get(0));
tags.remove(0);

normalize.close();
removed.close();
```

先输出 `限时商品`，再输出 `已移除 限时商品`。`beforeAdd` 返回的元素才会真正存入集合，它不是返回布尔值的拦截器。多个加入钩子按注册顺序处理，前一个的返回值会传给后一个。

`SetSignal` 使用同名方法；`MapSignal` 的加入钩子叫 `beforePut((key, value) -> ...)`，移除钩子为 `afterRemove((key, value) -> ...)`。替换已有元素也会经过移除旧值、处理新值的钩子流程，并非只有显式 `remove` 才会触发。

**钩子返回的 `Subscription` 必须保存，结束使用时再关闭。** 集合只弱持有钩子，丢弃返回的订阅后，钩子可能被回收。它们在修改集合的线程同步执行，应在集合交给其他代码使用前配置好，避免在钩子中反过来修改同一个集合。

> **提示：需要识别被删对象时**
>
> List 按下标或迭代器移除时，`afterRemove` 收到的是原本存储的对象；`remove(Object)` 收到的是调用方传入的对象。如果 `beforeAdd` 曾替换对象，就不要依赖这两者具有相同身份。
>
> 移除钩子抛出异常时，修改已经发生，不会撤销；异常会传给修改方，订阅者仍会收到变更通知。

**下一步**：[分区状态](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/partitions.md) — 按商品或玩家保存独立状态，分别管理读取、订阅和缓存。
