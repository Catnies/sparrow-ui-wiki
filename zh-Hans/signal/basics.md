# Signal 基础

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/basics>

Signal 保存会变化的数据，也可以根据这些数据计算新的值。它可以独立用于业务代码，再由菜单读取和显示。

## 创建、读取与更新

用 `Signal.of(initial)` 创建一个 `MutableSignal<T>`，再通过 `get()` 读取、`set(value)` 写入。需要在原值上加一时，可以用 `update`：

```java
MutableSignal<Integer> quantity = Signal.of(1);

quantity.set(3);
quantity.update(value -> value + 1);

System.out.println(quantity.get());
```

最后输出 `4`。`set` 和 `update` 是 `MutableSignal` 的方法；对外提供只读接口时，可以把返回类型写成 `Signal<Integer>`。

新旧值默认用 `Objects.equals` 比较。此时再调用 `set(4)` 或 `update(value -> value)`，值没有变化，就会跳过写入和通知。Signal 也允许保存 `null`，例如 `MutableSignal<String> selection = Signal.of(null)`。

多个线程同时修改数量时，`update` 能保证这次加一基于最新值完成。若分开调用 `get()` 和 `set()`，读取之后可能已有别的线程写入，随后再写回就会覆盖它的结果。

> **注意：更新函数只计算新值**
>
> 多个线程同时写入时，`update` 的函数可能重试。函数里只计算并返回新值，不要发放物品、扣款、发送消息或修改旧对象。
>
> Signal 支持任意线程读写；它所保存的对象若可变，线程安全仍由调用方负责。

多个字段可以放进一个 record，每次更新创建一份新状态：

```java
record OrderOptions(int quantity, boolean giftWrap) {}

MutableSignal<OrderOptions> options = Signal.of(new OrderOptions(1, false));
options.update(value -> new OrderOptions(value.quantity() + 1, value.giftWrap()));

System.out.println(options.get());
```

结果为 `OrderOptions[quantity=2, giftWrap=false]`。Signal 保存的是对象引用，直接修改对象字段不会触发通知，再把同一个引用传给 `set` 通常也会被判为相同。所以这里用新对象替换旧状态。列表等集合的更新方式看 [集合状态](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/collections.md)。

## 订阅变化

用 `onDirty` 注册变化回调。回调没有参数，需要当前值时调用 `get()`；返回的 `Subscription` 用于保留和关闭这次订阅。

```java
MutableSignal<Integer> coins = Signal.of(100);

try (Subscription subscription = coins.onDirty(() -> System.out.println("当前金币：" + coins.get()))) {
    coins.set(120);
    coins.set(120);
    coins.update(value -> value + 30);
}

coins.set(200);
```

回调依次输出 `当前金币：120` 和 `当前金币：150`。注册时不会补发初始值 `100`，重复写入 `120` 也不会通知。离开 `try` 块后，订阅自动关闭；最后一次写入 `200` 仍然生效，只是不再触发这个回调。

示例用 `try` 限定订阅范围。需要持续监听时，把 `Subscription` 保存为字段，结束监听时调用 `close()`，也可以用 `isClosed()` 检查是否已关闭。初始值需要单独用 `get()` 读取。

> **注意：订阅的持有与线程**
>
> 必须保存 `onDirty` 返回的 `Subscription`。如果没有任何地方持有它，订阅可能随垃圾回收消失。
>
> 回调就在触发通知的线程上执行，多个写入线程可能同时调用它。回调需要线程安全、尽快返回，也不能直接或间接让正在通知的同一个 Signal 再次变化。

通知只表示值可能变了，不保存触发通知时的那份值。并发写入时，回调里的 `get()` 可能已读到后一次写入的结果。若要逐笔记录金币收支，应在业务操作处记录。

菜单通过 `dependsOn` 等方式绑定 Signal 时，Sparrow UI 会管理订阅，不用自己保存 `Subscription`。具体用法看 [Signal 在 UI 中的使用](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal-ui/item.md)，订阅的保留和关闭方式看 [生命周期与清理](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/advanced/lifecycle.md)。

## 用 map 派生值

`map` 根据一个 Signal 的当前值生成另一个 Signal。例如，购买数量决定总价：

```java
MutableSignal<Integer> quantity = Signal.of(2);
Signal<Integer> total = quantity.map(amount -> amount * 30);

System.out.println(total.get());
quantity.set(3);
quantity.set(4);
System.out.println(total.get());
```

