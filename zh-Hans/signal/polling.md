# 定期轮询

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/polling>

全服商店的库存保存在数据库中，其他子服也可能售出商品。本服收不到这些购买事件时，可以定期查询库存，更新当前菜单。`Signal.polling` 在有人订阅期间重复执行查询，最后一个订阅者离开后停止自动轮询。首次加载、占位值和异常处理与[异步加载](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/async.md)相同。

## 每隔一段时间查询库存

假设商品服务 `catalog` 提供 `loadStock("diamond")`，从数据库读取钻石的剩余数量并返回整数。它是项目自己的业务方法；`ioExecutor` 是已有的后台 I/O 执行器，使用前也应已完成 Sparrow UI 初始化。

下面创建一个每 `100` tick 查询一次的库存来源。这个来源可以由多个商店菜单共同使用，所以应在商店服务初始化时创建并保存，菜单取用同一个对象。

```java
AsyncSignal<Integer> diamondStock = Signal.polling(
        (Integer) null,
        ioExecutor,
        () -> catalog.loadStock("diamond"),
        100L
);
Signal<String> stockText = diamondStock.map(value ->
        value == null ? "库存加载中…" : "剩余 " + value + " 件");
```

创建时会立即提交第一次查询。假设初始库存为 20，其他子服售出两件后，下一次查询会将显示更新为「剩余 18 件」。

轮询之间读到的是最近一次完成的结果，无法保证它与数据库时刻一致；实际购买仍需业务层检查并扣减库存。

现在只是创建了来源和派生文字。**持续轮询还需要订阅**，单独调用 `get()` 或创建 `map` 都不会让它一直查询。

## 开始观察与结束观察

订阅上一节的 `stockText` 后，库存就会开始自动轮询。下面用控制台输出查询结果。

```java
Subscription watching = stockText.onDirty(() ->
        System.out.println(stockText.get()));
System.out.println(stockText.get());
```

首次输出取决于查询是否已经完成，可能是「库存加载中…」，也可能直接是「剩余 20 件」。之后查到 `18` 时，回调输出「剩余 18 件」。如果一直查到 `20`，则不会每隔 `100` tick 重复通知，默认判等会过滤相同的结果。

结束这个控制台观察时，关闭保存的订阅。

```java
watching.close();
```

实际菜单通过绑定持有订阅，使用方式看[绑定到 UI](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal-ui/item.md)。如果还有另一个菜单订阅同一来源，轮询会继续；**最后一个订阅关闭后，自动轮询才会停止。** 下次有人订阅时恢复，若距离上次查询结束已超过一个周期，且当前没有查询在执行，还会立即补查一次。

停止轮询不会取消已经提交的查询或已登记的补查，它们仍可能完成并更新值。创建时的首次查询、主动调用 `diamondStock.dirty()`，也不受有无订阅限制。

## 选择 tick 或毫秒周期

前面的 `100` tick 在服务器维持 20 TPS 时约为 5 秒，服务器变慢时，现实时间间隔也会变长。若希望按现实时间每 5 秒触发查询，可以把创建来源的那段代码替换为下面的毫秒版本。

```java
AsyncSignal<Integer> diamondStock = Signal.pollingMillis(
        (Integer) null,
        ioExecutor,
        () -> catalog.loadStock("diamond"),
        5000L
);
```

`polling` 的周期必须为正数，`pollingMillis` 至少为 `50` 毫秒。两种写法的查询都交给传入的执行器，查询完成后的通知也从执行查询的线程发出。

同周期的来源共享时钟，按时钟周期触发查询；新订阅也沿用已有计时，不会在每次查询完成后重新等待 5 秒。数据库响应慢于周期时，同一个 Signal 不会并行执行多份查询，而会[合并一次补查](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/async.md#发放奖励后刷新余额)。

**下一步**：[集合状态](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/collections.md) — 用商品上架、下架和重新加载的例子，学习如何更新集合中的内容。
