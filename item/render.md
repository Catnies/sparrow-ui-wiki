# Rendering and refresh

Source: <https://catnies.github.io/sparrow-ui-wiki/item/render>

An Item's display source can compute its item at display time. When the viewer's level, the current time, or a points value in the database changes, a refresh recomputes what is shown.

## Synchronous rendering

**Rendering** means calling the ItemProvider to get the `ItemStack` a slot should show; **refreshing** means asking for that to happen again. Once you configure a render function, it runs on first display and whenever a re-render is requested. It does not run automatically just because some data it read has changed.

`setItemProvider` takes a function: the input is the `RenderContext` for this render, the return value is the `ItemStack` to show. For example, showing the viewer's current level:

```java
Item levelItem = Item.builder()
        .setItemProvider(context -> {
            int level = context.player().getLevel();
            ItemStack stack = new ItemStack(Material.EXPERIENCE_BOTTLE);
            stack.setData(
                    DataComponentTypes.CUSTOM_NAME,
                    Component.text("Level: " + level, NamedTextColor.AQUA)
                            .decoration(TextDecoration.ITALIC, false)
            );
            return stack;
        })
        .build();
```

The function reads the level at render time, so the same Item can show different things to different players. If the level should also update while the menu stays open, add the `updatePeriodically` option covered later on this page.

`setItemProvider` wraps the function into a synchronous provider. If you would rather keep the provider around as its own object, build it with `ItemProvider.sync(renderer)` first and pass it to `Item.simple(provider)`.

> **Warning: Do not block inside synchronous rendering**
>
> Synchronous rendering of window slots runs on the viewer's entity thread. Database queries, HTTP requests, and file reads belong in async tasks; do not wait on Futures or do blocking I/O here.
>
> A render function's job is producing an item. It should not modify the Window, Pane, or Inventory, and should not request refreshes internally. Return `ItemStack.empty()` for no item, never `null`; do not modify the returned item afterwards either.

## What RenderContext provides

Every render receives the context of the position being displayed. When the same Item appears in several Windows or slots, each render works with the context passed to it.

| Member | Meaning |
| - | - |
| `player()` | The player currently viewing this item |
| `window` | The Window this render belongs to |
| `windowSlot` | The slot index in the Window, starting at 0 |
| `remember(value)` | Stashes data for later retrieval by interactions on this slot |

`window` and `windowSlot` are fields, so no parentheses when accessing them. `windowSlot` is the final position in the Window, not the slot index inside a child Pane.

### Handing display-time data to click behavior

If the click behavior needs to know "what was just displayed", call `remember` while rendering and read it back with `click.remembered()` in the handler. For example, remembering the level at display time:

```java
Item levelItem = Item.builder()
        .setItemProvider(context -> {
            int level = context.player().getLevel();
            context.remember(level);

            ItemStack stack = new ItemStack(Material.EXPERIENCE_BOTTLE);
            stack.setData(
                    DataComponentTypes.CUSTOM_NAME,
                    Component.text("Level: " + level, NamedTextColor.AQUA)
                            .decoration(TextDecoration.ITALIC, false)
            );
            return stack;
        })
        .addClickHandler(click -> {
            Integer shownLevel = click.remembered();
            if (shownLevel != null) {
                click.player().sendMessage(
                        Component.text("Level when displayed: " + shownLevel)
                );
            }
        })
        .build();
```

Remembered values are keyed by window slot, so sharing one Item never mixes them up. Calling `remember` again overwrites the previous value, passing `null` clears it; the record is also cleared when the display path changes or the Window closes. With nothing remembered, `remembered()` returns `null`.

> **Warning: Remember before the render callback returns**
>
> `remember` must be called before this render callback returns. Do not wait for an async query and write from `thenApply`. The record is held until overwritten or cleared, which fits interaction data like ids and counts.

## Async loading and placeholders

When the data comes from a database or another external source, use `setItemProviderAsync`. Its provider returns a `CompletableFuture<ItemStack>`: once the future completes, the library schedules the result for display.

What is shown while waiting depends on the placeholder and the most recent successful result:

| State | What is displayed |
| - | - |
| First load, nothing yet | The placeholder, or empty if none was configured |
| Something shown, reloading | The previous successful item |
| New result arrives | The new item |
| Load fails | The old result stays; on a first failure the placeholder remains |

### Reading points from a database

An async task that returns `128` points after one second stands in for the real query here. Press play: a gray dye placeholder shows first, and a second later it becomes the points item. Every playthrough simulates the first load after reopening the menu.

`loadPoints()` returns the async result, `pointsStack()` turns points into a display item, and `loadingStack()` builds the placeholder shown during the first load:

