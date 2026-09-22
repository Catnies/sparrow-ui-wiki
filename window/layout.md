# Window layouts

Source: <https://catnies.github.io/sparrow-ui-wiki/window/layout>

The top of a Window is the container; the bottom is the player inventory. The bottom is fixed: three rows of main storage plus one hotbar row, 36 slots in total. You can lay out only the top menu, or put menu content in the bottom as well.

| How you create it | Top area | Bottom area |
| - | - | - |
| `Window.builder(upper)` | The provided `upper` | Automatically linked to the viewer's real inventory |
| `Window.splitBuilder(upper, lower)` | The provided `upper` | The provided `lower` |
| `Window.mergedBuilder(pane)` | The first rows of `pane` | The last 4 rows of the same `pane` |

All three open a chest view; the difference is which Panes supply the top and bottom. The chest's row count covers the top only, and the player inventory below is kept separate.

## Regular layout: keep the player inventory

`Window.builder(upper)` only needs the top Pane; the bottom links to the viewer's real inventory automatically. The template below describes a three-row chest:

```java
Pane upper = Pane.builder(
                "#########",
                "####B####",
                "########X"
        )
        .addIngredient('B', Item.simple(new ItemStack(Material.BOOK)))
        .addIngredient('X', Item.builder()
                .setItemProviderConstant(new ItemStack(Material.BARRIER))
                .addClickHandler(click -> click.window().close())
                .build())
        .build();

Window.builder(upper)
        .setTitle("Help Menu")
        .open(viewer);
```

After opening, the book and the close button appear on top and the player's inventory below. The preview shows an empty inventory:

```text title="Help Menu"
#########
####B####
########X

PPPPPPPPP
PPPPPPPPP
PPPPPPPPP
PPPPPPPPP
```

The last 4 rows, after the blank line, are the player inventory.

- `#`: empty
- `B`: book (`book`)
- `X`: close button (`barrier`)
- `P`: player inventory (mapped automatically)

Players keep using their inventory items as usual. The lower Pane's slots start at the main storage, with the hotbar last, and do not include armor or off-hand slots:

| Lower Pane slot | Matching Bukkit player inventory slot |
| - | - |
| 0-8 | 9-17 |
| 9-17 | 18-26 |
| 18-26 | 27-35 |
| 27-35 | 0-8, the hotbar |

Every `build(viewer)` creates a default lower Pane for this viewer, linked to their own inventory.

> **Warning: Size of the upper Pane**
>
> A regular chest window requires the upper Pane to be 9 columns and 1 to 6 rows. A different size makes building the Window throw an `IllegalArgumentException`.

## Split layout: arrange top and bottom separately

To put menu content where the player inventory would be, use `splitBuilder(upper, lower)` and give each half its own Pane. Reusing `upper` from the previous example, the bottom is covered with gray glass panes and a close button sits at the right end of the hotbar row:

```java
Pane lower = Pane.builder(
                "#########",
                "#########",
                "#########",
                "########X"
        )
        .setBackground(new ItemStack(Material.GRAY_STAINED_GLASS_PANE))
        .addIngredient('X', Item.builder()
                .setItemProviderConstant(new ItemStack(Material.BARRIER))
                .addClickHandler(click -> click.window().close())
                .build())
        .build();

Window.splitBuilder(upper, lower)
        .setTitle("Help Menu")
        .open(viewer);
```

The top stays the same; the bottom, hotbar included, now shows `lower`:

```text title="Help Menu"
#########
####B####
########X

#########
#########
#########
########X
```

The last 4 rows, after the blank line, are the player inventory.

