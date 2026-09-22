# Virtual inventories

Source: <https://catnies.github.io/sparrow-ui-wiki/inventory/virtual>

A `VirtualInventory` keeps items in memory, fitting slots the menu manages itself: input slots, storages, reward chests. It can cap per-slot stacks, reorder bulk operations, and serialize its contents to a byte array and back.

## Creating a virtual inventory

```java
// 27 empty slots
VirtualInventory storage = new VirtualInventory(27);

// Built from an array; the length is the slot count, null means empty
VirtualInventory rewards = new VirtualInventory(new ItemStack[]{
        new ItemStack(Material.DIAMOND, 3),
        null,
        new ItemStack(Material.EMERALD, 16)
});
```

Array creation copies the items, so later changes to the array or the items do not reach the inventory. A negative slot count throws an `IllegalArgumentException`.

Every virtual inventory has a UUID, random by default, written out on save. To supply your own, use `new VirtualInventory(uuid, size)` or `new VirtualInventory(uuid, items)`; see [Saving and loading](https://catnies.github.io/sparrow-ui-wiki/inventory/virtual.md#saving-and-loading).

Once an inventory is bound to a Pane, Sparrow UI handles the player's actions, subject to the [access rules](https://catnies.github.io/sparrow-ui-wiki/inventory/rules-events.md) and the [freeze](https://catnies.github.io/sparrow-ui-wiki/inventory/basics.md#freezing-inventories).

## Stack limits

Each slot holds up to 99 by default, further capped by the item's own max stack size; the smaller value wins. So a diamond slot takes 64 by default and a sword only one, matching vanilla.

`setMaxStackSizes` sets per-slot limits in slot order. The three socket slots below each take a single gem:

```java
VirtualInventory sockets = new VirtualInventory(3);
// One gem per socket slot
sockets.setMaxStackSizes(new int[]{1, 1, 1});

Pane pane = Pane.builder(
                "#########",
                "###GGG###",
                "#########"
        )
        .addIngredient('G', sockets)
        .build();
```

The array length must equal the slot count. For one slot, use `setMaxStackSize(slot, max)`. Limits are at least 1; a wrong array length or a limit below 1 throws an `IllegalArgumentException`.

With a limit of 1, player interactions behave like this:

- Holding 64 gems and left-clicking an empty socket places one gem, leaving the rest on the cursor
- Shift-clicking a stack of gems from the inventory places one gem into each empty socket
- A drag spreads at most one gem per slot
- Holding more than one gem, the item cannot be swapped with a socket's contents, and number-key swaps will not put it into an empty socket either

Stack limits only cap quantities. Restricting slots to gems specifically is the job of [access rules](https://catnies.github.io/sparrow-ui-wiki/inventory/rules-events.md).

> **Warning: Slot limits stay under the item's own limit**
>
> A slot's limit never exceeds the item's own max stack size, so setting it above 99 does nothing. To fit 99 arrows in one slot, raise the item's own limit first:
>
> ```java
> ItemStack arrows = new ItemStack(Material.ARROW, 99);
> // The item's own stack limit goes up to 99
> arrows.setData(DataComponentTypes.MAX_STACK_SIZE, 99);
> ```

Programmatic puts like `add` and `changeAmount` respect the limits too. `setItem` writes as given and checks nothing. Lowering a limit keeps items that already exceed it in place; players can still take them out.

## Iteration order

Some operations do not name slots; the inventory decides which slots to fill or drain. These are the bulk operations. When a player shift-clicks items into the inventory, they may spread over several slots; double-click collection drains similar items from several slots; a code call to `add` is the same.

Bulk operations walk the slots in iteration order, slot 0 first by default through the last. Operations that name a slot, such as clicking one or calling `setItem(slot, item)`, ignore the order.

Iteration order is configured per operation category, `OperationCategory`:

| Category | Operations using this order |
| - | - |
| `OperationCategory.ADD` | Shift transfers into this inventory, `add` and other put methods |
| `OperationCategory.COLLECT` | Double-click collection from this inventory, `collect` |
| `OperationCategory.OTHER` | `remove` |

When putting, the order is used to merge with similar items first, then to claim empty slots in the same order. When collecting, partial stacks go first, then full stacks, both rounds in that order.

`reverseIterationOrder` flips the order. The storage below fills from the last slot forward:

```java
VirtualInventory storage = new VirtualInventory(27);
// Puts start at the last slot and work forward
storage.reverseIterationOrder(OperationCategory.ADD);
```

`reverseIterationOrder()` with no arguments reverses all three categories. It reverses whatever order is currently in effect: a custom one, if you set one.

### Custom order

`setIterationOrder` takes a `SlotOrder`. The display case below fills from the middle slot outward:

```java
VirtualInventory showcase = new VirtualInventory(9);
// From the middle, alternating outward: 4, 3, 5, 2, 6, 1, 7, 0, 8
showcase.setIterationOrder(OperationCategory.ADD, SlotOrder.of(4, 3, 5, 2, 6, 1, 7, 0, 8));

Pane pane = Pane.builder("SSSSSSSSS")
        .addIngredient('S', showcase)
        .build();
```

```text title="Display case"
SSSSSSSSS
```

- `S`: display case (`paper`)

Counts show the fill sequence; the middle slot, unnumbered here, fills first.

`SlotOrder.of`'s arguments are the slots to visit in order. Every index from 0 to slot count minus 1 must appear exactly once, or it throws an `IllegalArgumentException`; `setIterationOrder` throws the same exception when the order's length differs from the inventory's slot count.

Iteration order decides which slot goes first inside one inventory. With several inventories in a Window, which inventory goes first is decided by [priority](https://catnies.github.io/sparrow-ui-wiki/inventory/basics.md#priority).

## Saving and loading

`serialize()` writes the inventory's UUID and current contents to a byte array, and `VirtualInventory.deserialize(bytes)` rebuilds one from it:

```java
// Saving: a byte array containing the UUID and current contents
byte[] bytes = storage.serialize();

// Loading: a fresh inventory with the same UUID as when saved
VirtualInventory restored = VirtualInventory.deserialize(bytes);
```

The byte array can go into a file or a database blob column. `uuid()` returns the inventory's UUID, which works as a save key. `serialize` captures the contents at the moment of the call.

`serialize` and `deserialize` touch no players or worlds, so they may run on async threads; file and database I/O belongs there too. Both must be called after `SparrowUI.getInstance().setUp(plugin)`.

> **Warning: Only the UUID and items are saved**
>
> Stack limits, iteration order, background, access rules, priorities, freeze state, and event subscriptions are not saved; set them again after loading:
>
> ```java
> VirtualInventory sockets = VirtualInventory.deserialize(bytes);
> // Stack limits do not ride along with the data; re-apply them
> sockets.setMaxStackSizes(new int[]{1, 1, 1});
> ```
>
> Calling the same configuration methods after both creating and loading an inventory keeps nothing from slipping through.

Saving also records the server's Minecraft data version. Reading old data on an upgraded server converts items to the current version; data saved by a newer version cannot be read by an older server.

Truncated data, a wrong format, or data from a newer version makes `deserialize` throw an `InventoryDecodeException`. The library never restores a partially filled inventory. Treat the exception as corruption: log it and keep the data aside, without retrying or overwriting it with a fresh empty inventory.

> **Tip: Growing an inventory**
>
> The slot count rides along with the data, so loading old data yields the original size. To grow one, copy the contents under the new slot count and keep the original UUID:
>
> ```java
> VirtualInventory saved = VirtualInventory.deserialize(bytes);
> if (saved.size() < 36) {
>     // Copy into the new size; extra slots stay empty, UUID unchanged
>     saved = new VirtualInventory(saved.uuid(), Arrays.copyOf(saved.snapshot(), 36));
> }
> ```

## Example: a personal backpack

Each player gets a 27-slot backpack, read from a file on first open and saved on menu close, player quit, and shutdown:

```java
public final class BackpackService {
    private static final int SIZE = 27;

    private final Path folder;
    // Reads and saves all go through this one thread, in submission order.
    // A player rejoining right after quitting reads after the quit save, so they see fresh data
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    // Each player's backpack loads once; every later open reuses the same inventory.
    // Re-reading the file on every open would let a new Window read stale content
    // before an old Window's save finished; two Windows holding separate inventories
    // would also let the later save overwrite the other
    private final Map<UUID, VirtualInventory> loaded = new ConcurrentHashMap<>();

    public BackpackService(Path folder) {
        this.folder = folder;
    }

    // On read failure the Future completes exceptionally; handle it in exceptionally
    public CompletableFuture<Window.OpenResult> open(Player viewer) {
        UUID owner = viewer.getUniqueId();
        return CompletableFuture
                // First open reads the file on the io thread; later opens use the cache.
                // A failed read leaves nothing in the cache, so a corrupt file is never overwritten
                .supplyAsync(() -> this.loaded.computeIfAbsent(owner, this::read), this.io)
                .thenCompose(backpack -> {
                    Pane pane = Pane.builder(
                                    "SSSSSSSSS",
                                    "SSSSSSSSS",
                                    "SSSSSSSSS"
                            )
                            .addIngredient('S', backpack)
                            .build();
                    return Window.builder(pane)
                            .setTitle("Backpack")
                            // The close handler runs on the player thread; save only builds
                            // the byte array here, the file write happens on the io thread
                            .addCloseHandler((window, reason) -> this.save(backpack))
                            .open(viewer);
                });
    }

    // Called from PlayerQuitEvent; saves and drops the cache entry
    public void unload(UUID owner) {
        VirtualInventory backpack = this.loaded.remove(owner);
        if (backpack != null) {
            this.save(backpack);
        }
    }

    // Called from the plugin's onDisable.
    // On shutdown, Sparrow UI closes all Windows and runs their close handlers before
    // onDisable, and those saves are already queued on the io thread
    public void shutdown() throws InterruptedException {
        // Wait for every queued save to finish
        this.io.shutdown();
        this.io.awaitTermination(30, TimeUnit.SECONDS);
        // Plugins disable before players quit fires on shutdown, so quit events never arrive;
        // anything still cached is saved synchronously here
        for (VirtualInventory backpack : this.loaded.values()) {
            this.write(backpack.uuid(), backpack.serialize());
        }
    }

    private VirtualInventory read(UUID owner) {
        Path file = this.file(owner);
        if (Files.notExists(file)) {
            // The inventory uses the player's UUID, which finds the save file on save
            return new VirtualInventory(owner, SIZE);
        }
        try {
            return VirtualInventory.deserialize(Files.readAllBytes(file));
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }

    private void save(VirtualInventory backpack) {
        // Grab this moment's contents on the calling thread; the io thread does the writing
        byte[] bytes = backpack.serialize();
        this.io.execute(() -> this.write(backpack.uuid(), bytes));
    }

    private void write(UUID owner, byte[] bytes) {
        try {
            Files.createDirectories(this.folder);
            Files.write(this.file(owner), bytes);
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }

    private Path file(UUID owner) {
        return this.folder.resolve(owner + ".dat");
    }
}
```

**Next**: [Referenced inventories](https://catnies.github.io/sparrow-ui-wiki/inventory/referencing.md) — Plug player inventories, chests, and other existing containers into the menu.
