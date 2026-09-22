# Item display

Source: <https://catnies.github.io/sparrow-ui-wiki/signal-ui/item>

In the purchase menu, the player clicks the diamond and the quantity rises by one each time. The button's name starts at "Quantity: 1" and should read "Quantity: 2" after the click. The quantity belongs to this menu open alone, so the menu creates a plain Signal at build time.

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

## The button follows the quantity

```text title="Pick a quantity"
####Q####
```

- `Q`: quantity button (`diamond`)

The initial quantity is 1. Clicking changes the number in the name; the diamond's stack size stays 1.

```java
MutableSignal<Integer> quantity = Signal.of(1);
Item amountButton = Item.builder()
        .dependsOn(quantity)
        .setItemProvider(context -> named(Material.DIAMOND, "Quantity: " + quantity.get()))
        .addClickHandler(click -> quantity.update(value -> value + 1))
        .build();

Pane pane = Pane.builder("####Q####")
        .addIngredient('Q', amountButton)
        .build();
Window.builder(pane).setTitle("Pick a quantity").open(viewer);
```

`dependsOn(quantity)` declares that this Item's display depends on the quantity. The click only writes data; the library requests a redraw of every position showing the Item, the provider runs again, and the new name appears. No `updateOnClick()` needed.

Merely reading `quantity.get()` inside the provider does not create a dependency. When the look depends on several independent states, pass them together with `dependsOn(quantity, price)`; if a `combine` already derived the total, depending on the total Signal works too.

**Next**: [Per-player display](https://catnies.github.io/sparrow-ui-wiki/signal-ui/player.md) — Share one button across Windows while each player sees their own data.
