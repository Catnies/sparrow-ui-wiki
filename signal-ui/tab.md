# Tab selection state

Source: <https://catnies.github.io/sparrow-ui-wiki/signal-ui/tab>

A category menu has to switch content and mark the active category. `Tab.selected()` exposes a Signal for the selected key, and buttons that depend on it can change their names.

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

## Switching categories and updating buttons

The food category below shows an apple and the materials category a diamond, with the center `C` holding the current child Pane. Food starts selected; clicking materials swaps the center to the diamond and adds "(selected)" to the materials button.

```text title="Pick a category"
F###C###M
```

- `F`: food category (`apple`)
- `C`: current category content (`apple`)
- `M`: materials category (`diamond`)

Food starts selected with an apple in the center. Switching to materials shows the diamond and marks the materials button as selected.

```java
Pane food = Pane.builder("X")
        .addIngredient('X', Item.simple(new ItemStack(Material.APPLE))).build();
Pane material = Pane.builder("X")
        .addIngredient('X', Item.simple(new ItemStack(Material.DIAMOND))).build();
Tab<String> tabs = Tab.of(Map.of("food", food, "material", material), "food");

Item foodButton = Item.builder()
        .dependsOn(tabs.selected())
        .setItemProvider(context -> named(Material.APPLE,
                tabs.selected().get().equals("food") ? "Food (selected)" : "Food"))
        .addClickHandler(click -> tabs.select("food"))
        .build();
Item materialButton = Item.builder()
        .dependsOn(tabs.selected())
        .setItemProvider(context -> named(Material.DIAMOND,
                tabs.selected().get().equals("material") ? "Materials (selected)" : "Materials"))
        .addClickHandler(click -> tabs.select("material"))
        .build();
Pane pane = Pane.builder("F###C###M")
        .addIngredient('F', foodButton)
        .addIngredient('C', tabs)
        .addIngredient('M', materialButton)
        .build();
Window.builder(pane).setTitle("Pick a category").open(viewer);
```

The content area follows the selection through `addIngredient('C', tabs)`, and the two category buttons each depend on `selected()`. `Tab.lazy` uses the same binding style.

**Next**: [Window titles](https://catnies.github.io/sparrow-ui-wiki/signal-ui/title.md) — Wire a quantity change into the Window's title refresh.
