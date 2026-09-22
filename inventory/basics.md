# Putting an inventory in a menu

Source: <https://catnies.github.io/sparrow-ui-wiki/inventory/basics>

Pane slots can link to an inventory; whatever players put in or take out lives in that inventory. Put, take, drag, shift transfer, double-click collection, and number-key swaps all follow vanilla chest rules, with no click logic to write yourself.

## SparrowInventory versus Bukkit inventories

Sparrow UI's inventory type is `SparrowInventory`, a separate API from Bukkit's `Inventory`. It has two implementations:

- `VirtualInventory`: items live in memory, see [Virtual inventories](https://catnies.github.io/sparrow-ui-wiki/inventory/virtual.md)
- `ReferencingInventory`: maps existing containers such as chests and player inventories into the menu, see [Referenced inventories](https://catnies.github.io/sparrow-ui-wiki/inventory/referencing.md)

A `SparrowInventory` cannot be opened with `player.openInventory`. Bind it to a Pane identifier and open it with a Window, and players can interact with it in the menu. An inventory does not belong to one menu: the same inventory can show in several menus at once and be read or written outside menus too.

### Reading and writing

In code, use `SparrowInventory`'s own methods:

```java
VirtualInventory storage = new VirtualInventory(27);

// Puts in 16 diamonds: merges with matching items first, then empty slots; returns the overflow
int overflow = storage.add(new ItemStack(Material.DIAMOND, 16));

// Reads slot 0; you get a copy, or null for an empty slot
ItemStack first = storage.itemAt(0);

// Removes one from slot 0; returns the amount actually changed
int changed = storage.changeAmount(0, -1);

// Clears every slot
storage.clear();
```

The common methods are below. "Similar" in the table means the same type and data components, ignoring count:

| Method | Purpose |
| - | - |
| `itemAt(slot)` | Read one slot; `null` when empty |
| `snapshot()` | Read every slot as an array ordered by slot, with `null` for empties |
| `setItem(slot, item)` | Overwrite one slot; pass `null` to clear it |
| `modifyItem(slot, modifier)` | Compute a new item from the slot's current one and write it back |
| `changeAmount(slot, change)` | Adjust a slot's count; returns the amount actually changed |
| `add(item)` | Merge with similar items first, then empty slots; returns the overflow |
| `collect(template, upTo)` | Remove up to `upTo` items similar to `template`; returns how many were removed |
| `remove(matcher, upTo)` | Remove up to `upTo` matching items; returns how many were removed |
| `clear()` | Clear every slot |
| `simulateAdd(item)` | Compute the overflow without touching the inventory |
| `isEmpty()` / `isFull()` | Whether the inventory is completely empty or full |
| `containsSimilar(item)` | Whether any similar item exists inside |
| `countSimilar(item)` | Count how many slots hold a similar item, without summing their counts |

After modifying the inventory through these methods, every Window showing it updates automatically. They write straight into the inventory, bypassing access rules and ignoring the freeze below. The `try`-prefixed variants (`tryAdd`, `trySetItem`, and friends) check access rules first and may be rejected; see [Access rules and events](https://catnies.github.io/sparrow-ui-wiki/inventory/rules-events.md).

`VirtualInventory` methods may run on any thread (any thread). `ReferencingInventory` reads and writes the mapped container directly, so it must be called from a thread that may access that container; see [Thread requirements](https://catnies.github.io/sparrow-ui-wiki/inventory/referencing.md#thread-requirements).

> **Warning: Reads and writes both copy**
>
> `itemAt` and `snapshot` return copies; mutating them does not change the inventory. `setItem`, `add`, and the rest copy what you pass in, so later changes to the original do not reach the inventory either.
>
> The Bukkit habit of `getItem` then `setAmount` does nothing here. To change one slot, use `changeAmount`, `modifyItem`, or `setItem`.

> **Info: Handing it to code that wants a Bukkit Inventory**
>
> `asBukkitInventory()` returns a wrapped Bukkit `Inventory` you can hand to code that only accepts Bukkit containers; reads and writes on it land in this inventory. This is an experimental API: the wrapper is fixed to type `CHEST` with no holder or location. Items read from it are copies too, and writes are treated as programmatic modifications, bypassing access rules. To show an inventory to players, still use a Pane and Window.

## Linking to a Pane

`addIngredient` binds the inventory to an identifier. The identifier's first occurrence links to slot 0, the second to slot 1, and so on, following the character template left to right, top to bottom. What happens when the slot count and inventory size disagree is covered in [Filling content](https://catnies.github.io/sparrow-ui-wiki/pane/ingredients.md).

### Several players sharing one inventory

Inventories you want to keep live outside the menu, for instance as a field on a guild object. Below, each member opening the storage gets a fresh Pane linked to the same inventory:

```java
public final class GuildStorage {
    // Every member shares this one inventory; items survive closing the menu
    private final VirtualInventory storage = new VirtualInventory(27);

    public void open(Player viewer) {
        // A fresh Pane per open, always linked to the same inventory
        Pane pane = Pane.builder(
                        "SSSSSSSSS",
                        "SSSSSSSSS",
                        "SSSSSSSSS"
                )
                .addIngredient('S', this.storage)
                .build();

        Window.builder(pane).setTitle("Guild storage").open(viewer);
    }
}
```

With several members viewing at once, any put or take updates everyone else's Window; two players grabbing the same stack means exactly one gets it. Writing from code with `storage.add(...)` and friends updates the open Windows the same way.

Inventories need no registration and no shutdown; once nothing references them, they are collected.

### Custom slot mapping

To start from a specific slot, or map by your own rule, bind an `ElementSupplier` returning `Element.inventory(inventory, slot)` per slot:

```java
Pane pane = Pane.builder("SSSSSSSSS")
        // The nth S links to inventory slot 9 + n, so this row shows slots 9 through 17
        .addIngredient('S', (slots, occurrence) -> Element.inventory(storage, 9 + occurrence))
        .build();
```

`occurrence` counts this slot's position within the identifier, starting at 0; the full parameter meaning is in [Filling content](https://catnies.github.io/sparrow-ui-wiki/pane/ingredients.md). A slot number beyond the inventory's size makes `build()` throw an `IllegalStateException`.

## Inventory backgrounds

`setBackgroundItem` sets the inventory's background. An empty slot shows it; put an item in and the real item shows; take the item out and the background returns. The appraisal menu below has a single input slot that shows a hint while empty:

```java
VirtualInventory input = new VirtualInventory(1);
// Empty slot shows the hint; a placed item replaces it
input.setBackgroundItem(hintItem());

ItemStack filler = new ItemStack(Material.BLACK_STAINED_GLASS_PANE);
filler.setData(DataComponentTypes.CUSTOM_NAME, Component.empty());

Pane pane = Pane.builder(
                "#########",
                "####X####",
                "#########"
        )
        // The Pane background fills only the unbound # slots
        .setBackground(filler)
        .addIngredient('X', input)
        .build();

Window.builder(pane).setTitle("Item appraisal").open(viewer);
```

**The hintItem() implementation**

```java
private static ItemStack hintItem() {
    ItemStack stack = new ItemStack(Material.LIGHT);
    stack.setData(
            DataComponentTypes.CUSTOM_NAME,
            Component.text("Put the item to appraise here", NamedTextColor.YELLOW)
                    .decoration(TextDecoration.ITALIC, false)
    );
    stack.setData(DataComponentTypes.LORE, ItemLore.lore(List.of(
            Component.text("Drop an item into this slot to start.", NamedTextColor.GRAY)
                    .decoration(TextDecoration.ITALIC, false)
    )));
    return stack;
}
```

```text title="Item appraisal"
#########
####X####
#########
```

- `#`: Pane background (`black_stained_glass_pane`)
- `X`: inventory slot (`light`)

The background is display-only and lives outside the inventory: reading the slot still returns `null`, and players cannot take it.

A Pane's background only fills slots with no bound content and never shows on empty inventory slots. In the example, the black glass around the edge is the Pane's background, while the center slot shows the inventory's own background when empty; with no inventory background set, that slot stays blank.

The background belongs to the inventory, so every menu showing it displays the same background in its empties. `setBackground` also accepts an `ItemProvider` to generate the background per viewer at render time; see [Rendering and refresh](https://catnies.github.io/sparrow-ui-wiki/item/render.md). Passing `null` clears it, updating displayed Windows right away.

## Freezing inventories

`frozen(true)` freezes the inventory. Frozen, players cannot put items in or take them out through any Window, and it drops out of shift transfers and double-click collection. Display is unaffected, and code can still read and write with the methods above.

Adding a lock button to the guild storage: the leader clicking it locks or unlocks the storage:

```java
public final class GuildStorage {
    private final VirtualInventory storage = new VirtualInventory(27);
    private final UUID leader;

    public GuildStorage(UUID leader) {
        this.leader = leader;
    }

    public void open(Player viewer) {
        Pane pane = Pane.builder(
                        "SSSSSSSSS",
                        "SSSSSSSSS",
                        "SSSSSSSSS",
                        "########L"
                )
                .addIngredient('S', this.storage)
                .addIngredient('L', Item.builder()
                        .setItemProviderConstant(lockIcon())
                        .addClickHandler(click -> this.toggleLock(click.player()))
                        .build())
                .build();

        Window.builder(pane).setTitle("Guild storage").open(viewer);
    }

    private void toggleLock(Player player) {
        if (!player.getUniqueId().equals(this.leader)) {
            return;
        }
        // Takes effect in every Window showing this inventory, including open ones
        boolean locked = !this.storage.frozen();
        this.storage.frozen(locked);
        player.sendMessage(Component.text(locked ? "Storage locked." : "Storage unlocked.", NamedTextColor.GREEN));
    }

    // The freeze only limits players; rewards can still be delivered while locked
    public int deliver(ItemStack reward) {
        return this.storage.add(reward);
    }
}
```

**The lockIcon() implementation**

```java
private static ItemStack lockIcon() {
    ItemStack stack = new ItemStack(Material.TRIPWIRE_HOOK);
    stack.setData(
            DataComponentTypes.CUSTOM_NAME,
            Component.text("Lock / unlock storage", NamedTextColor.YELLOW)
                    .decoration(TextDecoration.ITALIC, false)
    );
    stack.setData(DataComponentTypes.LORE, ItemLore.lore(List.of(
            Component.text("Members cannot store or take items while locked.", NamedTextColor.GRAY)
                    .decoration(TextDecoration.ITALIC, false),
            Component.empty(),
            Component.text("Leader only", NamedTextColor.YELLOW)
                    .decoration(TextDecoration.ITALIC, false)
    )));
    return stack;
}
```

The freeze belongs to the inventory, so once the leader locks it, every member's open storage locks too. While locked, `deliver` can still put rewards in; members watch them appear and can only take them out after unlocking.

A [Pane freeze](https://catnies.github.io/sparrow-ui-wiki/pane/composition.md) and an inventory freeze act on different objects:

| | `pane.setFrozen(true)` | `inventory.frozen(true)` |
| - | - | - |
| Scope | Every slot of this Pane, buttons included | The inventory itself, wherever it is displayed |
| Shift transfer and double-click collection | Inventory slots shown through this Pane drop out | The whole inventory drops out |
| Programmatic reads and writes | Unaffected | Unaffected |

To make one menu read-only, freeze the Pane; to lock the inventory itself, freeze the inventory.

## Shift transfers and double-click collection

Shift-clicking an item in an inventory slot moves it to the other inventories in the Window; double-clicking collects similar items from the Window's inventories onto the cursor. The default player inventory below the Window is an inventory too, so with no configuration these two actions match a vanilla chest.

What participates is the inventory slots actually displayed and operable in the Window. Slots shown through a frozen Pane, and frozen inventories, sit out, and shift-clicking never moves an item back into the inventory it came from. With several candidate inventories, they are tried in priority order, moving to the next once one is full.

### Priority

`operationPriority` sets an inventory's priority; higher numbers are tried first. Ties break by each inventory's first display position in the Window, left to right, top to bottom.

The menu below has a row of quick slots on top and three storage rows below. Quick slots come first, so by default shift-clicking an item from the player inventory fills them first. Raising the storage's `ADD` priority sends items to storage instead:

```text title="Storage"
CCCCCCCCC
SSSSSSSSS
SSSSSSSSS
SSSSSSSSS
```

- `C`: quick slots
- `S`: storage

```java
VirtualInventory common = new VirtualInventory(9);
VirtualInventory storage = new VirtualInventory(27);
// Shift-clicked items from the player inventory go to storage first, then the quick slots
storage.operationPriority(OperationCategory.ADD, 10);

Pane pane = Pane.builder(
                "CCCCCCCCC",
                "SSSSSSSSS",
                "SSSSSSSSS",
                "SSSSSSSSS"
        )
        .addIngredient('C', common)
        .addIngredient('S', storage)
        .build();

Window.builder(pane).setTitle("Storage").open(viewer);
```

Priorities are per operation category, `OperationCategory`:

| Category | Which actions it affects |
| - | - |
| `OperationCategory.ADD` | Where shift-clicked items go first |
| `OperationCategory.COLLECT` | Which inventory double-click collection drains first |

Both default to 0. `operationPriority(10)` sets every category at once, and `clearOperationPriority()` restores all to 0. The priority belongs to the inventory, so every menu showing it uses the same value.

> **Info: Default priorities of the player inventory**
>
> The player inventory linked by the default lower Pane has `ADD` priority `Integer.MAX_VALUE` and `COLLECT` priority `Integer.MIN_VALUE`. So in the example, shift-clicking items from the quick slots or the storage sends them back to the player inventory first, and double-click collection drains the player inventory last. When you link the player inventory yourself, say in a merged layout, both values are the plain default 0.

### Undisplayed slots

By default only displayed slots participate. When the inventory is larger than its display area, for instance a big storage paged across a menu, shift-clicks only fill the current page, and whatever does not fit stays in the player inventory.

`includeObscuredSlots(true)` lets hidden slots participate too. Below, [Pagination Page](https://catnies.github.io/sparrow-ui-wiki/pagination/page.md) shows a 54-slot storage across two pages. Page splits on slot indexes, and the converter links each index to the matching inventory slot. Once the current page fills, shift-clicked items continue into the other page:

```java
VirtualInventory storage = new VirtualInventory(54);
// Slots outside the current page also join shift transfers and double-click collection
storage.includeObscuredSlots(true);

// The pages split on inventory slot indexes, 27 per page
List<Integer> slots = IntStream.range(0, storage.size()).boxed().toList();
Page<Integer> page = Page.of(slots, 27);

Pane pane = Pane.builder(
                "SSSSSSSSS",
                "SSSSSSSSS",
                "SSSSSSSSS",
                "P#######N"
        )
        // Each index on the current page links to the matching inventory slot
        .addIngredient('S', page, slot -> Element.inventory(storage, slot))
        .addIngredient('P', Item.builder()
                .setItemProviderConstant(new ItemStack(Material.ARROW))
                .addClickHandler(click -> page.advance(-1))
                .build())
        .addIngredient('N', Item.builder()
                .setItemProviderConstant(new ItemStack(Material.ARROW))
                .addClickHandler(click -> page.advance(1))
                .build())
        .build();

Window.builder(pane).setTitle("Storage").open(viewer);
```

With the switch on, double-click collection also pulls from the other page. Slots shown through a frozen Pane still sit out. The switch belongs to the inventory and applies to every menu displaying it.

### Undisplayed inventories

`linkInventory` declares an inventory onto a Pane. Even when none of its slots are displayed in the Window, it joins shift transfers and double-click collection.

The storage below uses one independent inventory per page, switched with [Tab](https://catnies.github.io/sparrow-ui-wiki/pagination/tab.md). While page one shows, page two's inventory is nowhere in the Window. Declaring both pages on the outer Pane lets shift-clicked items continue into page two once page one fills:

```java
// Each page of the storage is its own inventory
VirtualInventory firstPage = new VirtualInventory(27);
VirtualInventory secondPage = new VirtualInventory(27);
// A declared inventory may display no slots at all; this switch is required to participate
firstPage.includeObscuredSlots(true);
secondPage.includeObscuredSlots(true);

Tab<Integer> pages = Tab.of(Map.of(0, storagePane(firstPage), 1, storagePane(secondPage)), 0);

Pane pane = Pane.builder(
                "VVVVVVVVV",
                "VVVVVVVVV",
                "VVVVVVVVV",
                "###A#B###"
        )
        .addIngredient('V', pages)
        .addIngredient('A', pageButton("Page one", () -> pages.select(0)))
        .addIngredient('B', pageButton("Page two", () -> pages.select(1)))
        // Both pages declared on the outer Pane, so they participate no matter which is shown
        .linkInventory(firstPage)
        .linkInventory(secondPage)
        .build();

Window.builder(pane).setTitle("Storage").open(viewer);
```

```java
private static Pane storagePane(VirtualInventory inventory) {
    return Pane.builder(
                    "SSSSSSSSS",
                    "SSSSSSSSS",
                    "SSSSSSSSS"
            )
            .addIngredient('S', inventory)
            .build();
}
```

**The pageButton() implementation**

```java
private static Item pageButton(String name, Runnable action) {
    ItemStack stack = new ItemStack(Material.PAPER);
    stack.setData(
            DataComponentTypes.CUSTOM_NAME,
            Component.text(name, NamedTextColor.YELLOW)
                    .decoration(TextDecoration.ITALIC, false)
    );
    return Item.builder()
            .setItemProviderConstant(stack)
            .addClickHandler(click -> action.run())
            .build();
}
```

Declared inventories come after the ones displayed in the Window. Both pages share the same priority, so the currently displayed page fills first and the other takes the overflow.

> **Warning: What a declaration requires**
>
> - The declared inventory must have `includeObscuredSlots(true)` on. Without a display area, the switch is the only thing giving it slots to participate with.
> - The declaration only applies while that Pane is displayed in a Window. The example declares on the always-visible outer Pane; declare on one page's child Pane and the declaration stops working once you switch away.

After building, the Pane's `linkInventory` and `unlinkInventory` add or remove declarations.

**Next**: [Virtual inventories](https://catnies.github.io/sparrow-ui-wiki/inventory/virtual.md) — Per-slot stack limits and iteration order, plus saving the contents.
