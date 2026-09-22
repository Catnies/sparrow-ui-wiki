# 窗口标题

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/window/title>

菜单标题可以写成固定文本，也可以显示数量、筛选条件等数据。菜单已经打开时，调用 Window 的标题方法即可更新。

## 更新标题

Builder 的 `setTitle` 设置初始标题。菜单打开后，调用 Window 的同名方法就能请求更新，不用重新创建 Window 或 Pane。

下面的菜单初始标题为“物品目录”，点击书后改为“已选择：书”：

```java
Pane pane = Pane.builder("####B####")
        .addIngredient('B', Item.builder()
                .setItemProviderConstant(new ItemStack(Material.BOOK))
                .addClickHandler(click -> click.window().setTitle("已选择：书"))
                .build())
        .build();

Window.builder(pane)
        .setTitle("物品目录")
        .open(viewer);
```

`setTitle` 接受纯文本 `String`，也接受 Adventure `Component`，需要颜色等样式时传 Component。它会替换当前标题来源，并请求刷新一次。

标题更新通过玩家实体线程执行。调用后不必再调用 `updateTitle()`；`title()` 读取的是最近一次已应用的标题，不保证立即反映刚提交的更新。

## 从数据生成标题

标题包含数量、筛选条件等变量时，可以用 `setTitleSupplier` 集中生成标题。数据改变后调用 `updateTitle()`，让窗口重新读取 Supplier。

下面以点击次数为例，初始标题为“点击次数：0”：

```java
AtomicInteger count = new AtomicInteger();

Pane pane = Pane.builder("####B####")
        .addIngredient('B', Item.builder()
                .setItemProviderConstant(new ItemStack(Material.BOOK))
                .addClickHandler(click -> {
                    count.incrementAndGet();
                    click.window().updateTitle();
                })
                .build())
        .build();

Window.builder(pane)
        .setTitleSupplier(() -> Component.text("点击次数：" + count.get()))
        .open(viewer);
```

Supplier 会在玩家实体线程上求值，适合读取已经准备好的数据。文件读取、数据库查询等耗时工作应先在异步任务中完成，再更新数据并请求刷新标题。

修改 `count` 本身不会触发刷新，Supplier 也不会每 tick 自动执行。连续提交的刷新请求会合并处理。运行时调用 `setTitleSupplier` 会更换来源并请求刷新；之后调用 `setTitle`，标题便改为固定值。

**下一步**：[窗口数据](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/window/data.md) — 给窗口附带业务对象，处理客户端状态确认和容器外点击。