- `#`: empty
- `B`: book (`book`)
- `X`: close button (`barrier`)
- `G`: lower background (the # in lower) (`gray_stained_glass_pane`)

The upper and lower Panes each number their slots from 0, anchored at the top-left of the container and of the main storage area. Each has its own background and freeze settings, so `lower.setFrozen(true)` freezes only the bottom 36 slots.

> **Warning: A custom lower half is not linked to the player inventory**
>
> `lower` must be 9×4, and these 36 slots are entirely yours: display and clicks alike. Unbound slots stay empty or show the background, and the player's own items are hidden while the menu is open.
>
> The glass panes in the preview are just menu background; the player's real items remain in the real inventory. To show and operate them in a custom layout, link the matching container, see [Referenced inventories](https://catnies.github.io/sparrow-ui-wiki/inventory/referencing.md).

## Merged layout: one template covers the whole window

`mergedBuilder(pane)` has a single Pane supply both halves. The last 4 rows of the template land in the player inventory area; the rows before that form the chest.

A seven-row template below arranges a three-row chest and the player inventory below it. All `#` share the gray glass pane background and both `X` slots are close buttons:

```java
Pane pane = Pane.builder(
                "#########",
                "####B####",
                "########X",
                "#########",
                "#########",
                "#########",
                "########X"
        )
        .setBackground(new ItemStack(Material.GRAY_STAINED_GLASS_PANE))
        .addIngredient('B', Item.simple(new ItemStack(Material.BOOK)))
        .addIngredient('X', Item.builder()
                .setItemProviderConstant(new ItemStack(Material.BARRIER))
                .addClickHandler(click -> click.window().close())
                .build())
        .build();

Window.mergedBuilder(pane)
        .setTitle("Help Menu")
        .open(viewer);
```

The result is still a three-row chest with the main storage and hotbar layout below:

```text title="Help Menu"
#########
####B####
########X

#########
#########
#########
########X
```

The last 4 rows, after the blank line, are the player inventory.

- `#`: background (`gray_stained_glass_pane`)
- `B`: book (`book`)
- `X`: close button (`barrier`)

Slots on this Pane number continuously: 0-26 show in the chest, 27-53 in the main storage area, and 54-62 in the hotbar area. The two gaps in the vanilla view are reserved by the client, occupy no slots, and need no blank rows in the template.

Both halves share this Pane's background and freeze settings. The merged layout also needs a linked container to display the player's real inventory.

> **Warning: Size of a merged Pane**
>
> A merged Pane must be 9 columns and 5 to 10 rows. The last 4 rows go to the player inventory; the first 1 to 6 rows form the chest. Five rows, for instance, means one chest row above the player inventory. A different size makes building the Window throw an `IllegalArgumentException`.

## Modifying the default player inventory

`window.lowerPane()` returns the default lower Pane. Freezing it, for example, leaves the inventory items visible but unoperable inside this Window:

```java
Window window = Window.builder(upper)
        .setTitle("Read-only inventory preview")
        .build(viewer);

window.lowerPane().setFrozen(true);
window.open();
```

Call `window.lowerPane().setFrozen(false)` to restore interaction. The real inventory's contents remain visible while frozen.

To reach the inventory linked to the bottom half, call `window.defaultLowerInventory()`. It looks up the `ReferencingInventory` through the lower Pane's shape and first slot link, and may return `null` once the structure has been rewritten. This inventory maps the player's real inventory, so writing through it writes back to the real inventory; see [Referenced inventories](https://catnies.github.io/sparrow-ui-wiki/inventory/referencing.md).

> **Warning: After changing the lower structure, operations follow the actual links**
>
> Both the content and the links of the default lower Pane can be modified. Once you change them, number-key swaps target whatever container slot the hotbar positions currently link to, and shift-click transfers and double-click collection follow the actually linked containers and their rules.
>
> When writing to the real inventory through a `ReferencingInventory`, run on a thread that may access that player's container. The Pane's freeze only limits what players do in the Window; it does not stop your plugin from modifying the container.

On the merged layout, `lowerPane()` returns the whole merged Pane, so `setFrozen(true)` freezes the entire menu. To freeze only the bottom half, use the split layout.

## Freezing single slots and the offhand

A Pane's freeze covers the whole Pane. To lock only a few slots of one window, use the Window's own freeze:

| Method | Purpose |
| - | - |
| `frozenAt(windowSlot, frozen)` | Freeze or unfreeze one Window slot |
| `frozenAt(windowSlot)` | Whether this Window has frozen the slot |
| `windowSlotAtHotbar(hotbarSlot)` | The Window slot of hotbar slot `hotbarSlot` (0–8) |
| `offhandFrozen(frozen)`, `offhandFrozen()` | Freeze or query offhand swaps |

Window slots use the same numbering as `click.windowSlot()`: the container at the top first, then the player inventory below. A frozen slot is treated like a slot inside a frozen Pane: player clicks have no effect, no Bukkit or Sparrow events fire, the Item's click handlers do not run, and the slot takes no part in shift-click transfers or double-click collection. Display and refreshes are unaffected.

The menu below is opened from the item in the player's hand. Freezing that item's hotbar slot while the menu is open keeps the player from moving it away inside the menu:

```java
public static void openForHeldItem(Player viewer, Pane upper) {
    int heldSlot = viewer.getInventory().getHeldItemSlot();

    Window window = Window.builder(upper)
            .setTitle("Edit the held item")
            .build(viewer);
    // Freeze the hotbar slot that holds the item
    window.frozenAt(window.windowSlotAtHotbar(heldSlot), true);
    window.open();
}
```

`windowSlotAtHotbar` converts through the window's actual layout, so you never count the top container's slots yourself.

The offhand is not a Window slot, so neither `frozenAt` nor a Pane's freeze reaches it. When the item is in the offhand, call `offhandFrozen(true)` instead. Pressing the offhand swap key in this window then changes neither the clicked slot nor the offhand, and no events fire:

```java
window.offhandFrozen(true);
```

> **Info: Window freezes and Pane freezes are independent**
>
> A slot is locked when either `frozenAt` or the Pane's `setFrozen` applies. `frozenAt(slot, false)` only lifts the window-side freeze; if the Pane is still frozen, the slot stays locked. `frozenAt(slot)` likewise reports only the window-side setting.
>
> All of these only limit what the player does in this window. Plugins can still modify containers and the offhand directly.

You can set these after `build` and before `open`, or toggle them while the menu is open. The change runs on the player's entity thread, so `frozenAt(slot)` may not reflect it right after the call. The settings stay in place when the same Window is closed and opened again. An out-of-range slot or hotbar index throws `IndexOutOfBoundsException`.

**Next**: [Window types](https://catnies.github.io/sparrow-ui-wiki/window/types.md) — Pick chests, hoppers, anvils, and other vanilla containers, and use their native features.
