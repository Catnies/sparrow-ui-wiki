# Player partitions

Source: <https://catnies.github.io/sparrow-ui-wiki/signal/keyed/player>

Skill points are shared by the skill tree menu, the attribute menu, and the level-up prompt, one set per player. When Alice levels up and gains points, Bob's menus should not refresh.

The obvious way to keep state per player is a `Map<Player, ...>`. But a `Player` object is tied to one connection: after the player leaves, it stays in the map and leaks memory over time, and you have to write the cleanup yourself.

## What player partitions do

Use UUIDs as the keys of a [KeyedSignal](https://catnies.github.io/sparrow-ui-wiki/signal/keyed/basics.md), and every player gets an independent partition. Call `Signals.evictOnQuit(signal)` once, and from then on, whenever a player leaves the server, Sparrow UI calls `remove(uuid)` on it to clear that player's partition.

Sync, async, and polling partition sources can all be registered this way.

## Skill points per player

Skill points are created once at plugin startup inside a service class and shared by several menus.

```java
public final class SkillPoints {
    private final MutableKeyedSignal<UUID, Integer> points = KeyedSignal.of(playerId -> 0);

    public SkillPoints() {
        Signals.evictOnQuit(this.points);  // clear a player's partition when they quit
    }

    public MutableSignal<Integer> of(Player player) {
        return this.points.at(player.getUniqueId());
    }

    public MutableKeyedSignal<UUID, Integer> points() {
        return this.points;
    }
}
```

In the demo below, `alice` and `bob` are two players' UUIDs, and the two menu items depend on their partitions.

```java
MutableKeyedSignal<UUID, Integer> points = KeyedSignal.of(playerId -> 0);
Signals.evictOnQuit(points);

MutableSignal<Integer> alicePoints = points.at(alice);
alicePoints.update(value -> value + 2);  // Alice levels up and gains two points

System.out.println(alicePoints.get());   // 2
System.out.println(points.get(bob));     // 0, Bob's partition is unaffected

// Alice leaves the server and her partition is removed
// when she logs in again and it is read, the initializer rebuilds it
```

1. **lines 1-2**: Create the source and register it for cleanup on quit.
2. **lines 4-5**: Only Alice's item refreshes. Bob is looking at his own partition.
3. **lines 7-8**: Prints 2, 0.
4. **lines 10**: Alice quits and Sparrow UI calls remove(alice). Removing a partition does not notify its subscribers.
5. **lines 11**: Rebuilt at the initial value 0. This cleanup suits state that only matters while online; skill points that must persist should be written to the database when they change.

## Loading per player asynchronously

Each player's stats live in the database. Load them by UUID with `KeyedSignal.async` and clean them up on quit.

```java
KeyedSignal<UUID, PlayerStats> stats = KeyedSignal.async(
        (PlayerStats) null, ioExecutor, statsRepository::load
);
Signals.evictOnQuit(stats);

Signal<PlayerStats> own = stats.at(viewer.getUniqueId());
```

`statsRepository.load(UUID)` and `PlayerStats` are the same as on the [async](https://catnies.github.io/sparrow-ui-wiki/signal/source/async.md) page. The profile page and the leaderboard calling `at` for the same player share one query result. After stats are written to the database, call `stats.dirty(playerId)` to refresh that player.

To stay in sync with changes from other servers, replace `async` with `polling` or `pollingMillis`; only player partitions being viewed will poll.

## Using it in a menu

A shared button that shows the current viewer's skill points gets the viewer's UUID from the render context in `dependsOn`.

```java
Item pointsButton = Item.builder()
        .dependsOn(points, context -> context.player().getUniqueId())
        .setItemProvider(context -> {
            int value = points.get(context.player().getUniqueId());
            return new ItemStack(Material.EXPERIENCE_BOTTLE, Math.max(1, value));
        })
        .addClickHandler(click -> {
            points.update(click.player().getUniqueId(), value -> value + 1);
        })
        .build();
```

Alice and Bob look at the same button, each bound to their own partition, and Alice's click only refreshes the one she sees. See [Per-player display](https://catnies.github.io/sparrow-ui-wiki/signal-ui/player.md) for the full story.

## Caveats

> **Warning: You keep the source**
>
> Sparrow UI only holds registered sources weakly, so you must keep the source yourself, such as the `points` field above. Once the source is collected, the registration goes with it. Registering the same object twice counts once, and all registrations are released when the plugin shuts down.

> **Warning: Cleanup only removes the cache**
>
> Accessing a player's partition after they quit rebuilds it with the initializer, and offline UUIDs can be read and written as usual. Data that must persist has to be written to the database by you. Sparrow UI must be [initialized](https://catnies.github.io/sparrow-ui-wiki/getting-started/installation.md#initialization) first.

> **Tip: When you do not need player partitions**
>
> State that belongs to one window, such as a checkbox in a confirmation dialog or the page number for this opening, just needs a plain `MutableSignal` for that window; when the window closes, the state goes with it. Only per-player state shared between menus, or that must outlive a menu, belongs in player partitions.

**Next**: [Signals in the UI](https://catnies.github.io/sparrow-ui-wiki/signal-ui/item.md) — Bind the Signals from this section to items, lists, pagination, titles, and visual mappings.
