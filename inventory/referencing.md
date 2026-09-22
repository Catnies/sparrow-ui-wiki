# Referenced inventories

Source: <https://catnies.github.io/sparrow-ui-wiki/inventory/referencing>

A `ReferencingInventory` maps an existing container, such as a chest or a player inventory, into the menu. It stores nothing itself: reads return the mapped container's current contents, and writes go straight into the mapped container.

## Mapping Bukkit containers

Below, a menu opens a barrel; items players store or take through the menu are written straight into the barrel:

```java
public static void openBarrel(Player viewer, Barrel barrel) {
    // Maps the barrel's 27 slots; reads and writes land in the barrel itself
    ReferencingInventory contents = ReferencingInventory.fromContents(barrel.getInventory());

    Pane pane = Pane.builder(
                    "SSSSSSSSS",
                    "SSSSSSSSS",
                    "SSSSSSSSS"
            )
            .addIngredient('S', contents)
            .build();

    Window.builder(pane).setTitle("Barrel").open(viewer);
}
```

Call this from a thread that may access the barrel, such as the handler for the player's right-click event on it; see [Thread requirements](https://catnies.github.io/sparrow-ui-wiki/inventory/referencing.md#thread-requirements). The player inventory shows below the Window by default, and players can shift transfer and double-click collect between the barrel and their inventory.

There are three mapping factories, differing in which slots they map:

| Method | Mapped slots |
| - | - |
| `fromContents(inventory)` | All slots, matching `getContents()`. For player inventories this includes armor and off-hand |
| `fromStorageContents(inventory)` | Storage slots only, matching `getStorageContents()`. 36 for a player inventory |
| `fromPlayerStorageContents(playerInventory)` | The player inventory's 36 slots, rearranged as main storage 27 first, hotbar 9 last |

The library picks the read/write path by container kind. These containers map directly:

| Mapped container | What the mapping tracks | When it retires automatically |
| - | - | - |
| Block containers such as chests, barrels, hoppers, furnaces | The block's position; each half of a double chest tracks its own block | The block is broken, or its chunk unloads |
| Entity containers such as chest minecarts and storage boats | The entity | The entity is removed or unloaded |
| Mount inventories of horses, donkeys, llamas, and friends | The mount. Slot 0 is the saddle, slot 1 the armor, then storage slots | The mount is removed or unloaded |
| Player inventories | That player; after respawning it still tracks the same player's current inventory | The player goes offline |
| Inventories created with `Bukkit.createInventory` | That inventory object | Never retires automatically |

