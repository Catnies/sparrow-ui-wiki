# 窗口数据

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/window/data>

可以用 `setData` 把商品信息、筛选条件等数据保存在 Window 中，点击时再取出来。

## 保存菜单数据

Builder 的 `setData` 可以给窗口附带一个对象。点击处理器拿到 Window 后，通过 `data(Class)` 取回，适合保存商品编号、筛选条件或当前菜单的上下文。

下面把商品信息放进窗口。按钮读取当前窗口的数据，所以这段点击逻辑不需要捕获某个商品对象：

```java
record ProductContext(String id, String name) {}

Pane pane = Pane.builder("####B####")
        .addIngredient('B', Item.builder()
                .setItemProviderConstant(new ItemStack(Material.BOOK))
                .addClickHandler(click -> {
                    ProductContext product = click.window().data(ProductContext.class);
                    click.player().sendMessage(Component.text(
                            "当前商品：" + product.name() + "（" + product.id() + "）"));
                })
                .build())
        .build();

Window.builder(pane)
        .setData(new ProductContext("travel-notes", "旅行笔记"))
        .setTitle("商品详情")
        .open(viewer);
```

Window 保存的是传入对象的引用，不会复制、序列化或监听其中的字段。修改可变对象后，需要按用途主动刷新标题或 Item；共享同一个对象的窗口也会读到同一份业务数据。

`setData` 是构建时的配置，Window 没有用来替换这份引用的同名 setter。`data()` 返回原始对象，`data(Class)` 只做类型转换：未设置数据时返回 `null`，类型不匹配时抛出 `ClassCastException`。上例始终在构建时设置 `ProductContext`，所以点击时可以直接按这个类型读取。

窗口仍被业务代码或会话持有时，附带的对象也会被持有。会话如何保留窗口，看 [会话与导航](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/session/navigation.md)。

## 等待客户端确认窗口状态

`setWindowState(int)` 设置一个整数标记。窗口已打开时，Sparrow UI 会发送 Ping，收到对应的 Pong 后更新客户端状态，并调用 `addWindowStateChangeHandler` 注册的处理器。

这组 API 用于区分服务端已设置的状态和客户端已确认的状态。商品、筛选条件等业务数据仍放在上一节的 `setData` 中。

下面每次点击纸张都将状态加一，并在收到客户端确认后发送消息：

```java
Pane pane = Pane.builder("####P####")
        .addIngredient('P', Item.builder()
                .setItemProviderConstant(new ItemStack(Material.PAPER))
                .addClickHandler(click -> click.window().incrementWindowState())
                .build())
        .build();

Window.builder(pane)
        .setTitle("状态确认")
        .setWindowState(0)
        .addWindowStateChangeHandler(state ->
                viewer.sendMessage(Component.text("客户端已确认状态：" + state)))
        .open(viewer);
```

| API | 含义 |
| - | - |
| `setWindowState(value)` | 设置服务端状态；窗口已打开时发送确认请求 |
| `incrementWindowState()` | 将服务端状态加一，并按同样方式请求确认 |
| `serverWindowState()` | 最近一次已设置的服务端状态 |
| `clientWindowState()` | 最近一次通过 Pong 确认的状态 |
| `addWindowStateChangeHandler(handler)` | 收到匹配的 Pong 后，把对应状态交给处理器 |

设置状态不会修改标题、Pane 或物品，也不会自动拦截点击。回调表示客户端回复了确认包，不能据此断定玩家已经看见画面或完成了某项业务操作。窗口尚未打开时，设置状态只保存数值，不会当场发送 Ping。

## 处理容器外点击

`addOutsideClickHandler` 接收玩家在容器界面外部的点击。它与槽位上的 Item 点击处理器分开；点击下方玩家物品栏仍属于槽位点击。

玩家拿着光标物品点击容器外部时，通常会触发丢弃。下面取消这次操作，让物品留在光标上：

```java
Pane pane = Pane.builder("#########").build();

Window.builder(pane)
        .setTitle("容器外点击")
        .addOutsideClickHandler(click -> {
            click.setCancelled(true);
            if (!click.getCursor().isEmpty()) {
                click.getPlayer().sendMessage(Component.text("请将物品放回槽位。"));
            }
        })
        .open(viewer);
```

`WindowOutsideClick` 使用 `getPlayer()`、`getWindow()`、`getClickType()` 和 `getCursor()` 等 getter，写法与 Item 点击事件的 `player()`、`window()` 不同。

`getCursor()` 是事件派发时光标物品的副本，修改它不会替换实际光标物品。处理器返回后，Sparrow UI 会检查取消状态；已取消就停止后续容器外点击处理，否则继续执行这次点击的物品操作。取消容器外点击不会阻止玩家按 Esc 关闭窗口，关闭控制看 [打开与关闭](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/window/lifecycle.md)。

**下一步**：[会话与导航](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/session/navigation.md) — 把多个窗口串成菜单流程，在窗口之间前进、返回并传递上下文。
