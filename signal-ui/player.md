# Per-player display

Source: <https://catnies.github.io/sparrow-ui-wiki/signal-ui/player>

The minigame lobby has a "Ready" button. After Alice clicks it, her button says "Ready", while Bob's still says "Click to ready".

You could build a new button for every menu open and capture that `viewer`, but then the button cannot be shared between windows. A shared button has to know, at render time, who is looking.

## What binding by viewer does

`dependsOn(signal, keyOf)` takes a [KeyedSignal](https://catnies.github.io/sparrow-ui-wiki/signal/keyed/basics.md) and a function that picks a key. The function receives the render context of the display position and returns the partition key to bind there.

For per-player partitions, return `context.player().getUniqueId()` and every viewer binds their own partition. When Alice's partition changes, only the button Alice sees refreshes.

## A shared ready button

`ready` keeps each player's ready state by UUID; see [Player partitions](https://catnies.github.io/sparrow-ui-wiki/signal/keyed/player.md). In the demo, the top row is what Alice sees and the bottom row is what Bob sees. Both are the same `readyButton`.

```java
MutableKeyedSignal<UUID, Boolean> ready = KeyedSignal.of(playerId -> false);
Signals.evictOnQuit(ready);

// create the button once and put it in every player's lobby menu
Item readyButton = Item.builder()
        .dependsOn(ready, context -> context.player().getUniqueId())
        .setItemProvider(context -> {
            boolean isReady = ready.get(context.player().getUniqueId());
            return isReady
                    ? named(Material.LIME_DYE, "Ready")
                    : named(Material.GRAY_DYE, "Click to ready");
        })
        .addClickHandler(click -> {
            ready.update(click.player().getUniqueId(), value -> !value);
        })
        .build();

Pane pane = Pane.builder("####R####")
        .addIngredient('R', readyButton)
        .build();
Window.builder(pane).setTitle("Minigame lobby").open(viewer);
```

1. **lines 1-2**: Every player starts not ready, and partitions are cleaned up when they quit.
2. **lines 5-16**: The button picks the partition by the viewer UUID from the render context, and the Provider reads with it too.
3. **lines 18-21**: Alice and Bob each open the lobby. The same button binds each of their partitions in the two windows.
4. **lines 13-15**: Alice clicks. Only her partition changes, and only the button she sees refreshes.
5. **lines 13-15**: Bob is ready too.
6. **lines 13-15**: Alice cancels; Bob is unaffected.

## Binding by a business key

The key does not have to come from the player. An arena entrance button shows the desert arena's player count, and every viewer binds the same partition, `"desert"`.

```java
MutableKeyedSignal<String, Integer> arenaPlayers = KeyedSignal.of(arena -> 0);

Item desertButton = Item.builder()
        .dependsOn(arenaPlayers, context -> "desert")  // every viewer binds the desert partition
        .setItemProvider(context -> {
            String name = "Desert arena: " + arenaPlayers.get("desert") + " players";
            return named(Material.SAND, name);
        })
        .build();
```

After game code calls `arenaPlayers.update("desert", count -> count + 1)`, everyone looking at this button sees the new count; forest arena changes leave it alone.

## Caveats

> **Warning: Do not capture the viewer from menu creation**
>
> In shared Providers and click handlers, use `context.player()` for the viewer and `click.player()` for the clicker. Capturing a `viewer` from menu creation makes everyone see that one player's data.

> **Warning: keyOf runs at mount time**
>
> The key function runs once when the item is mounted in a slot. If a player switches teams mid-session, the function would now return another key, but slots already mounted do not rebind. To follow a selection, use [switching](https://catnies.github.io/sparrow-ui-wiki/signal/derive/switching.md).

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

**Next**: [List contents](https://catnies.github.io/sparrow-ui-wiki/signal-ui/list.md) — Map a list that grows and shrinks onto a group of slots.
