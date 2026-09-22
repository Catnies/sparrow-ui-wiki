# Programmatic layouts

Source: <https://catnies.github.io/sparrow-ui-wiki/pane/programmatic>

Slots on a Pane can also be filled directly by slot index or coordinate, without a character template, or you can pick an ordered set of slots first and fill them one by one. Once the menu is open, all of these methods remain callable.

> **Info: Prefer character templates**
>
> For menus with a fixed shape, the [character layout](https://catnies.github.io/sparrow-ui-wiki/pane/structure.md) and [filling content](https://catnies.github.io/sparrow-ui-wiki/pane/ingredients.md) styles read better, because the template itself is the menu's picture. Use this page's methods in two situations: the layout can only be computed at runtime, or certain slots must be replaced after the menu opens.

## Filling slots

### Creating a blank Pane

When the size is only known at runtime, create a blank Pane first and add content afterwards. Below, the row count follows the reward count, nine rewards per row:

```java
List<ItemStack> rewards = List.of(
        new ItemStack(Material.DIAMOND),
        new ItemStack(Material.EMERALD),
        new ItemStack(Material.GOLD_INGOT)
);

int rows = Math.clamp((rewards.size() + 8) / 9, 1, 6);
Pane pane = Pane.empty(9, rows);
```

| Entry point | Resulting Pane |
| - | - |
| `Pane.empty(width, height)` | A blank Pane |
| `Pane.filled(width, height, item)` | Every slot holds the same Item |
| `Pane.single(item)` | One slot holding this Item |
| `Pane.builder(width, height)` | A blank-layout Builder that can still set background and freeze |

### Placing by position

`setItem` places an Item by slot index or coordinate; the conversion between them is covered in [Slots and coordinates](https://catnies.github.io/sparrow-ui-wiki/pane/structure.md#slots-and-coordinates):

```java
Pane pane = Pane.empty(9, 3);
pane.setItem(13, Item.simple(new ItemStack(Material.BOOK)));     // slot 13, dead center
pane.setItem(0, 2, Item.simple(new ItemStack(Material.ARROW)));  // coordinate (0, 2), bottom-left
```

| Method | Purpose |
| - | - |
| `setItem(slot, item)`, `setItem(x, y, item)` | Put an Item in this slot |
| `setElement(slot, element)`, `setElement(x, y, element)` | Put an [Element](https://catnies.github.io/sparrow-ui-wiki/pane/ingredients.md#generating-content-per-slot-elementsupplier-element) in this slot |
| `setPane(slot, pane, paneSlot)` | Make this slot display slot `paneSlot` of another Pane |

Calling these after the menu opens updates every Window currently showing the Pane immediately. Below, the chest turns into gray dye after the first click, marking it as claimed:

```java
Pane pane = Pane.empty(9, 1);
Item claimed = Item.simple(new ItemStack(Material.GRAY_DYE));
pane.setItem(4, Item.builder()
        .setItemProviderConstant(new ItemStack(Material.CHEST))
        .addClickHandler(click -> pane.setItem(4, claimed))
        .build());
```

If the instance placed is the same one as before, the Pane considers the content unchanged and does not refresh. When the content has not changed but needs to be drawn again, call `pane.dirty(slot)`.

> **Warning: Panes must not nest in a cycle**
>
> `setPane` can establish nesting after both Panes exist, so cycles are possible: a slot of A displays B, and a slot of B displays A. When a Window tries to display such a slot, it throws an `IllegalStateException`.

### Filling in bulk

The `fill` methods fill an area with one Item:

| Method | Fill range |
| - | - |
| `fill(item)` | The whole Pane |
| `fill(start, end, item)` | Slots `start` through `end - 1` |
| `fillRow(row, item)` | One row |
| `fillColumn(column, item)` | One column |
| `fillBorders(item)` | The ring around the edge |
| `fillRectangle(x, y, width, height, item)` | A rectangle with its top-left at `(x, y)` |
| `fillRectangle(x, y, pane)` | Nest a whole other Pane into the area with its top-left at `(x, y)` |

Every method accepts one extra trailing `replaceExisting` argument. Omitted, it defaults to `true` and overwrites existing content; pass `false` to fill only slots that are still empty. Below, the border and a book go in first, then the remaining slots are filled with `false`:

```java
Item border = Item.simple(new ItemStack(Material.BLACK_STAINED_GLASS_PANE));
Item filler = Item.simple(new ItemStack(Material.GRAY_STAINED_GLASS_PANE));

Pane pane = Pane.empty(9, 5);
pane.fillBorders(border);
pane.setItem(4, 2, Item.simple(new ItemStack(Material.BOOK)));
pane.fill(filler, false);
```

```text title="Bulk fill"
---------
-+++++++-
-+++B+++-
-+++++++-
---------
```

- `-`: fillBorders(border) (`black_stained_glass_pane`)
- `B`: setItem(4, 2, ...) (`book`)
- `+`: fill(filler, false) (`gray_stained_glass_pane`)

Without `false`, `fill` would overwrite the border and the book with gray glass panes too.

### Appending to empty slots

`addItems` walks from slot 0 in reading order, left to right then top to bottom, putting each Item into the next empty slot and skipping slots that already have content. Continuing the blank Pane example, the rewards go in one after another:

```java
for (ItemStack reward : rewards) {
    pane.addItems(Item.simple(reward));
}
```

> **Warning: Items that no longer fit are dropped silently**
>
> Once the empty slots run out, leftover Items are neither placed nor reported. Lists that may exceed one screen belong in [Pagination Page](https://catnies.github.io/sparrow-ui-wiki/pagination/page.md).

## Slot sequences

A `SlotSequence` is an ordered set of slots. Pick the slots first, then generate content for each with `setElements`. This fits cases where every slot's content differs and the placement order matters.

### Creating a slot sequence

| Form | Slots selected, in order |
| - | - |
| `SlotSequence.all(size)` | All slots, left to right, top to bottom |
| `SlotSequence.row(size, row)` | One full row, left to right |
| `SlotSequence.column(size, column)` | One full column, top to bottom |
| `SlotSequence.range(size, start, end)` | Slots `start` through `end - 1` |
| `SlotSequence.rectangle(size, x, y, width, height)` | A rectangle, collected row by row |
| `SlotSequence.borders(size)` | The ring around the edge |
| `SlotSequence.of(size, slot...)` | The given slots, in the given order |
| `SlotSequence.concat(sequence...)` | Several groups joined into one, with no duplicate slots |
| `pane.slots("G")` | The slots occupied by identifier `G` in the template |

`size` is the Pane's size, obtained with `pane.size()`.

### Generating content along the sequence

`setElements` generates content for every slot in the sequence the same way an [ElementSupplier](https://catnies.github.io/sparrow-ui-wiki/pane/ingredients.md#generating-content-per-slot-elementsupplier-element) does; `occurrence` is the slot's position within the sequence:

```java
Pane pane = Pane.empty(9, 3);
SlotSequence middle = SlotSequence.row(pane.size(), 1);

// The second row gets 1 through 9 sheets of paper, left to right.
pane.setElements(
        middle,
        (slots, occurrence) -> Element.item(Item.simple(new ItemStack(Material.PAPER, occurrence + 1))),
        true
);
```

The last argument is again `replaceExisting`.

> **Warning: The sequence must match the Pane's size**
>
> A `SlotSequence` is bound to one `PaneSize` at creation. Using it on a Pane of a different size makes `setElements` throw an `IllegalArgumentException`.
>
> If content generation throws, the Pane is left untouched and the exception propagates to the caller as is.

### Reordering or filtering

`transform(SlotPattern)` reorders a sequence or keeps only part of it. `SlotPatterns` provides a few:

| Form | Result |
| - | - |
| `SlotPatterns.ROW_MAJOR` | Row by row, left to right within each row |
| `SlotPatterns.COLUMN_MAJOR` | Column by column, top to bottom within each column |
| `SlotPatterns.CHECKERBOARD_EVEN` | Only slots where `x + y` is even, one color of a checkerboard |
| `SlotPatterns.CHECKERBOARD_ODD` | Only slots where `x + y` is odd |

Template areas can be treated the same way. The builder's `addModifier` runs after the Pane is created, so this page's methods can continue on top of the template. `slots` also accepts a `SlotPattern`; below, the `G` area is numbered column by column:

```java
Pane pane = Pane.builder(
                "#########",
                "#GGGGGGG#",
                "#GGGGGGG#",
                "#########"
        )
        .addModifier(target -> target.setElements(
                target.slots(SlotPatterns.COLUMN_MAJOR, "G"),
                (slots, occurrence) -> Element.item(Item.simple(new ItemStack(Material.PAPER, occurrence + 1))),
                true
        ))
        .build();
```

Numbering runs downward first, then rightward: the first column holds 1 and 2, the second 3 and 4:

```text title="Numbered by column"
#########
#GGGGGGG#
#GGGGGGG#
#########
```

- `G`: COLUMN\_MAJOR order (`paper`)
- `#`: empty

For other orders, implement `SlotPattern` yourself and hand the candidate slots to the output in whatever order you want.

> **Info: Sequences that follow the data**
>
> `project` makes a set of slots follow a Signal-backed list: when the list updates, content is placed again automatically. See [Signals in the UI](https://catnies.github.io/sparrow-ui-wiki/signal-ui/list.md).

**Next**: [Opening and closing](https://catnies.github.io/sparrow-ui-wiki/window/lifecycle.md) — Create a Window, open and close menus, and build them off the main thread.
