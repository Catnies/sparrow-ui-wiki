# Pagination and filtering

Source: <https://catnies.github.io/sparrow-ui-wiki/signal-ui/page>

The arrows in [Pagination Page](https://catnies.github.io/sparrow-ui-wiki/pagination/page.md) always look usable. This time the previous arrow grays out on the first page, the next on the last, and a "1 / 2" style page number sits in the middle.

`viewer` in the examples is the player opening the menu, and Sparrow UI initialization must have completed beforehand. `named` builds an item with a name; drop the method below into your menu class.

**The item naming helper shared by the examples**

```java
private static ItemStack named(Material material, String name) {
    ItemStack stack = new ItemStack(material);
    stack.setData(DataComponentTypes.CUSTOM_NAME,
            Component.text(name).decoration(TextDecoration.ITALIC, false));
    return stack;
}
```

It uses Paper's `DataComponentTypes` with Adventure's `Component` and `TextDecoration`, matching the style in [Item rendering](https://catnies.github.io/sparrow-ui-wiki/item/render.md).

## Arrows, page numbers, and content update together

Reusing the twelve diamond stacks with nine per page from that page, `amounts` becomes a `ListSignal`, so both the page content and the page count follow product changes.

```text title="Diamond catalog"
MMMMMMMMM
P###C###N
```

- `M`: current page (`diamond`)
- `P`: previous (`gray_dye`)
- `C`: page number (`paper`)
- `N`: next (`arrow`)

Page one initially. After flipping, the top shows the 10, 11, 12 stacks and the right arrow grays out.

```java
ListSignal<Integer> amounts = ListSignal.of();
amounts.addAll(IntStream.rangeClosed(1, 12).boxed().toList());
Page<Integer> page = Page.of(amounts, 9);
Signal<Boolean> hasPrevious = page.page().map(index -> index > 0);
Signal<Boolean> hasNext = Signals.combine(page.page(), page.count(),
        (index, count) -> index + 1 < count);

Item previous = Item.builder()
        .dependsOn(hasPrevious)
        .setItemProvider(context -> hasPrevious.get()
                ? named(Material.ARROW, "Previous page") : named(Material.GRAY_DYE, "Already on the first page"))
        .addClickGuard((item, click) -> hasPrevious.get())
        .addClickHandler(click -> page.advance(-1))
        .build();
Item next = Item.builder()
        .dependsOn(hasNext)
        .setItemProvider(context -> hasNext.get()
                ? named(Material.ARROW, "Next page") : named(Material.GRAY_DYE, "Already on the last page"))
        .addClickGuard((item, click) -> hasNext.get())
        .addClickHandler(click -> page.advance(1))
        .build();
Item pageNumber = Item.builder()
        .dependsOn(page.page(), page.count())
        .setItemProvider(context -> named(Material.PAPER,
                (page.page().get() + 1) + " / " + page.count().get()))
        .build();

Pane pane = Pane.builder("MMMMMMMMM", "P###C###N")
        .addIngredient('M', page,
                amount -> Element.item(Item.simple(new ItemStack(Material.DIAMOND, amount))))
        .addIngredient('P', previous)
        .addIngredient('C', pageNumber)
        .addIngredient('N', next)
        .build();
Window.builder(pane).setTitle("Diamond catalog").open(viewer);
```

`page()`'s page number starts at zero, so display adds one. Whether the next page exists depends on both the current page and the page count, hence the combined `hasNext`. Each button's look and its click guard read the same check, so grayed buttons also stop flipping.

Shrink the list to nine stacks and the page count becomes one; the current page falls back into range and both arrows gray out. An empty list still counts as one page, showing "1 / 1" with an empty content area.

### Filtered results or database paging

When the product list comes from a filter, just hand the full list Signal to `Page.of`. Continuing with `amounts`, enabling the filter below keeps only the stacks of five or fewer. Build the Pane with `filteredPage` where `page` sat before, and point the arrows' dependencies at that pagination.

```java
MutableSignal<Boolean> smallOnly = Signal.of(false);
Signal<List<Integer>> filtered = Signals.combine(amounts, smallOnly,
        (values, enabled) -> values.stream().filter(value -> !enabled || value <= 5).toList());
Page<Integer> filteredPage = Page.of(filtered, 9);
```

`smallOnly.set(true)` leaves five entries and the page count drops to one. Pass the Signal itself here; `filtered.get()` yields a plain List that `Page.of(List, ...)` would snapshot.

For database paging, keep the arrow and page-number wiring and swap the page source. Two options follow, where `repository` is your business repository, `findAmounts(offset, limit)` returns the stack counts, `count()` the record total, and `ioExecutor` the existing I/O executor.

**Two page-at-a-time sources**

```java
Page<Integer> page = Page.async(ioExecutor,
        index -> repository.findAmounts(index * 9, 9),
        () -> (repository.count() + 8) / 9);
```

`Page.async` manages the per-page cache and supports `refresh()` and `prefetch()`; the flow is covered in [Database pagination](https://catnies.github.io/sparrow-ui-wiki/pagination/page.md#lazy-loading-from-a-database).

If the business layer already exposes per-page partitioned data, hand it straight to `Page.of`. An async partition plus an independent total-page source shows the correspondence:

```java
KeyedSignal<Integer, List<Integer>> rowsByPage = KeyedSignal.async(
        List.of(), ioExecutor, index -> repository.findAmounts(index * 9, 9));
AsyncSignal<Integer> totalPages = Signal.async(1, ioExecutor,
        () -> (repository.count() + 8) / 9);
Page<Integer> page = Page.of(rowsByPage, totalPages);
```

Here refreshing is the sources' job, for instance `rowsByPage.dirty(page.page().get())` and `totalPages.dirty()`; `Page.of`'s `refresh()` does no reloading. Only the current page's partition joins the pagination's subscriptions.

Each player should hold their own `Page` so paging stays independent; the underlying product list or database partitions can be shared.

**Next**: [Scrolling contents](https://catnies.github.io/sparrow-ui-wiki/signal-ui/scroll.md) — Scroll a dynamic list and keep the position readout current.
