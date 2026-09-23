# 订阅变化：onDirty

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/basics/subscribe>

Boss 战开始后，屏幕顶部的 BossBar 要一直跟着 Boss 的血量走。血量在伤害事件里被修改，BossBar 在另一个地方，两边得有个办法联系起来。

在菜单里用 Signal 时，Sparrow UI 会替你订阅，用不着这一页的内容。BossBar、日志、计分板这些菜单以外的东西，就要自己订阅。

## onDirty 做什么

`onDirty(listener)` 注册一个回调。Signal 的值可能变化时，回调就会被调用。它返回一个 `Subscription`，保存它就能一直收到通知，调用 `close()` 就停止。

回调没有参数。需要新值时，在回调里调用 `get()` 读取。

## 让 BossBar 跟随血量

```java
public final class BossHealthBar {
    private final BossBar bar;
    private final Subscription subscription;

    public BossHealthBar(Signal<Integer> health, int maxHealth) {
        this.bar = BossBar.bossBar(
                Component.text("远古守卫者"), 1f,
                BossBar.Color.RED, BossBar.Overlay.PROGRESS
        );
        // 血量每次变化，按比例更新进度条
        this.subscription = health.onDirty(() -> {
            float progress = health.get() / (float) maxHealth;
            this.bar.progress(Math.clamp(progress, 0f, 1f));
        });
    }

    public BossBar bar() {
        return this.bar;
    }

    // Boss 死亡或被移除时调用
    public void close() {
        this.subscription.close();
    }
}
```

`BossBar` 和 `Component` 来自 Adventure。`Subscription` 存在字段里，Boss 活着的时候一直有效。

## 通知在什么时候发出

用一段更短的代码看清通知的时机。Boss 初始血量 500，订阅后连续受到几次伤害。

```java
MutableSignal<Integer> bossHealth = Signal.of(500);

Subscription subscription = bossHealth.onDirty(() -> {
    System.out.println("Boss 剩余血量：" + bossHealth.get());
});

bossHealth.set(420);                       // 打印「Boss 剩余血量：420」
bossHealth.set(420);                       // 值没变，不打印
bossHealth.update(health -> health - 70);  // 打印「Boss 剩余血量：350」

subscription.close();
bossHealth.set(0);                         // 订阅已关闭，不打印
```

1. **第 1 行**：Boss 出场，血量 500。
2. **第 3-5 行**：订阅时不会补发当前值 500，控制台还是空的。需要初始值就自己 get() 一次。
3. **第 7 行**：值变了，回调在写入的这个线程里立刻执行。输出「Boss 剩余血量：420」。
4. **第 8 行**：写入相同的值，被跳过，回调不执行。
5. **第 9 行**：回调里 get() 读到的是最新值 350。输出「Boss 剩余血量：350」。
6. **第 11 行**：关闭订阅。之后的变化与这个回调无关。
7. **第 12 行**：写入照常生效，依赖它的菜单也会刷新，只是控制台不再打印。

## 注意事项

> **注意：一定要保存 Subscription**
>
> Signal 只弱引用订阅者。`onDirty` 返回的 `Subscription` 没有被任何地方持有时，可能被垃圾回收，回调就悄悄停了，也不会报错。

> **注意：通知只说明「可能变了」**
>
> 通知不带值。回调里的 `get()` 读的是当下的值，多个线程连续写入时，中间的某个值可能读不到，两次通知也可能读到同一个值。
>
> 所以别拿回调记账。要记录 Boss 受到的每一次伤害，就在造成伤害的地方记，不要从血量变化里倒推。

> **注意：回调在写入的线程执行**
>
> 谁修改血量，回调就在谁的线程里跑。多个线程写入时，回调可能被同时调用。
>
> 回调要线程安全，尽快返回，也不要在回调里再去修改同一个 Signal。

订阅的保留与清理还可以看 [生命周期与清理](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/advanced/lifecycle.md)。菜单里的订阅怎样自动管理，见 [Signal 在 UI 中的使用](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal-ui/item.md)。

**下一步**：[map 转换](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/derive/map.md) — 从一个 Signal 算出另一个值，例如把血量显示成血条文字。
