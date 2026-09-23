# Visual layers

Source: <https://catnies.github.io/sparrow-ui-wiki/signal-ui/visual>

The fifth slot of the treasure hunt menu is plain floor. When the player turns on "Treasure detector" in the bottom right, that slot should show an emerald saying the treasure is here; turning it off brings the floor back. Whatever it looks like, clicking it should still run the floor's own handler.

Replacing the floor with another item would replace the click behavior too. The only thing to change here is how it looks.

## What visual bindings do

`window.setVisualizerItem(slot, mapper)` sets a display mapping on a slot. The mapper receives the slot's actual item and returns what the player should see. It only changes the display, not the slot's contents or click behavior.

`window.visual().bind(signal)` recomputes the visual layer when the Signal changes. Read the Signal's current value inside the mapper to switch the display with a toggle.

## Treasure detector

```java
MutableSignal<Boolean> detecting = Signal.of(false);

Pane pane = Pane.builder("####T###D")
        .addIngredient('T', Item.builder()
                .setItemProviderConstant(named(Material.GRAY_STAINED_GLASS_PANE, "Some floor"))
                .addClickHandler(click -> {
                    click.player().sendMessage(Component.text("You dug up the floor"));
                })
                .build()
        )
        .addIngredient('D', Item.builder()
                .setItemProviderConstant(named(Material.MAP, "Toggle treasure detector"))
                .addClickHandler(click -> detecting.update(value -> !value))
                .build()
        )
        .build();
Window window = Window.builder(pane).setTitle("Treasure hunt").build(viewer);

ItemStack mark = named(Material.EMERALD, "The treasure is here");
window.setVisualizerItem(4, actual -> detecting.get() ? mark : actual);  // slot 4 is T
window.visual().bind(detecting);
window.open();
```

1. **lines 1-17**: The menu has a floor slot and a detector toggle.
2. **lines 19-22**: Slots start at 0, so 4 is the T in the template. With the detector off, the mapper returns the floor unchanged.
3. **lines 13**: Turn the detector on. The visual layer recomputes and the fifth slot shows an emerald.
4. **lines 6-8**: Clicking the emerald still runs the floor's handler. Visual mappings do not change click behavior. Prints You dug up the floor.
5. **lines 13**: Turn the detector off and the floor is back.

## Caveats

> **Warning: Window mappings only affect this player**
>
> The binding sits on this one Window, so only its viewer sees the change. For every viewer of a shared Pane to see it, set the mapping on the Pane's visual layer and bind the source there; see [Visual layers](https://catnies.github.io/sparrow-ui-wiki/visual/layers.md) for the scope of each layer.

> **Warning: When bindings run**
>
> Window visual bindings are active while the window is open and paused when it closes, and the `Subscription` returned by `bind` can unbind early. Bindings on shared Panes may stay active with no window watching, so closing one window does not stop every shared source.

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

**Next**: [Listening to packets (optional)](https://catnies.github.io/sparrow-ui-wiki/network/listen.md) — Learn about the extra packet listening features; skip this if you only build menus.
