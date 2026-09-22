# Window titles

Source: <https://catnies.github.io/sparrow-ui-wiki/signal-ui/title>

Sometimes the player's chosen quantity belongs in the Window's title. `setTitleSupplier` computes the title, and `window.bind` connects quantity changes to `updateTitle()`.

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

## A title that follows the quantity

The title below starts at "Buying 1" and becomes "Buying 2" after clicking the diamond. The binding is declared before the Window opens.

```text title="Buying 1"
####Q####
```

- `Q`: add one (`diamond`)

The title starts at Buying 1. Clicking the diamond makes it Buying 2, while the item's name stays Add one.

```java
MutableSignal<Integer> quantity = Signal.of(1);
Pane pane = Pane.builder("####Q####")
        .addIngredient('Q', Item.builder()
                .setItemProviderConstant(named(Material.DIAMOND, "Add one"))
                .addClickHandler(click -> quantity.update(value -> value + 1))
                .build())
        .build();
Window window = Window.builder(pane)
        .setTitleSupplier(() -> Component.text("Buying " + quantity.get()))
        .build(viewer);
window.bind(quantity, Window::updateTitle);
window.open();
```

The title computes on first open. `window.bind` does not invoke the callback immediately; it waits for Signal notifications to request updates. The binding activates while the Window is open, pauses on close, and resumes on reopen. `updateTitle()` hands the title update to the player thread; a plain `bind` callback itself does not switch threads.

**Next**: [Visual layers](https://catnies.github.io/sparrow-ui-wiki/signal-ui/visual.md) — Swap a product's visual marking through a Signal.
