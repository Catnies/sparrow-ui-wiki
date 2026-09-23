# Tab selection state

Source: <https://catnies.github.io/sparrow-ui-wiki/signal-ui/tab>

The skill menu has a class tab on each side, Warrior and Mage, with the current class's skill in the middle. When the player switches to Mage, the middle should show the Mage skill and the Mage tab should get a "▶" in front of it.

[Tab](https://catnies.github.io/sparrow-ui-wiki/pagination/tab.md) handles switching the middle contents, but the two tab buttons do not know which one is selected, so they never change.

## What Tab.selected() does

`Tab.selected()` is a Signal of the selected key. Tab buttons that depend on it refresh when the tab changes, and each button compares `selected().get()` with its own key to decide how to look.

The content area follows the selection through `addIngredient(identifier, tabs)`, with no extra binding.

## Class tabs

```java
Pane warrior = Pane.builder("S")
        .addIngredient('S', Item.simple(named(Material.DIAMOND_SWORD, "Whirlwind")))
        .build();
Pane mage = Pane.builder("S")
        .addIngredient('S', Item.simple(named(Material.BLAZE_POWDER, "Fireball")))
        .build();
Tab<String> tabs = Tab.of(Map.of("warrior", warrior, "mage", mage), "warrior");

Item warriorButton = Item.builder()
        .dependsOn(tabs.selected())
        .setItemProvider(context -> {
            boolean selected = tabs.selected().get().equals("warrior");
            return named(Material.DIAMOND_SWORD, selected ? "▶ Warrior" : "Warrior");
        })
        .addClickHandler(click -> tabs.select("warrior"))
        .build();
Item mageButton = Item.builder()
        .dependsOn(tabs.selected())
        .setItemProvider(context -> {
            boolean selected = tabs.selected().get().equals("mage");
            return named(Material.BLAZE_POWDER, selected ? "▶ Mage" : "Mage");
        })
        .addClickHandler(click -> tabs.select("mage"))
        .build();

Pane pane = Pane.builder("W###C###M")
        .addIngredient('W', warriorButton)
        .addIngredient('C', tabs)  // the content area follows the selected tab
        .addIngredient('M', mageButton)
        .build();
Window.builder(pane).setTitle("Skills").open(viewer);
```

1. **lines 1-7**: Each class has a sub-Pane; Warrior is selected by default.
2. **lines 9-24**: Both buttons depend on selected() and each checks whether it is the selected one.
3. **lines 26-31**: Open the menu; the middle shows the Warrior's Whirlwind.
4. **lines 23**: Click the Mage tab. The middle switches to Fireball and both button names refresh.
5. **lines 23**: Clicking Mage again changes nothing, so nothing refreshes.
6. **lines 15**: Back to Warrior.

`Tab.lazy`, which creates sub-Panes on demand, uses the same binding.

## Caveats

> **Warning: The selection belongs to this Tab**
>
> The selected tab lives in the `Tab` object. Each player needs their own `Tab` to switch independently; the class sub-Panes can be shared.

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

**Next**: [Window titles](https://catnies.github.io/sparrow-ui-wiki/signal-ui/title.md) — Update the window title automatically when data changes.