Other plugins' custom `Inventory` implementations are read and written through Bukkit's `getItem` and `setItem` and never retire automatically. What retiring means is covered under [Retirement](https://catnies.github.io/sparrow-ui-wiki/inventory/referencing.md#retirement).

When the same position is mapped more than once, for instance a double chest and one of its halves, the library recognizes them as the same slots. If one Window displays both mappings, shift transfers and double-click collection never process a slot twice.

A referenced inventory's per-slot limits come from the mapped container, and the library decides its iteration order, so there is no `setMaxStackSize` or `setIterationOrder`. Access rules, backgrounds, freezing, priorities, and event subscriptions work as they do on virtual inventories. `referencedInventory()` returns the mapped Bukkit container, or `null` after retirement.

### Player inventories

`fromPlayerStorageContents` puts the hotbar last, matching the layout of the player inventory below a Window: three rows of main storage on top, one hotbar row below. Below, the menu shows another player's inventory at the top:

```java
public static void openBackpackOf(Player viewer, Player target) {
    // Main storage's 27 slots first, then the hotbar's 9
    ReferencingInventory backpack = ReferencingInventory.fromPlayerStorageContents(target.getInventory());

    Pane pane = Pane.builder(
                    "SSSSSSSSS",
                    "SSSSSSSSS",
                    "SSSSSSSSS",
                    "SSSSSSSSS"
            )
            .addIngredient('S', backpack)
            .build();

    Window.builder(pane).setTitle(target.getName() + "'s backpack").open(viewer);
}
```

The first three rows are `target`'s main storage and the fourth is the hotbar. Once `target` goes offline the mapping retires, and those 36 slots become empty.

When items shift transfer into this mapping, they fill in reverse order like vanilla: starting at the hotbar's last slot, working through the hotbar, then the main storage. The Window's default lower Pane maps the viewer's own inventory the same way, reachable via `window.defaultLowerInventory()`; see [Window layouts](https://catnies.github.io/sparrow-ui-wiki/window/layout.md).

> **Warning: Do not map other players this way on Folia**
>
> On Folia, the viewer and `target` are managed by different threads, and the Window would read and write `target`'s inventory from the viewer's thread, breaking the [thread requirements](https://catnies.github.io/sparrow-ui-wiki/inventory/referencing.md#thread-requirements). The example is Paper only.

## Thread requirements

Referenced inventories do not switch threads for you. Creating a mapping, calling `refresh()`, reading, and writing all touch the mapped container directly, so they must run on the thread that owns it:

- Paper: the server main thread
- Folia: the region thread owning the block container; the entity thread for entity, mount, and player inventory mappings

The Window refreshes and writes the referenced inventories it displays on the viewer's thread. On Paper that is the main thread and nothing more is needed. On Folia it is only safe when the viewer and the mapped container share a region: the player's own inventory always does; a chest next to them may drift into another region as they walk away.

To read or write a referenced inventory from an async task or another thread, schedule onto the owning thread first:

```java
// A mapping over a barrel: read and write on the region thread owning the barrel
Bukkit.getRegionScheduler().run(plugin, barrel.getLocation(), task -> contents.add(reward));

// A mapping over a player inventory: read and write on that player's thread
target.getScheduler().run(plugin, task -> backpack.add(reward), null);
```

Both schedulers fall back to the main thread on Paper, so the same code runs on Paper and Folia.

> **Warning: Thread safety is your responsibility**
>
> Sparrow UI does not check the current thread. Accessing from the wrong thread surfaces the server's exception as is; it is never converted into a transaction result. When one write touches several slots, whatever was already written before the exception does not roll back.
>
> Referenced inventories also have no write lock. One mapping should be accessed from one thread at a time; two threads writing concurrently can silently lose one of the writes.

## Syncing external changes

The mapped container can change outside the menu too: a hopper feeding the barrel, another player opening it directly, or another plugin editing it.

While a Window displays a referenced inventory, it calls `refresh()` once per tick on the viewer's thread. On detecting changes it updates the Window and dispatches update events with the source `UpdateReason.External`. The changes already happened, so these pass no access rules and cannot be cancelled; event usage is in [Access rules and events](https://catnies.github.io/sparrow-ui-wiki/inventory/rules-events.md). Referenced inventories declared through [`linkInventory`](https://catnies.github.io/sparrow-ui-wiki/inventory/basics.md#undisplayed-inventories) refresh the same way. Before every write, the mapping also refreshes once and computes against the latest contents.

Reads always return the mapped container's current contents, so no refresh is needed before reading. When no Window displays the mapping but you subscribe to its update events, call `refresh()` yourself:

```java
// With no Window displaying the mapping, check for external changes manually
contents.refresh();
```

## Retirement

When the mapped container disappears, for instance a broken block or an offline player, the mapping retires on the next refresh or write. After retiring:

- Reads are empty; the Window's slots show as empty, or the background if one is set
- Programmatic `setItem`, `add`, and friends throw an `IllegalStateException`; the `try` variants return a conflict result without writing anything
- It no longer joins shift transfers or double-click collection, and external changes stop syncing

Retirement never closes the Window and cannot be undone. Once a chunk unloads and reloads, the retired mapping stays empty; you need a new one.

`retire()` retires a mapping manually and releases its reference to the mapped container. Call it when player access must be cut off immediately, for instance because another plugin locked the chest:

```java
// Sever the mapping: reads become empty, writes fail, and the menu's slots go blank
contents.retire();

// Query whether it has retired
boolean retired = contents.retired();
```

Calling `retire()` again does nothing.

## Custom storage

When the contents live outside Bukkit containers, implement the `ExternalStorage` interface and create the mapping with `ReferencingInventory.of(storage)`. `ExternalStorage` is an experimental API.

Below, an armor stand's six equipment slots become a menu for editing its gear:

```java
public final class ArmorStandStorage implements ExternalStorage {
    // Storage slot n maps to this equipment slot
    private static final EquipmentSlot[] SLOTS = {
            EquipmentSlot.HEAD, EquipmentSlot.CHEST, EquipmentSlot.LEGS,
            EquipmentSlot.FEET, EquipmentSlot.HAND, EquipmentSlot.OFF_HAND
    };

    private final ArmorStand stand;

    public ArmorStandStorage(ArmorStand stand) {
        this.stand = stand;
    }

    @Override
    public int size() {
        return SLOTS.length;
    }

    @Override
    public @Nullable ItemStack read(int slot) {
        ItemStack item = this.stand.getEquipment().getItem(SLOTS[slot]);
        // Empty slots return null
        return item.isEmpty() ? null : item;
    }

    @Override
    public void write(int slot, @Nullable ItemStack item) {
        this.stand.getEquipment().setItem(SLOTS[slot], item);
    }

    @Override
    public int maxStackSize(int slot) {
        // One item per equipment slot
        return 1;
    }

    @Override
    public @NotNull SlotKey keyOf(int slot) {
        // Key each slot by the stand's UUID, so repeated mappings of the same
        // stand are recognized as the same slots
        return new SlotKey(this.stand.getUniqueId(), slot);
    }

    @Override
    public boolean alive() {
        // Once the stand is broken or unloaded, the mapping retires on the next refresh
        return this.stand.isValid();
    }
}
```

```java
public static void openArmorStand(Player viewer, ArmorStand stand) {
    ReferencingInventory equipment = ReferencingInventory.of(new ArmorStandStorage(stand));

    Pane pane = Pane.builder("#EEEE#EE#")
            // The first four E are helmet through boots, the last two main and off hand
            .addIngredient('E', equipment)
            .build();

    Window.builder(pane).setTitle("Edit armor stand").open(viewer);
}
```

The `ExternalStorage` methods, with the storage's own slots numbered from 0:

| Method | Purpose |
| - | - |
| `size()` | Slot count; fixed once created |
| `read(slot)` | Read one slot, `null` when empty. Returning your internal item directly is fine; the library only reads it, never modifies or stores it |
| `write(slot, item)` | Write one slot, `null` to clear. The item becomes yours; the library does not touch it afterwards |
| `maxStackSize(slot)` | This slot's stack limit, combined with the item's own limit |
| `alive()` | Whether the backing position still exists; returning `false` retires the mapping. Defaults to `true` |
| `keyOf(slot)` | The slot's identity; two slots with equal `SlotKey`s are the same position. Defaults to distinguishing by storage object |
| `readAll()`, `contentEquals(slot, item)` | Read every slot, compare one slot's contents. Both default to per-slot `read` calls; override to reduce overhead when needed |

These methods run on whatever thread accesses the referenced inventory, so the [thread requirements](https://catnies.github.io/sparrow-ui-wiki/inventory/referencing.md#thread-requirements) apply to them too.

If you already hold a vanilla `net.minecraft.world.Container`, `ExternalStorage.ofContainer(container)` wraps it so you do not have to implement anything.

**Next**: [Access rules and events](https://catnies.github.io/sparrow-ui-wiki/inventory/rules-events.md) — Limit what players can store and take, and run your own logic on content changes.
