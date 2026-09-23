# Pagination and filtering

Source: <https://catnies.github.io/sparrow-ui-wiki/signal-ui/page>

The quest log has twelve quests, nine per page. On the first page "Previous" should be gray, on the last page "Next" should be gray, and a page number like "1 / 2" sits in the middle.

The arrows in [Page](https://catnies.github.io/sparrow-ui-wiki/pagination/page.md) always look active, because they do not know which page is showing. A player on the first page clicks "Previous", nothing happens, and the button still looks clickable.

## What Page's Signals do

`Page` provides two Signals. `page()` is the current page index, starting at 0; `count()` is the total number of pages. Buttons that depend on them refresh when the page turns.

`Page.of` also accepts a `ListSignal` or `Signal<List<T>>` directly. When the list changes, the current page's contents and the page count follow.

## A quest log

`Quest` is a record, and `questIcon` draws finished quests as books and unfinished ones as book and quill. Both helpers are at the bottom of the page.

```java
MutableListSignal<Quest> quests = ListSignal.of();
for (int i = 1; i <= 12; i++) {
    quests.add(new Quest("Quest " + i, i <= 4));  // the first four are done
}
Page<Quest> page = Page.of(quests, 9);  // 9 per page

Signal<Boolean> hasPrevious = page.page().map(index -> index > 0);
Signal<Boolean> hasNext = Signals.combine(page.page(), page.count(),
        (index, count) -> index + 1 < count
);

Item previous = Item.builder()
        .dependsOn(hasPrevious)
        .setItemProvider(context -> {
            return hasPrevious.get()
                    ? named(Material.ARROW, "Previous")
                    : named(Material.GRAY_DYE, "First page");
        })
        .addClickGuard((item, click) -> hasPrevious.get())
        .addClickHandler(click -> page.advance(-1))
        .build();
Item next = Item.builder()
        .dependsOn(hasNext)
        .setItemProvider(context -> {
            return hasNext.get()
                    ? named(Material.ARROW, "Next")
                    : named(Material.GRAY_DYE, "Last page");
        })
        .addClickGuard((item, click) -> hasNext.get())
        .addClickHandler(click -> page.advance(1))
        .build();
Item pageNumber = Item.builder()
        .dependsOn(page.page(), page.count())
        .setItemProvider(context -> {
            String text = (page.page().get() + 1) + " / " + page.count().get();  // page index starts at 0
            return named(Material.PAPER, text);
        })
        .build();

Pane pane = Pane.builder("MMMMMMMMM", "P###C###N")
        .addIngredient('M', page, quest -> Element.item(Item.simple(questIcon(quest))))
        .addIngredient('P', previous)
        .addIngredient('C', pageNumber)
        .addIngredient('N', next)
        .build();
Window.builder(pane).setTitle("Quest log").open(viewer);
```

1. **lines 1-5**: Twelve quests, nine per page, two pages.
2. **lines 7-10**: Going back only depends on the page index; going forward needs the index and the page count, hence combine.
3. **lines 40-46**: Open the first page. Previous is gray, and the guard reads the same check, so clicking it does not turn the page.
4. **lines 29-30**: Click Next. The second page only has quests 10 to 12, and the two arrows swap looks.
5. **lines 19-20**: Click Previous to go back to the first page.

When the list shrinks to nine, the page count becomes 1, the current page falls back into range, and both arrows turn gray. An empty list counts as one page: the number shows "1 / 1" and the content area is empty.

## Only unfinished quests

To filter, combine the full list and the filter switch into a new list Signal and hand that to `Page.of`.

```java
MutableSignal<Boolean> unfinishedOnly = Signal.of(false);
Signal<List<Quest>> shown = Signals.combine(quests, unfinishedOnly, (all, enabled) ->
        all.stream().filter(quest -> !enabled || !quest.done()).toList()
);
Page<Quest> page = Page.of(shown, 9);
```

After `unfinishedOnly.set(true)`, eight unfinished quests remain and the page count becomes 1 by itself. The arrows and page number stay unchanged.

## Loading pages from a database

When quests live in a database, the arrows and page number stay the same; only the page source changes. `repository.findQuests(offset, limit)` returns one page of quests and `repository.count()` returns the total.

**Two ways to load by page**

```java
Page<Quest> page = Page.async(ioExecutor,
        index -> repository.findQuests(index * 9, 9),
        () -> (repository.count() + 8) / 9
);
```

`Page.async` caches pages and supports `refresh()` and `prefetch()`; see [database paging](https://catnies.github.io/sparrow-ui-wiki/pagination/page.md#lazy-loading-from-a-database).

If your code already has a source partitioned by page, pass it to `Page.of` directly.

```java
KeyedSignal<Integer, List<Quest>> questsByPage = KeyedSignal.async(
        List.of(), ioExecutor, index -> repository.findQuests(index * 9, 9)
);
AsyncSignal<Integer> totalPages = Signal.async(
        1, ioExecutor, () -> (repository.count() + 8) / 9
);
Page<Quest> page = Page.of(questsByPage, totalPages);
```

Refreshing is then up to the sources, such as `questsByPage.dirty(page.page().get())` and `totalPages.dirty()`; `refresh()` on `Page.of` does not reload. Only the current page's partition takes part in the subscription.

## Caveats

> **Warning: Pass the Signal, not the result of get()**
>
> `Page.of(shown, 9)` needs the Signal itself. Passing `shown.get()` gives a plain List, and `Page.of(List, ...)` copies its contents at that moment, so later filtering never shows up.

> **Warning: One Page per player**
>
> The current page lives in the `Page` object. Each player needs their own `Page` to turn pages independently; the underlying quest list or database partitions can be shared.

**Helpers used in the examples**

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

It uses Paper's `DataComponentTypes` with Adventure's `Component` and `TextDecoration`, matching [Item rendering](https://catnies.github.io/sparrow-ui-wiki/item/render.md).

**Next**: [Scrolling contents](https://catnies.github.io/sparrow-ui-wiki/signal-ui/scroll.md) — Scroll through a growing list and show the current position.
