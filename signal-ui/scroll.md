# Scrolling contents

Source: <https://catnies.github.io/sparrow-ui-wiki/signal-ui/scroll>

The achievements menu shows unlocked achievements in three columns, two rows at a time. When the player scrolls down, the button should show which row they are on; at the bottom, it should stop responding.

New achievements keep unlocking. As the list grows, the scrollable range has to grow too.

## What Scroll's Signals do

`Scroll.vertical(list, width, rows)` accepts a `ListSignal` directly, and when the list changes, the visible contents and the scrollable range update together.

It provides two Signals. `line()` is the current row, starting at 0; `maxLine()` is the furthest row you can scroll to, 0 when the contents fit on one screen. Buttons that depend on them refresh when scrolling or when the list changes.

## Achievement list

```java
MutableListSignal<String> achievements = ListSignal.of();
achievements.addAll(List.of(
        "Stone Age", "Acquire Hardware", "Diamonds!", "Enchanter", "Nether", "Into Fire",
        "Eye Spy", "The End?", "Free the End", "Beaconator", "Ocean Monument", "Max Enchant"
));
Scroll<String> scroll = Scroll.vertical(achievements, 3, 2);  // 3 columns, 2 rows visible

Item down = Item.builder()
        .dependsOn(scroll.line(), scroll.maxLine())
        .setItemProvider(context -> {
            String text = "Scroll down (row " + (scroll.line().get() + 1) + ")";
            return named(Material.ARROW, text);
        })
        .addClickGuard((item, click) -> scroll.line().get() < scroll.maxLine().get())
        .addClickHandler(click -> scroll.advance(1))
        .build();

Pane pane = Pane.builder("###MMM###", "###MMM###", "########D")
        .addIngredient('M', scroll, name ->
                Element.item(Item.simple(named(Material.GOLD_INGOT, name)))
        )
        .addIngredient('D', down)
        .build();
Window.builder(pane).setTitle("Achievements").open(viewer);

achievements.add("Dragon Slayer");  // the list grows, so there is one more row to scroll
```

1. **lines 1-6**: Twelve achievements make four rows. Two rows show at a time, so you can scroll to row 2 (counting from 0).
2. **lines 18-24**: Open the menu; the first six achievements show.
3. **lines 14-15**: Scroll down one row to show achievements 4 to 9. Neighboring screens overlap; each scroll moves one row.
4. **lines 14-15**: At the bottom.
5. **lines 14**: Another click is blocked by the guard; the position stays.
6. **lines 26**: A new achievement unlocks. The list becomes five rows, maxLine becomes 3, and the button can scroll again.

For up and down buttons, the up button uses `scroll.advance(-1)` with the guard `scroll.line().get() > 0`.

## Caveats

> **Warning: The position belongs to this Scroll**
>
> As with `Page`, the current row lives in the `Scroll` object. Each player needs their own `Scroll` to scroll independently; the underlying achievement list can be shared.

> **Warning: Shrinking lists pull the position back**
>
> When the list shrinks and the scrollable range gets smaller, the current row falls back into `[0, maxLine]` automatically. When the contents fit on one screen, you cannot scroll either way.

**The naming helper used in the examples**

```java
private static ItemStack named(Material material, String name) {
    ItemStack stack = new ItemStack(material);
    stack.setData(DataComponentTypes.CUSTOM_NAME,
            Component.text(name).decoration(TextDecoration.ITALIC, false)
    );
    return stack;
}
```

It uses Paper's `DataComponentTypes` with Adventure's `Component` and `TextDecoration`, matching [Item rendering](https://catnies.github.io/sparrow-ui-wiki/item/render.md).

**Next**: [Tab selection state](https://catnies.github.io/sparrow-ui-wiki/signal-ui/tab.md) — Switch tab contents and mark the selected tab.
