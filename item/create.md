# Creating items

Source: <https://catnies.github.io/sparrow-ui-wiki/item/create>

An arrow in a menu can carry information, turn a page, or go back when clicked. Sparrow UI describes a menu item like this with an **Item**: it decides what to display and what happens when a player interacts with it.

## What an Item is made of

An Item has three parts: where the display comes from, an optional guard, and what a click does:

| Part | Responsibility |
| - | - |
| Display source `ItemProvider` | Provides the item being displayed |
| Conditional guard `ItemGuard` | Checks whether the click behavior may run |
| Click behavior | Receives the `ItemClick` and performs the action |

The display source hands out a Bukkit **`ItemStack`**. Whether the menu shows an arrow or a diamond, how many, and what its name is, all come from that `ItemStack`'s data.

**The `ItemProvider` decides what is shown, the `ItemGuard` decides whether interaction is allowed, and the click handler decides what happens.** The display source can always hand out the same fixed item, or compute one at render time. The latter gets its own section in [Rendering and refresh](https://catnies.github.io/sparrow-ui-wiki/item/render.md).

The `ItemClick` passed to the click handler carries the player, the click type, the Window involved, and more. When guards are configured, they run first, and the click handler only executes once every guard passes; if any guard returns `false`, the click behavior is skipped entirely.

For example, a plain vanilla arrow with no click behavior and no guards:

```java
ItemStack stack = new ItemStack(Material.ARROW);
Item item = Item.simple(stack);
```

This creates the arrow's `ItemStack`, then wraps it into a menu Item with `Item.simple`. That entry point wires up a fixed `ItemProvider` for you, so there is no provider to build by hand.

An Item does not decide where it sits. Positioning belongs to the **Pane (layout)**, and the same Item can occupy several slots. After creating an Item you still need to put it into a Pane and open the menu through a Window.

## Common ways to create an Item

Pick the entry point that matches what you already have and what the Item should do:

| API | Description |
| - | - |
| `Item.simple(ItemStack)` | You already have an item and just want it shown in the menu. |
| `Item.simple(ItemProvider)` | You already have a display source; this creates a display-only Item. |
| `Item.builder()` | Configure display and interaction piece by piece, then call build() to create the Item. |
| `Item.empty()` | An Item that shows nothing and performs no interaction. |

### From an ItemStack

The most common path is `Item.simple(stack)`. Prepare the `ItemStack` you want to show and pass it in:

```java
ItemStack stack = new ItemStack(Material.ARROW);
Item item = Item.simple(stack);
```

This Item displays the vanilla arrow's name. To customize the name and lore, change the `ItemStack` before creating the Item. Below, Paper's data component API sets a white name and gray lore, with the default italics turned off:

```java
ItemStack stack = new ItemStack(Material.ARROW);
stack.setData(
        DataComponentTypes.CUSTOM_NAME,
        Component.text("Direction", NamedTextColor.WHITE)
                .decoration(TextDecoration.ITALIC, false)
);
stack.setData(
        DataComponentTypes.LORE,
        ItemLore.lore(List.of(
                Component.text("Marks the direction in the menu.", NamedTextColor.GRAY)
                        .decoration(TextDecoration.ITALIC, false)
        ))
);

Item item = Item.simple(stack);
```

`CUSTOM_NAME` sets the item name and `LORE` sets the lines under it. Both are pure looks; neither adds click behavior to the Item.

> **Info: The item is copied at creation time**
>
> `Item.simple(stack)` copies the `ItemStack` you pass in. Changing the original `stack` afterwards does not affect what this Item displays, so set the name, count, and lore before handing it over.

### From an ItemProvider

If you already have an `ItemProvider`, use `Item.simple(provider)` to make it the display source:

```java
ItemStack stack = new ItemStack(Material.ARROW);
ItemProvider provider = ItemProvider.constant(stack);
Item item = Item.simple(provider);
```

`ItemProvider.constant(stack)` means "always provide this fixed item" and copies `stack` when the provider is created. This spells out explicitly what the previous entry point did behind the scenes; the display is still an arrow.

This entry point also accepts providers that generate items on demand. `simple` here means "no extra interaction configured", not "the provider must return the same item every time".

### Combining display and interaction with the builder

`Item.builder()` returns a builder. Configure the display source on it, add interaction, then call `build()` to get the Item.

For example, a button that closes the menu needs both a barrier item and the close action:

```java
ItemStack stack = new ItemStack(Material.BARRIER);
stack.setData(
        DataComponentTypes.CUSTOM_NAME,
        Component.text("Close menu", NamedTextColor.YELLOW)
                .decoration(TextDecoration.ITALIC, false)
);

Item closeButton = Item.builder()
        .setItemProviderConstant(stack)
        .addClickHandler(click -> click.window().close())
        .build();
```

In this chain:

- `setItemProviderConstant(stack)` sets a fixed display source, so the button shows a barrier.
- `addClickHandler(...)` adds the click action. `click` describes this particular click, and `click.window()` is the Window the player is looking at.
- `build()` combines the settings into one Item that can go into a layout.

`setItemProviderConstant` is a builder configuration method. After configuring, you still call `build()` to get the Item. This example has no guards, so the click closes the window right away. Guards and other click usage are covered in [Clicks and guards](https://catnies.github.io/sparrow-ui-wiki/item/click.md).

> **Warning: A builder takes its display source exactly once**
>
> Calling `setItemProviderConstant` again, or calling another display-source method afterwards, throws an `IllegalStateException`. The new call does not overwrite the old configuration.
>
> The fixed item is copied when `setItemProviderConstant` runs; changing the original `stack` later does not change this configuration.

### Creating an empty Item

`Item.empty()` returns a shared empty Item and needs no `ItemStack`:

```java
Item empty = Item.empty();
```

It displays nothing and performs no clicks. When a slot should explicitly hold "empty content", hand it to the layout.

> **Info: Empty Items versus unassigned slots**
>
> If the Pane has a background, unassigned slots fall back to that background; a slot holding `Item.empty()` does not.

## Putting an Item into a menu

After creating an Item, bind it to a character in the layout with `addIngredient`. The menu below has one row of nine slots: `A` holds the arrow, `C` the close button, and the rest of the `#` slots stay empty. The arrow only shows information; the barrier closes the window. Switch to the player view to see what the player gets:

```text title="Item example"
##A###C##
```

- `#`: empty
- `A`: display item (`arrow`)
- `C`: close button (`barrier`)

Here is the full code. In a plugin that has finished [initialization](https://catnies.github.io/sparrow-ui-wiki/getting-started/installation.md), call `ItemMenu.open(viewer)` to open it:

```java
import io.papermc.paper.datacomponent.DataComponentTypes;
import io.papermc.paper.datacomponent.item.ItemLore;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;
import net.kyori.adventure.text.format.TextDecoration;
import net.momirealms.sparrow.ui.item.Item;
import net.momirealms.sparrow.ui.pane.Pane;
import net.momirealms.sparrow.ui.window.Window;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;

import java.util.List;

public final class ItemMenu {
    public static void open(Player viewer) {
        Pane pane = Pane.builder("##A###C##")
                .addIngredient('A', createArrow())
                .addIngredient('C', createCloseButton())
                .build();

        Window.builder(pane)
                .setTitle(Component.text("Item example"))
                .open(viewer);
    }

    private static Item createArrow() {
        ItemStack arrowStack = new ItemStack(Material.ARROW);
        arrowStack.setData(
                DataComponentTypes.CUSTOM_NAME,
                Component.text("Direction", NamedTextColor.WHITE)
                        .decoration(TextDecoration.ITALIC, false)
        );
        arrowStack.setData(
                DataComponentTypes.LORE,
                ItemLore.lore(List.of(
                        Component.text("Marks the direction in the menu.", NamedTextColor.GRAY)
                                .decoration(TextDecoration.ITALIC, false)
                ))
        );
        return Item.simple(arrowStack);
    }

    private static Item createCloseButton() {
        ItemStack closeStack = new ItemStack(Material.BARRIER);
        closeStack.setData(
                DataComponentTypes.CUSTOM_NAME,
                Component.text("Close menu", NamedTextColor.YELLOW)
                        .decoration(TextDecoration.ITALIC, false)
        );
        return Item.builder()
                .setItemProviderConstant(closeStack)
                .addClickHandler(click -> click.window().close())
                .build();
    }
}
```

**Next**: [Rendering and refresh](https://catnies.github.io/sparrow-ui-wiki/item/render.md) — Generate items per player through ItemProvider, with async loading and refresh timing.
