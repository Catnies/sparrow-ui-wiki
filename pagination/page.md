# Pagination Page

Source: <https://catnies.github.io/sparrow-ui-wiki/pagination/page>

When a catalog has more entries than one page can hold, `Page` splits it across pages. Give it a list and a page size, and buttons can flip to the previous or next page.
Page owns the page number and the data per page; the Pane decides which slots hold that content. Once the two are linked through `addIngredient`, flipping pages updates the items in those slots automatically.

## Building a paginated menu

Below, 12 diamond stacks are shown nine per page: a row of content on top, with page buttons at either end of the row below. Each stack's count matches its position in the list, so the two pages are easy to tell apart.

```text title="Diamond catalog"
MMMMMMMMM
P#######N
```

- `M`: current page (`diamond`)
- `P`: previous (`arrow`)
- `N`: next (`arrow`)

The preview shows page one; page two displays the three stacks with counts 10, 11, 12.

```java
// Twelve diamond stacks with counts 1 to 12, so each entry is identifiable
List<Item> items = IntStream.rangeClosed(1, 12)
        .mapToObj(amount -> Item.simple(new ItemStack(Material.DIAMOND, amount)))
        .toList();
// Nine per page, matching the nine M slots in the template below
Page<Item> page = Page.of(items, 9);

ItemStack previousArrow = new ItemStack(Material.ARROW);
previousArrow.setData(DataComponentTypes.CUSTOM_NAME,
        Component.text("Previous page", NamedTextColor.YELLOW).decoration(TextDecoration.ITALIC, false));
ItemStack nextArrow = new ItemStack(Material.ARROW);
nextArrow.setData(DataComponentTypes.CUSTOM_NAME,
        Component.text("Next page", NamedTextColor.YELLOW).decoration(TextDecoration.ITALIC, false));

// M follows the page number; P and N stay at the bottom ends
Pane pane = Pane.builder("MMMMMMMMM", "P#######N")
        .addIngredient('M', page)
        .addIngredient('P', Item.builder()
                .setItemProviderConstant(previousArrow)
                // Negative flips backward; clicking on the first page stays there
                .addClickHandler(click -> page.advance(-1))
                .build())
        .addIngredient('N', Item.builder()
                .setItemProviderConstant(nextArrow)
                // After flipping, the M slots automatically show the new page
                .addClickHandler(click -> page.advance(1))
                .build())
        .build();

Window.builder(pane).setTitle("Diamond catalog").open(viewer);
```

`Page.of(items, 9)` groups the list in order. `addIngredient('M', page)` fills the current page into the M slots following the character template, left to right, top to bottom. Page two has only three entries, so the remaining six slots are cleared rather than keeping page one's diamonds.

> **Warning: Page size versus slot count**
>
> The page size must be positive, and there must be enough slots to display a page. The example shows 9 entries in 9 M slots. Bind only 8 slots and the 9th entry neither displays nor carries over to the next page.

### Flipping and jumping

| Call | Action |
| - | - |
| `page.advance(1)` | Next page |
| `page.advance(-1)` | Previous page |
| `page.setPage(0)` | Jump to the first page |
| `page.setPage(1)` | Jump to the second page |

Page numbers start at 0. Out-of-range requests clamp to the nearest end, so previous on the first page and next on the last are both safe. An empty list still counts as one page, just with nothing to show.

