# 分页与筛选

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal-ui/page>

任务日志里有十二个任务，一页放九个。翻到第一页时「上一页」应该变灰，翻到最后一页时「下一页」变灰，中间还要显示「1 / 2」这样的页码。

[翻页 Page](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/pagination/page.md) 里的箭头一直是可用的样子，因为它们不知道当前是第几页。玩家在第一页点「上一页」，什么都不会发生，按钮却看起来能点。

## Page 的 Signal 做什么

`Page` 本身提供两个 Signal。`page()` 是当前页码，从 0 开始；`count()` 是总页数。按钮依赖它们，翻页时就会刷新。

`Page.of` 也可以直接接收 `ListSignal` 或 `Signal<List<T>>`。列表变化后，当前页的内容和总页数都会跟着更新。

## 任务日志

`Quest` 是一个 record，`questIcon` 把已完成的任务画成书、未完成的画成书与笔，两个辅助方法见页尾。

```java
MutableListSignal<Quest> quests = ListSignal.of();
for (int i = 1; i <= 12; i++) {
    quests.add(new Quest("任务 " + i, i <= 4));  // 前四个已完成
}
Page<Quest> page = Page.of(quests, 9);  // 每页 9 个

Signal<Boolean> hasPrevious = page.page().map(index -> index > 0);
Signal<Boolean> hasNext = Signals.combine(page.page(), page.count(),
        (index, count) -> index + 1 < count
);

Item previous = Item.builder()
        .dependsOn(hasPrevious)
        .setItemProvider(context -> {
            return hasPrevious.get()
                    ? named(Material.ARROW, "上一页")
                    : named(Material.GRAY_DYE, "已是第一页");
        })
        .addClickGuard((item, click) -> hasPrevious.get())
        .addClickHandler(click -> page.advance(-1))
        .build();
Item next = Item.builder()
        .dependsOn(hasNext)
        .setItemProvider(context -> {
            return hasNext.get()
                    ? named(Material.ARROW, "下一页")
                    : named(Material.GRAY_DYE, "已是最后一页");
        })
        .addClickGuard((item, click) -> hasNext.get())
        .addClickHandler(click -> page.advance(1))
        .build();
Item pageNumber = Item.builder()
        .dependsOn(page.page(), page.count())
        .setItemProvider(context -> {
            String text = (page.page().get() + 1) + " / " + page.count().get();  // 页码从 0 开始
            return named(Material.PAPER, text);
        })
        .build();

Pane pane = Pane.builder("MMMMMMMMM", "P###C###N")
        .addIngredient('M', page, quest -> Element.item(Item.simple(questIcon(quest))))
        .addIngredient('P', previous)
        .addIngredient('C', pageNumber)
        .addIngredient('N', next)
        .build();
Window.builder(pane).setTitle("任务日志").open(viewer);
```

1. **第 1-5 行**：十二个任务，每页九个，一共两页。
2. **第 7-10 行**：能不能往前翻只看页码；能不能往后翻要同时看页码和总页数，所以用 combine。
3. **第 40-46 行**：打开第一页。上一页是灰的，守卫也读同一个判断，点了不会翻页。
4. **第 29-30 行**：点下一页。第二页只有任务 10 到 12，两个箭头的样子互换。
5. **第 19-20 行**：点上一页，回到第一页。

列表缩短到只剩九个时，总页数变成 1，当前页落回有效范围，两个箭头都变灰。空列表按一页处理，页码显示「1 / 1」，内容区为空。

## 只看未完成的任务

筛选时，把完整列表和筛选开关组合成一个新的列表 Signal，再交给 `Page.of`。

```java
MutableSignal<Boolean> unfinishedOnly = Signal.of(false);
Signal<List<Quest>> shown = Signals.combine(quests, unfinishedOnly, (all, enabled) ->
        all.stream().filter(quest -> !enabled || !quest.done()).toList()
);
Page<Quest> page = Page.of(shown, 9);
```

`unfinishedOnly.set(true)` 后只剩八个未完成的任务，总页数自动变成 1。箭头和页码的写法不用改。

## 从数据库按页加载

任务存在数据库里时，箭头和页码的写法保持不变，只换分页来源。`repository.findQuests(offset, limit)` 返回一页任务，`repository.count()` 返回任务总数。

**两种按页加载的来源**

```java
Page<Quest> page = Page.async(ioExecutor,
        index -> repository.findQuests(index * 9, 9),
        () -> (repository.count() + 8) / 9
);
```

`Page.async` 管理按页缓存，也支持 `refresh()` 和 `prefetch()`，具体流程看 [数据库分页](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/pagination/page.md#从数据库懒加载数据)。

业务层已经有按页分区的数据源时，可以直接交给 `Page.of`。

```java
KeyedSignal<Integer, List<Quest>> questsByPage = KeyedSignal.async(
        List.of(), ioExecutor, index -> repository.findQuests(index * 9, 9)
);
AsyncSignal<Integer> totalPages = Signal.async(
        1, ioExecutor, () -> (repository.count() + 8) / 9
);
Page<Quest> page = Page.of(questsByPage, totalPages);
```

这时刷新由来源负责，比如 `questsByPage.dirty(page.page().get())` 和 `totalPages.dirty()`；`Page.of` 的 `refresh()` 不会重新加载。只有当前页的分区参与订阅。

## 注意事项

> **注意：传 Signal，不要传 get() 的结果**
>
> `Page.of(shown, 9)` 要传 Signal 本身。传入 `shown.get()` 得到的是普通 List，`Page.of(List, ...)` 会复制那一刻的内容，之后筛选怎么变都不会更新。

> **注意：每名玩家一个 Page**
>
> 当前页码保存在 `Page` 对象里。每名玩家要有自己的 `Page` 才能独立翻页；底层的任务列表或数据库分区可以共用。

**示例共用的辅助方法**

```java
record Quest(String name, boolean done) {}

private static ItemStack questIcon(Quest quest) {
    return quest.done()
            ? named(Material.BOOK, "✔ " + quest.name())
            : named(Material.WRITABLE_BOOK, quest.name());
}

private static ItemStack named(Material material, String name) {
    ItemStack stack = new ItemStack(material);
    stack.setData(DataComponentTypes.CUSTOM_NAME,
            Component.text(name).decoration(TextDecoration.ITALIC, false)
    );
    return stack;
}
```

这里使用 Paper 的 `DataComponentTypes` 和 Adventure 的 `Component`、`TextDecoration`，与 [物品渲染](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/item/render.md) 中的写法相同。

**下一步**：[滚动内容](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal-ui/scroll.md) — 滚动显示会变长的列表，并显示当前位置。
