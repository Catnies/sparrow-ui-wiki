# Scrolling contents

Source: <https://catnies.github.io/sparrow-ui-wiki/signal-ui/scroll>

A scrolling menu takes a `ListSignal` directly. Twelve diamond stacks below sit in three columns, two rows visible at a time. One click of the down button moves the visible range from stacks 1-6 to 4-9, and the button's row number updates with it.

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

## A scrolling list with a position readout

```text title="Scrolling catalog"
###MMM###
###MMM###
########D
```

- `M`: currently visible (`diamond`)
- `D`: scroll down (`arrow`)

Stacks 1-6 show initially. One downward scroll brings stacks 4-9 into view.

```java
ListSignal<Integer> amounts = ListSignal.of();
amounts.addAll(IntStream.rangeClosed(1, 12).boxed().toList());
Scroll<Integer> scroll = Scroll.vertical(amounts, 3, 2);
Item down = Item.builder()
        .dependsOn(scroll.line(), scroll.maxLine())
        .setItemProvider(context -> named(Material.ARROW,
                "Scroll down, now at row " + (scroll.line().get() + 1)))
        .addClickGuard((item, click) -> scroll.line().get() < scroll.maxLine().get())
        .addClickHandler(click -> scroll.advance(1))
        .build();
Pane pane = Pane.builder("###MMM###", "###MMM###", "########D")
        .addIngredient('M', scroll,
                amount -> Element.item(Item.simple(new ItemStack(Material.DIAMOND, amount))))
        .addIngredient('D', down)
        .build();
Window.builder(pane).setTitle("Scrolling catalog").open(viewer);
```

Adding or removing entries from `amounts` updates both the visible content and the scrollable range. For up and down buttons, give the up button `scroll.advance(-1)` and a guard on `line() > 0` the same way.

**Next**: [Tab selection state](https://catnies.github.io/sparrow-ui-wiki/signal-ui/tab.md) — Switch category content while marking the selected tab.
