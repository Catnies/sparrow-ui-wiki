# Item display

Source: <https://catnies.github.io/sparrow-ui-wiki/signal-ui/item>

The attribute menu has a "Strength" button whose name shows the current level and the remaining skill points. Each click raises Strength by one and spends a point, and the name follows; once the points run out, clicking does nothing.

The button's look depends on two Signals. After a click, something has to tell the menu to redraw this slot, and only this slot.

## What dependsOn does

`Item.builder().dependsOn(signals...)` declares which Signals the item's look depends on. When any of them notifies, the slots showing this item run the Provider again on the next tick and get the new look.

Sparrow UI manages the subscription. It subscribes while the item is shown in a window and unsubscribes when the window closes, so you never keep a `Subscription` yourself.

## An attribute button

Step through and watch the button name change with each click.

```java
MutableSignal<Integer> strength = Signal.of(1);
MutableSignal<Integer> points = Signal.of(2);  // remaining skill points

Item strengthButton = Item.builder()
        .dependsOn(strength, points)  // the look depends on both Signals
        .setItemProvider(context -> {
            String name = "Strength Lv." + strength.get() + " (" + points.get() + " points left)";
            return named(Material.DIAMOND_SWORD, name);
        })
        .addClickGuard((item, click) -> points.get() > 0)  // ignore clicks without points
        .addClickHandler(click -> {
            points.update(value -> value - 1);
            strength.update(value -> value + 1);
        })
        .build();

Pane pane = Pane.builder("####S####")
        .addIngredient('S', strengthButton)
        .build();
Window.builder(pane).setTitle("Attributes").open(viewer);
```

1. **lines 1-2**: Strength is level 1 with 2 skill points left.
2. **lines 4-15**: The button depends on strength and points. The guard blocks clicks when no points are left.
3. **lines 17-20**: Opening the window runs the Provider once and shows the initial name.
4. **lines 11-14**: The player clicks. Both Signals change, but several notifications in one tick redraw this slot only once.
5. **lines 11-14**: Another click spends the last point.
6. **lines 10**: The third click is blocked by the guard. The handler does not run, nothing changes, and the button does not refresh.

The click handler only changes data and never calls `updateOnClick()`. Which slots redraw is decided by the `dependsOn` dependencies.

## Caveats

> **Warning: Reading in the Provider creates no dependency**
>
> Calling `strength.get()` in the Provider only reads the value once. Forget `dependsOn(strength)` and the button will not refresh when the data changes. Pass every Signal the look depends on to `dependsOn`; if you already combined them with [combine](https://catnies.github.io/sparrow-ui-wiki/signal/derive/combine.md), depend on the combined result.

> **Warning: Guard and look should read the same data**
>
> A button that looks clickable but is blocked, or the other way round, confuses players. Have the guard and the Provider read the same Signal so the two can never disagree.

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

**Next**: [Per-player display](https://catnies.github.io/sparrow-ui-wiki/signal-ui/player.md) — Share one button across windows while each viewer sees their own data.