两次输出分别是 `60` 和 `120`。`total` 在被读取时才计算，并缓存结果；`quantity` 变化后，下一次读取才重新计算。上例跳过了数量为 `3` 时的读取，所以也跳过了总价 `90` 的计算。

`map` 会转发上游的变化通知，不检查派生结果是否相同。若只关心结果有没有变化，可以用 `mapDistinct`。

> **注意：派生函数只依赖输入值**
>
> 调用 `get()` 触发计算时，函数就在该线程执行。并发读取可能让同一份输入被计算多次，函数中应只根据参数计算结果，不修改状态或执行业务操作。
>
> 在函数里读取另一个 Signal，不会自动建立对它的订阅。结果依赖多个数据源时，使用 [派生与组合](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/derive.md) 中的 `Signals.combine`。

## 用 mapDistinct 过滤重复结果

商品售价为 `50`，余额从 `100` 增加到 `120`，玩家仍然买得起，购买按钮也不需要改变外观。用 `mapDistinct` 派生这个布尔值，就能跳过结果相同时的通知：

```java
MutableSignal<Integer> coins = Signal.of(100);
Signal<Boolean> affordable = coins.mapDistinct(value -> value >= 50);

System.out.println("初始状态：" + affordable.get());
try (Subscription subscription = affordable.onDirty(() ->
        System.out.println("能否购买：" + affordable.get()))) {
    coins.set(120);
    coins.set(40);
    coins.set(30);
    coins.set(60);
}
```

初始状态为 `true`，回调只输出 `false`、`true` 两次：

| 余额变化 | 能否购买 | 是否通知订阅者 |
| - | - | - |
| 100 → 120 | true → true | 否 |
| 120 → 40 | true → false | 是 |
| 40 → 30 | false → false | 否 |
| 30 → 60 | false → true | 是 |

`mapDistinct` 默认用 `Objects.equals` 比较结果。首次订阅时先算出当前结果，随后每次收到上游通知，都重新计算并与前一次比较，结果不同才通知订阅者。没有订阅者时，仍然等到 `get()` 才计算。

这次比较需要先计算结果，所以 `mapDistinct` 的函数也可能在写入上游时执行，应尽量简短。如果每次数量变化都会改变总价，直接用 `map` 就行。

## 自定义相等规则

如果业务上的相等规则与 `Objects.equals` 不同，可以给 `Signal.of` 传入 `sameValue` 比较函数，返回 `true` 表示两个值相同。例如，分类编号可以忽略大小写：

```java
MutableSignal<String> category = Signal.of("books", String::equalsIgnoreCase);

try (Subscription subscription = category.onDirty(() ->
        System.out.println("分类：" + category.get()))) {
    category.set("BOOKS");
    System.out.println("当前值：" + category.get());
    category.set("tools");
}
```

写入 `"BOOKS"` 时，比较结果为相同，这次写入会被跳过，`get()` 仍返回 `"books"`。改为 `"tools"` 后才触发回调。

如果需要保留原始输入，只让某个派生结果忽略大小写，把判等规则放在 `mapDistinct` 上：

```java
MutableSignal<String> input = Signal.of("books");
Signal<String> keyword = input.mapDistinct(String::strip, String::equalsIgnoreCase);

try (Subscription subscription = keyword.onDirty(() ->
        System.out.println("搜索词：" + keyword.get()))) {
    input.set(" BOOKS ");
    System.out.println("原始输入：" + input.get());
    input.set(" tools ");
}
```

这里的 `input` 会保留 `" BOOKS "`，也会通知自己的订阅者。`keyword` 去掉两端空格后再忽略大小写比较，结果相同就不继续通知；输入改为 `" tools "` 时，回调才输出 `搜索词：tools`。

> **注意：比较函数的约定**
>
> `sameValue` 应满足等价关系，同一个值必须与自身相同，函数也应简短且无副作用。它只会收到两个非 `null` 值；两个 `null` 由 Sparrow UI 判为相同，只有一侧为 `null` 则判为不同。
>
> Signal 会长期持有比较函数，不要在其中捕获 `Player`、`World` 或 `Window`。如果比较时忽略某个字段，仅修改这个字段的写入就会被跳过。

**下一步**：[派生与组合](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/derive.md) — 组合多个数据源，切换依赖，并用防抖、节流和时钟控制更新。
