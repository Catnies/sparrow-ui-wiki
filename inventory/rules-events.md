# Access rules and events

Source: <https://catnies.github.io/sparrow-ui-wiki/inventory/rules-events>

Access rules decide whether a player may put items into or take items out of an inventory. Events notify you around every content change: before commit you can cancel or rewrite the change, and after commit you can log it or send a message.

## Where changes come from

Four sources can modify an inventory's contents, and they pass different checks:

| Source | Access rules | Pre-commit event | Post-commit event |
| - | - | - | - |
| Player actions in the menu | Checked | Dispatched | Dispatched |
| Code calling the `try`-prefixed methods | Checked | Dispatched | Dispatched |
| Code calling `setItem`, `add`, and other write methods | Skipped | Skipped | Dispatched |
| [Referenced inventories](https://catnies.github.io/sparrow-ui-wiki/inventory/referencing.md#syncing-external-changes) syncing external changes | Skipped | Skipped | Dispatched |

When modifying from code, pick the method by whether rules and events should apply. A `try` call can be rejected, so check the result:

```java
// Passes access rules and the pre-commit event; may be rejected
AddResult result = storage.tryAdd(reward);
if (!(result.result() instanceof TransactionResult.Committed)) {
    // Cancelled or conflicted; the inventory is untouched
    return;
}
// What did not fit
int remaining = result.remaining();
```

`TransactionResult` has three kinds: `Committed` means written, `Cancelled` means rejected by an access rule, the freeze, or the pre-commit event, and `Conflicted` means the inventory changed elsewhere before the commit. Neither of the last two writes anything.

## Access rules

`setAccessRule` sets a rule. Without a slot number it covers the whole inventory; with one, only that slot. When a slot has two rules, both must pass:

```java
VirtualInventory payment = new VirtualInventory(1);
// Whole-inventory rule: only the owner may store or take
payment.setAccessRule(context -> {
    Player player = context.player();
    // try requests from code have no player; let them through here
    return player == null || player.getUniqueId().equals(ownerId);
});
// Slot 0 rule: emeralds in only, taking out is unrestricted
payment.setAccessRule(0, context -> !context.isAdd() || context.addedItem().getType() == Material.EMERALD);
```

Passing `null` clears a rule. The `AccessContext` a rule receives describes the pending change to that slot:

| Method | Contents |
| - | - |
| `player()` | The player behind the change, `null` for code-initiated requests |
| `window()` | The Window the player acted in, `null` for code-initiated requests |
| `slot()`, `inventory()` | The slot and inventory being accessed |
| `before()`, `after()` | The slot's item before and after the change, `null` when empty |
| `isAdd()`, `addedItem()`, `addedAmount()` | Whether items flow in, which, and how many |
| `isRemove()`, `removedItem()`, `removedAmount()` | Whether items flow out, which, and how many |
| `reason()` | Why the change happens, see [Update reasons](https://catnies.github.io/sparrow-ui-wiki/inventory/rules-events.md#update-reasons) |

`addedItem()` carries the amount actually moved. With 8 items on the cursor and a right-click placing 1, `addedAmount()` is 1. Swapping two different items sets both `isAdd()` and `isRemove()`.

When a rule rejects a slot, the parts of the operation touching that slot fall apart: a single click places nothing; a shift transfer skips the slot and keeps looking at the next slot or inventory; a drag excludes it and re-splits the items across the rest. Best-effort calls like `tryAdd` skip rejected slots too; result-exact calls like `trySetItem` return `Cancelled` for the whole operation as soon as one slot is rejected.

> **Warning: Rules only judge**
>
> Inside a rule, only read the `AccessContext`. Do not modify any inventory, and do not send messages or charge players or do anything else with effects. One operation may invoke a rule several times, for instance when a drag re-splits across slots. Items in the `AccessContext` are read-only; do not modify or keep them.

## Click events

`subscribeClick` delivers a `SparrowInventoryClickEvent` whenever a player clicks this inventory's slots; calling `cancel()` blocks the click. Blocking Q-key drops straight out of a reward chest:

```java
rewards.subscribeClick(event -> {
    // No Q-key drops straight out of the reward chest
    if (event.clickType() == ClickType.DROP || event.clickType() == ClickType.CONTROL_DROP) {
        event.cancel();
    }
});
```

The event provides `player()`, `slot()`, `clickType()`, `hotbarButton()`, and `action()`. `slot()` is the inventory's own slot index; `action()` is the click's final effect, typed as Sparrow UI's own `InventoryClickAction` enum, and `NOTHING` when nothing changed. It covers common operations such as `PICKUP_ALL`, `PLACE_ONE`, and `MOVE_TO_OTHER_INVENTORY`, and tells bundle insertions and extractions apart, such as `PLACE_ALL_INTO_BUNDLE` and `PICKUP_FROM_BUNDLE`.

Only the clicked inventory receives the click event. On a shift transfer, the receiving inventory gets no click event, only the pre- and post-commit events below. Drags and clicks on button slots dispatch nothing here; button clicks are covered in [Clicks and guards](https://catnies.github.io/sparrow-ui-wiki/item/click.md).

When a player selects an item inside a bundle held in an inventory slot, `subscribeBundleSelect` is notified.

## Pre-commit events

`subscribePreUpdate` delivers an `InventoryPreUpdateEvent` before a change is written. Player actions and `try` methods dispatch it, and when one change touches several inventories, each gets its own event using its own slot indexes. Below, raw iron placed by a player turns into iron ingots on the spot:

```java
furnace.subscribePreUpdate(event -> {
    ItemStack placed = event.after(0);
    // Raw iron goes in, the same amount of iron ingots comes out
    if (placed != null && placed.getType() == Material.RAW_IRON) {
        event.setAfter(0, placed.withType(Material.IRON_INGOT));
    }
});
```

The event lets you read and rewrite the change:

| Method | Purpose |
| - | - |
| `slotChanges()`, `changeAt(slot)` | The slots about to change in this inventory, each with before and after items |
| `after(slot)` | The item this slot will hold once the change lands |
| `setAfter(slot, item)` | Rewrite what the slot will hold, `null` to clear it |
| `include(inventory)` | Pull another inventory into this change; afterwards use `after(inventory, slot)` and `setAfter(inventory, slot, item)` on it |
| `setCancelled(true)` | Cancel the whole change across all inventories |
| `interaction()` | Rewrite the player's cursor, off-hand, and drops afterwards; `null` when not a player action |

An included inventory commits together with the original or cancels together with it; see the [Example: an exchange stand](https://catnies.github.io/sparrow-ui-wiki/inventory/rules-events.md#example-an-exchange-stand) at the end of this page. Rewrites skip access rules.

The cancelled flag passes down the handler chain, and later handlers may call `setCancelled(false)` to restore it. Rewrites like `setAfter` only work before the handler returns, on the thread invoking it; keeping the event around and editing later throws an `IllegalStateException`.

> **Warning: Pre-commit effects are not rolled back**
>
> After the pre-commit event dispatches, later handlers may still cancel the change, or it may be dropped because the inventory changed elsewhere. Whatever you did inside the pre-commit event is not undone, so payments, reward delivery, and database writes belong in the post-commit event.
>
> Calling `setItem`, `clear`, and friends inside a pre-commit event is an independent change that writes immediately; it does not cancel along with this change.

## Post-commit events

`subscribePostUpdate` delivers an `InventoryPostUpdateEvent` after the change is written. All four sources dispatch it; the change is in effect and can no longer be cancelled. Logging what a player stored:

```java
storage.subscribePostUpdate(event -> {
    Player player = event.player();
    if (player == null) {
        return;
    }
    // Items shuffled between slots cancel out; what remains is what was truly stored
    for (ItemStack item : event.netAddedItems()) {
        logger.info(player.getName() + " stored " + item.getAmount() + " " + item.getType());
    }
});
```

Both events expose the following:

| Method | Contents |
| - | - |
| `reason()`, `player()` | Why the change happened and which player drove it; `player()` is `null` when not player-driven |
| `slotChanges()` | The slots that changed in this inventory |
| `netAddedItems()`, `netRemovedItems()` | What this inventory gained or lost on net |
| `netChange()` | The net change type: `NONE`, `ADDITION`, `REMOVAL`, or `MIXED` |
| `rootChanges()` | The changes across every inventory involved in this operation |

Modifying the inventory again inside a post-commit event is fine; it is just another independent change.

When a pre- or post-commit handler throws, the library hands it to the exception handler and the other handlers keep running. A pre-commit handler's rewrites do not apply when it throws.

### Threads and ordering

Access rules and all three event handlers run synchronously on the thread performing the change: the player's thread for player actions, the calling thread for code. The same handler can be invoked from several threads at once, so its thread safety is your job.

Post-commit events from different changes do not necessarily arrive in commit order. When order matters, compare the events' `version()`, where higher numbers committed later; virtual inventories can also dispatch in order:

```java
// Dispatch post-commit events strictly in commit order
storage.serialPostDispatch(true);
```

With this on, a later change waits for the previous one's post-commit handling to finish. Handlers still run on their own committing threads.

> **Warning: The inventory holds your subscriptions**
>
> The `Subscription` returned by `subscribeClick`, `subscribePreUpdate`, and `subscribePostUpdate` is held by the inventory until you call `close()` or the inventory is collected. Inventories created per menu open need no handling. For long-lived inventories, such as the [ones shared by several players](https://catnies.github.io/sparrow-ui-wiki/inventory/basics.md#several-players-sharing-one-inventory), call `close()` once you no longer need it, or the subscription and the objects your handler references stay in memory:
>
> ```java
> Subscription subscription = storage.subscribePostUpdate(event -> {
>     // ...
> });
>
> // Unsubscribe when the menu closes
> window.addCloseHandler(reason -> subscription.close());
> ```

## Update reasons

An event's `reason()` says where the change came from:

| Reason | Source |
| - | - |
| `PlayerUpdateReason.Click` | A player click, carrying `player()`, `clickType()`, and `hotbarButton()` |
| `PlayerUpdateReason.Drag` | A player drag, carrying `player()` and `clickType()` |
| `PlayerUpdateReason.BundleSelect` | A player selecting inside a bundle |
| `UpdateReason.Program` | The default reason for code calling write methods |
| `UpdateReason.External` | A referenced inventory syncing external changes |

Every write method accepts a reason as its first argument. `UpdateReason` is an interface, so define your own to let handlers tell changes apart:

```java
record AdminReason(String admin) implements UpdateReason {
}

// Write with the custom reason
storage.setItem(new AdminReason(admin.getName()), 0, new ItemStack(Material.DIAMOND));

storage.subscribePostUpdate(event -> {
    switch (event.reason()) {
        case PlayerUpdateReason.Click click -> {
            // A player click; click.clickType() is the click kind
        }
        case UpdateReason.External external -> {
            // A referenced inventory changed outside the menu
        }
        case AdminReason adminReason -> {
            // Your own reason
        }
        default -> {
        }
    }
});
```

A reason only describes the source; it never changes behavior: `setItem` skips access rules no matter the reason, and `trySetItem` checks them no matter the reason. When the reason implements `PlayerUpdateReason`, rules can read the player from `player()`, and a [frozen inventory](https://catnies.github.io/sparrow-ui-wiki/inventory/basics.md#freezing-inventories) rejects the `try` request too.

## Coexisting with Bukkit events

When players interact with inventories in the menu, the library also dispatches Bukkit's `InventoryClickEvent` and `InventoryDragEvent` by default, so other plugins' listeners keep working. They fire after access rules and before Sparrow's click event:

- A listener cancelling the Bukkit event stops the operation.
- A listener editing slots or the cursor through the event, say via `setCurrentItem` or `setCursor`, makes the library treat the edited state as the operation's starting point and recompute the result. This matches vanilla's order of firing the event before applying the click.

When you do not need Bukkit events, or other plugins' listeners interfere with the menu, turn the dispatch off:

```java
// This inventory's interactions no longer dispatch Bukkit events
storage.fireBukkitInventoryEvents(false);

// No menu dispatches Bukkit events anymore
SparrowUI.getInstance().fireBukkitInventoryEvents(false);
```

The per-inventory switch only affects interactions touching that inventory's slots. When one operation involves several inventories, it dispatches if any of them has the switch on. Other interactions, like clicking button slots, follow the global switch alone. When no plugin listens to these events, the library does not even construct them. Sparrow's own click and commit events ignore both switches.

## Example: an exchange stand

The input slot on the left accepts only diamonds, converting each one immediately into two emeralds in the output slot on the right. The output slot is take-only, and closing the menu returns any unclaimed emeralds to the player:

```text title="Exchange stand"
##I###O##
```

- `I`: input, diamonds only
- `O`: output, take-only

```java
public static void openExchange(Player viewer) {
    VirtualInventory input = new VirtualInventory(1);
    VirtualInventory output = new VirtualInventory(1);

    // The input takes diamonds only; the output is take-only
    input.setAccessRule(context -> !context.isAdd() || context.addedItem().getType() == Material.DIAMOND);
    output.setAccessRule(context -> !context.isAdd());

    input.subscribePreUpdate(event -> {
        ItemStack placed = event.after(0);
        if (placed == null) {
            return;
        }
        // Pull the output into this change: clearing the input and filling the output
        // commit together or cancel together
        event.include(output);
        ItemStack current = event.after(output, 0);
        int emeralds = (current == null ? 0 : current.getAmount()) + placed.getAmount() * 2;
        if (emeralds > 64) {
            // The output cannot fit it; cancel and the diamond stays put
            event.setCancelled(true);
            return;
        }
        event.setAfter(0, null);
        event.setAfter(output, 0, new ItemStack(Material.EMERALD, emeralds));
    });

    output.subscribePostUpdate(event -> {
        Player player = event.player();
        if (player == null || event.netChange() != InventoryNetChange.ADDITION) {
            return;
        }
        // The exchange is written; send the notice here
        int amount = event.netAddedItems().stream().mapToInt(ItemStack::getAmount).sum();
        player.sendMessage(Component.text("Exchanged for " + amount + " emeralds.", NamedTextColor.GREEN));
    });

    Pane pane = Pane.builder("##I###O##")
            .addIngredient('I', input)
            .addIngredient('O', output)
            .build();

    Window.builder(pane)
            .setTitle("Exchange stand")
            // On close, return unclaimed emeralds; the overflow drops at the player's feet
            .addCloseHandler((window, reason) -> {
                ItemStack left = output.itemAt(0);
                if (left == null) {
                    return;
                }
                output.clear();
                Player player = window.viewer();
                for (ItemStack overflow : player.getInventory().addItem(left).values()) {
                    player.getWorld().dropItemNaturally(player.getLocation(), overflow);
                }
            })
            .open(viewer);
}
```

When a player places a diamond, the input's pre-commit event clears it and writes the emeralds into the included output. Both inventories and the player's cursor change together, so there is never a moment where the diamond vanished but the emeralds have not arrived. If one deposit converts past 64 emeralds, the whole change cancels and the diamond stays on the cursor or in the inventory.

The output's access rule rejects adds, but pre-commit rewrites skip rules, so the exchanged emeralds can be written in. The notice goes out in the post-commit event, by which time the exchange is done.

**Next**: [Visual layers](https://catnies.github.io/sparrow-ui-wiki/visual/layers.md) — Change how slots look without touching the real items in the inventory.