```java
import io.papermc.paper.datacomponent.DataComponentTypes;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;
import net.kyori.adventure.text.format.TextDecoration;
import net.momirealms.sparrow.ui.item.Item;
import org.bukkit.Material;
import org.bukkit.inventory.ItemStack;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

public final class PointsItem {
    public static Item create() {
        return Item.builder()
                .setItemProviderAsync(
                        context -> loadPoints().thenApply(PointsItem::pointsStack),
                        loadingStack()
                )
                .build();
    }

    private static CompletableFuture<Integer> loadPoints() {
        return CompletableFuture.supplyAsync(
                () -> 128,
                CompletableFuture.delayedExecutor(1, TimeUnit.SECONDS)
        );
    }

    private static ItemStack pointsStack(int points) {
        ItemStack stack = new ItemStack(Material.LIME_DYE);
        stack.setData(
                DataComponentTypes.CUSTOM_NAME,
                Component.text("Points: " + points, NamedTextColor.AQUA)
                        .decoration(TextDecoration.ITALIC, false)
        );
        return stack;
    }

    private static ItemStack loadingStack() {
        ItemStack stack = new ItemStack(Material.GRAY_DYE);
        stack.setData(
                DataComponentTypes.CUSTOM_NAME,
                Component.text("Loading points…", NamedTextColor.GRAY)
                        .decoration(TextDecoration.ITALIC, false)
        );
        return stack;
    }
}
```

The Item from `PointsItem.create()` goes straight into a Pane's `addIngredient`. To wire in a real backend, replace `loadPoints()` with the query method that returns a points future.

> **Warning: Async configuration and thread switching are two different things**
>
> `setItemProviderAsync` does not move your callback onto an async thread for you. In the example, `delayedExecutor` runs the task a second later, so nothing blocks the render thread. In a real async task, do not touch players, worlds, or Bukkit container state; read player UUIDs and similar inputs before submitting the task and pass them in.
>
> `ItemProvider.async(renderer)` is also available: it runs the whole renderer on Sparrow UI's async worker executor. With that variant, the renderer equally must not read Bukkit player or world state.

Once the future completes there is nothing to refresh by hand. When the Window closes or the display source has been replaced, an old task's result is no longer applied to its original slot; that does not cancel the database query itself.

## Controlling when refreshes happen

The provider defines how the item is produced; refresh rules define when it is produced again. A fixed provider returns the same content every time, so refreshing it never turns it into a dynamic item.

### Manual refresh

`Item.builder().build()` returns an `ObservableItem`, which offers `notifyWindows()`. After your business data changes, call it to tell every slot currently showing this item to re-render:

```java
AtomicInteger points = new AtomicInteger(128);
ObservableItem pointsItem = Item.builder()
        .setItemProvider(context -> {
            ItemStack stack = new ItemStack(Material.LIME_DYE);
            stack.setData(
                    DataComponentTypes.CUSTOM_NAME,
                    Component.text("Points: " + points.get(), NamedTextColor.AQUA)
                            .decoration(TextDecoration.ITALIC, false)
            );
            return stack;
        })
        .build();

points.set(256);
pointsItem.notifyWindows();
```

If you plan to refresh manually, keep the reference typed as `ObservableItem`.

**When the same Item is shared, `notifyWindows()` notifies every Window and slot currently showing it.** Each position re-renders with its own RenderContext, so the refresh scope is the same everywhere, but that does not mean every player sees the same content.

### Refreshing on a timer

`updatePeriodically(periodTicks)` refreshes the Item on a tick interval for as long as it is being displayed. The period must be greater than 0; once every display position is gone, you do not need to maintain this Item's timer yourself.

For example, re-reading the current time every 20 ticks:

```java
DateTimeFormatter format = DateTimeFormatter.ofPattern("HH:mm:ss");
Item clock = Item.builder()
        .setItemProvider(context -> {
            String time = LocalTime.now().format(format);
            ItemStack stack = new ItemStack(Material.CLOCK);
            stack.setData(
                    DataComponentTypes.CUSTOM_NAME,
                    Component.text(time, NamedTextColor.WHITE)
                            .decoration(TextDecoration.ITALIC, false)
            );
            return stack;
        })
        .updatePeriodically(20)
        .build();
```

This reads the server's local time; 20 ticks is about one second at the normal tick rate.

The same rule works with async providers. Adding `updatePeriodically(200)` to the points Item re-queries periodically. While a query is still running, no second query starts for the same display position: refresh requests are merged, and one more run is scheduled after the current one finishes.

### Refreshing after a click

`updateOnClick()` requests a refresh once every guard has passed and the click handler has returned normally. A guard rejection or a handler exception skips this automatic refresh.

**Click refreshes also notify every Window showing the Item.** Under the hood it calls `notifyWindows()` after the handler finishes, so with a shared Item, more than just the clicker's view refreshes.

Below, the click count lives in a variable outside the Item: the handler modifies it and the provider reads it for the name:

```java
AtomicInteger count = new AtomicInteger();
Item counter = Item.builder()
        .setItemProvider(context -> {
            ItemStack stack = new ItemStack(Material.LIME_DYE);
            stack.setData(
                    DataComponentTypes.CUSTOM_NAME,
                    Component.text("Clicks: " + count.get(), NamedTextColor.YELLOW)
                            .decoration(TextDecoration.ITALIC, false)
            );
            return stack;
        })
        .addClickHandler(click -> count.incrementAndGet())
        .updateOnClick()
        .build();
```

If this creation code runs once per menu open, each menu counts its own clicks; share the counter between several Windows and the count is shared too, with refreshes reaching every Window showing it.

> **Info: Refresh after async business work finishes**
>
> `updateOnClick()` waits for the click handler to return, not for async work the handler started. If a click kicks off an async database write, call `ObservableItem.notifyWindows()` once the write succeeds, so nothing reads data that is not yet updated.

**Next**: [Clicks and guards](https://catnies.github.io/sparrow-ui-wiki/item/click.md) — Read click information and configure actions plus pre-check guards.
