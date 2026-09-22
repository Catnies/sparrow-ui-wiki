# Visual layers

Source: <https://catnies.github.io/sparrow-ui-wiki/signal-ui/visual>

Slot five of the product menu normally shows a diamond. Clicking the marking toggle in the bottom-right should turn slot five into an emerald; clicking again restores the diamond. Only the display changes: clicking slot five still runs the original diamond button's handler.

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

## Toggling a product marking

The menu below stands alone. `highlighted` starts `false`, meaning nothing is marked yet.

```text title="Product marking"
####Q###H
```

- `Q`: product (`diamond`)
- `H`: marking toggle (`lime_dye`)

A diamond shows initially. With marking on, slot five displays an emerald named Featured product.

```java
MutableSignal<Boolean> highlighted = Signal.of(false);
Pane pane = Pane.builder("####Q###H")
        .addIngredient('Q', Item.builder()
                .setItemProviderConstant(named(Material.DIAMOND, "Pick the diamond"))
                .addClickHandler(click -> click.player().sendMessage(Component.text("Diamond picked")))
                .build())
        .addIngredient('H', Item.builder()
                .setItemProviderConstant(named(Material.LIME_DYE, "Toggle product marking"))
                .addClickHandler(click -> highlighted.update(value -> !value))
                .build())
        .build();
Window window = Window.builder(pane).setTitle("Product marking").build(viewer);

ItemStack mark = named(Material.EMERALD, "Featured product");
window.setVisualizerItem(4, actual -> highlighted.get() ? mark : actual);
window.visual().bind(highlighted);
window.open();
```

`visual().bind` requests a visual-layer redraw whenever the Signal changes, and the mapping reads the current value. Slots count from zero, so `4` is the template's `Q`. Once the emerald displays, clicking it still delivers "Diamond picked"; visual mappings never change content or click behavior.

The binding belongs to this Window, so only its viewer is affected. To let every viewer of one Pane see mapping changes together, configure the mapping on the Pane's visual layer and bind the source there; each layer's scope is covered in [Visual layers](https://catnies.github.io/sparrow-ui-wiki/visual/layers.md).

Visual bindings on a Window start and stop with its open state, and the returned `Subscription` can unbind early. List bindings on a shared Pane may stay active even with no Window watching, so closing one Window does not stop every shared source's queries.

**Next**: [Listening to packets (optional)](https://catnies.github.io/sparrow-ui-wiki/network/listen.md) — The extra packet-listening capability; skippable if you only write menus.