The arrows here never change. To show the page number or gray out the buttons at either end, use the Signals from `page()` and `count()`; see [Paging buttons and page numbers](https://catnies.github.io/sparrow-ui-wiki/signal-ui/page.md).

### List changes and refreshing

`Page.of(List, pageSize)` copies the list. Adding, removing, or replacing elements in the original afterwards does not affect the pagination; the Item objects inside are still the same instances, so changing an Item's display still works.

`refresh()` only applies to the async pagination below; it does not re-read a plain List handed to `Page.of`. To have pagination follow list changes, see [Paging buttons and page numbers](https://catnies.github.io/sparrow-ui-wiki/signal-ui/page.md).

## Lazy loading from a database

When menu entries come from a database, loading everything just to open the menu makes no sense. All you really need is the total page count and the data for the current page.
`Page.async(...)` builds a paginated menu that loads on demand. Whichever page a player flips to is the one that gets queried; nothing loads before the menu opens.

Using a product catalog as the example, each page queries 9 products from the database. `repository` is your plugin's own database access object, `findPage(offset, limit)` returns products in a range, and `count()` returns the total. The example runs both queries on Paper's async scheduler.

```java
public void openCatalog(Player viewer, Plugin plugin, ProductRepository repository) {
    int pageSize = 9;
    Executor executor = task -> Bukkit.getAsyncScheduler().runNow(plugin, ignored -> task.run());

    Page<Product> page = Page.async(
            executor,
            // Page numbers start at 0: page one takes 9 from offset 0, page two from offset 9
            index -> repository.findPage(index * pageSize, pageSize),
            // Returns the total page count; round the product total up per page size
            () -> (repository.count() + pageSize - 1) / pageSize
    );

    Pane pane = Pane.builder("MMMMMMMMM", "P###R###N")
            .addIngredient('M', page, product -> {
                // Once the query completes, build the display item from the product data
                ItemStack icon = new ItemStack(product.icon());
                icon.setData(DataComponentTypes.CUSTOM_NAME,
                        Component.text(product.name(), NamedTextColor.WHITE)
                                .decoration(TextDecoration.ITALIC, false));
                return Element.item(Item.simple(icon));
            })
            .addIngredient('P', Item.builder()
                    .setItemProviderConstant(new ItemStack(Material.ARROW))
                    .addClickHandler(click -> page.advance(-1))
                    .build())
            .addIngredient('N', Item.builder()
                    .setItemProviderConstant(new ItemStack(Material.ARROW))
                    .addClickHandler(click -> {
                        page.advance(1);
                        // While the player reads this page, query the next one ahead of time
                        page.prefetch(1);
                    })
                    .build())
            .addIngredient('R', Item.builder()
                    .setItemProviderConstant(new ItemStack(Material.CLOCK))
                    // The clock in the middle re-queries the current page and page count
                    .addClickHandler(click -> page.refresh())
                    .build())
            .build();

    Window.builder(pane).setTitle("Product catalog").open(viewer);
}
```

**Product data and the database interface**

An interface stands in for the existing query methods; the implementation belongs to your plugin. Paginated queries should use a fixed order, for instance sorting by product ID, so consecutive pages stay consistent.

```java
record Product(String name, Material icon) {}

interface ProductRepository {
    /** Queries products in a fixed order; offset is the start position, limit the maximum rows. */
    List<Product> findPage(int offset, int limit);

    /** Counts all products, using the same conditions as findPage. */
    int count();
}
```

Creating the Page submits the page-count query right away; each page's products are queried on first read. Until the result returns, that page is empty; once it does, the Pane shows the products automatically. Loaded pages are cached, so flipping back reuses the cache. `Page.async`'s third argument is the page count; even a 0 is treated as one page.

> **Warning: Queries run on an async thread**
>
> The database access object must support async calls, and the two queries may run concurrently. Query functions should only return product data; do not read player, world, or Bukkit container state inside them.

### Prefetching the next page

`page.prefetch(1)` loads the page after the current one without changing the page number. The example calls it after advancing, so the following page starts loading while the player reads this one. `prefetch(-1)` loads the previous page instead.

Prefetching uses the same async Executor and never re-queries already loaded pages. A target page out of range is treated as the first or last page. Before the page count loads, it is assumed to be one page, so `prefetch(1)` can then only load the first page.

### Re-querying the current page

When products in the database change, `page.refresh()` re-queries the current page and the page count. It does not refresh other pages' caches and does not send the player back to page one; if the page count shrank, an out-of-range page number falls back to the last page.

## Turning data into items

The list inside a Page can hold raw business data; converting everything to Items up front is unnecessary. Doing it this way means Items are only created when a player actually looks at the menu, which cuts down on wasted objects. Pass `addIngredient` an extra converter and the current page's data becomes `Element`s.

Below, three materials show per page. The list holds a `Page<Material>` and the converter builds a display item for each.

```java
// The list stores material types; Items are created only when a page is displayed
Page<Material> page = Page.of(List.of(
        Material.STONE, Material.OAK_LOG, Material.GLASS,
        Material.IRON_INGOT, Material.GOLD_INGOT, Material.DIAMOND
), 3);

Pane pane = Pane.builder("###MMM###", "P#######N")
        // One slot per entry; the converter result must be wrapped in an Element
        .addIngredient('M', page, material -> Element.item(Item.simple(new ItemStack(material))))
        .addIngredient('P', Item.builder()
                .setItemProviderConstant(new ItemStack(Material.ARROW))
                .addClickHandler(click -> page.advance(-1))
                .build())
        .addIngredient('N', Item.builder()
                .setItemProviderConstant(new ItemStack(Material.ARROW))
                .addClickHandler(click -> page.advance(1))
                .build())
        .build();

Window.builder(pane).setTitle("Material catalog").open(viewer);
```

If the list already holds Items, use the two-argument form from the previous section and skip the converter.

> **Warning: The converter's thread**
>
> The first conversion runs on the thread building the Pane; later conversions default to an async thread. Converters should only use data that is already prepared, not read player, world, or Bukkit container state. Item click handlers still run on the player thread.

## Advanced: different sizes per page

`Page.of` also accepts an `IntUnaryOperator`, letting the page number decide how many entries it holds. The page number it receives starts at 0, and the return value must be positive.
For instance, the first page shows 3 entries and the rest 6. Content stays continuous; entries are never skipped because page sizes differ.

```java
List<Item> items = IntStream.rangeClosed(1, 12)
        .mapToObj(amount -> Item.simple(new ItemStack(Material.DIAMOND, amount)))
        .toList();
// Page 0 holds 3 entries, the rest 6 each
IntUnaryOperator pageSizeOf = index -> index == 0 ? 3 : 6;
Page<Item> page = Page.of(items, pageSizeOf);

// Reserve 6 slots for the largest page; shorter pages clear the rest
Pane pane = Pane.builder("#MMMMMM##", "P#######N")
        .addIngredient('M', page)
        .addIngredient('P', Item.builder()
                .setItemProviderConstant(new ItemStack(Material.ARROW))
                .addClickHandler(click -> page.advance(-1))
                .build())
        .addIngredient('N', Item.builder()
                .setItemProviderConstant(new ItemStack(Material.ARROW))
                .addClickHandler(click -> page.advance(1))
                .build())
        .build();

Window.builder(pane).setTitle("Varying page sizes").open(viewer);
```

The list splits into three pages showing entries 1-3, 4-9, and 10-12. The Pane reserves six M slots to fit the largest page; the first and last pages use only the first three slots and leave the rest empty. Changing page sizes never reshapes the Pane or centers content automatically.

`pageSizeOf` runs several times while computing the page count and content positions, so the same page number should always return the same size. For a uniform size, just pass the integer.

**Next**: [Scroll](https://catnies.github.io/sparrow-ui-wiki/pagination/scroll.md) — Move content row by row or column by column, keeping the neighboring parts visible.
