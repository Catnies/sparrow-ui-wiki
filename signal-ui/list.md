# List contents

Source: <https://catnies.github.io/sparrow-ui-wiki/signal-ui/list>

When an admin lists diamonds, an already open catalog should gain an item right away. A group of slots changes together here, so bind the list with `addIngredient`.

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

## Slots refill as products come and go

The list starts with an apple and a bread, and the nine `M` slots receive the list's products left to right. For a hands-on demo, the diamond button in the bottom-right simulates listing, up to nine stacks.

```text title="Product catalog"
AB#######
########D
```

- `A`: Apple (`apple`)
- `B`: Bread (`bread`)
- `D`: List a diamond (`diamond`)

The preview shows the initial content: only an apple and a bread in the first row, with the listing button in the bottom-right corner.

```java
ListSignal<Material> products = ListSignal.of();
products.addAll(List.of(Material.APPLE, Material.BREAD));

Pane pane = Pane.builder("MMMMMMMMM", "########A")
        .addIngredient('M', products,
                material -> Element.item(Item.simple(new ItemStack(material))))
        .addIngredient('A', Item.builder()
                .setItemProviderConstant(named(Material.DIAMOND, "List a diamond"))
                .addClickGuard((item, click) -> products.size() < 9)
                .addClickHandler(click -> products.add(Material.DIAMOND))
                .build())
        .build();
Window.builder(pane).setTitle("Product catalog").open(viewer);
```

On first display, slots one and two hold the apple and bread and the rest stay empty. Clicking the listing button puts a diamond in slot three. Removing the list's first entry shifts the rest forward, and the vacated tail slot clears.

`toElement` converts one piece of business data into the `Element` for its slot and must not return `null`. The first conversion runs on the thread calling `build()`, with later updates on Paper's global async scheduler; converters should only touch prepared data. Past nine entries, only the first nine display; anything more belongs in pagination or scrolling.

If the business already has a suitable `Executor`, pass it as the fourth argument: `addIngredient('M', products, toElement, executor)`. It drives later evaluations, while the first still completes on the build thread. Async query results that are `Signal<List<T>>` plug into the same entry point.

**Next**: [Pagination and filtering](https://catnies.github.io/sparrow-ui-wiki/signal-ui/page.md) — Keep page content, arrows, and page numbers in step with the data.
