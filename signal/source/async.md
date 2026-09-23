# async

Source: <https://catnies.github.io/sparrow-ui-wiki/signal/source/async>

A player opens their profile menu and expects to see their kills and deaths. The stats live in a database.

Querying the database on the player's thread stalls the server for as long as the query takes. Querying on an async thread means checking, when the result comes back, whether the menu is still open and which slot to refresh.

## What Signal.async does

`Signal.async` runs a query on the executor you choose. Before the query finishes, reads return a placeholder; afterwards the result is stored and whatever depends on it is notified.

It takes three arguments: the placeholder, the executor that runs the query, and the query function. The first query is submitted on creation; call `dirty()` to query again.

## Load stats, refresh after a match

Suppose the plugin already has a `statsRepository` whose `load(UUID)` queries the database and returns a `PlayerStats`, and whose `addKills(UUID, int)` writes new kills. That is your project's code; Sparrow UI does not connect to databases. `ioExecutor` is the plugin's shared background I/O executor, and `viewer` is the player opening the menu.

```java
record PlayerStats(int kills, int deaths) {}

UUID playerId = viewer.getUniqueId();  // background tasks capture only the UUID, never the player
AsyncSignal<PlayerStats> stats = Signal.async(
        (PlayerStats) null,                   // placeholder, returned by get() until the query finishes
        ioExecutor,                           // where the query runs
        () -> statsRepository.load(playerId)
);
Signal<String> killsText = stats.map(value ->
        value == null ? "Loading…" : "Kills: " + value.kills()
);

System.out.println(killsText.get());  // Loading…
// once the query finishes, menus depending on killsText refresh to "Kills: 12"

// the match ends with 3 more kills
ioExecutor.execute(() -> {
    statsRepository.addKills(playerId, 3);
    stats.dirty();  // refresh after the write; get() keeps the old result while re-querying
});
// once the new query finishes, the menu shows "Kills: 15"
```

1. **lines 3-8**: The query is submitted to the executor on creation.
2. **lines 9-11**: The placeholder is null, which derives "Loading…". The menu shows placeholder content first.
3. **lines 13**: The query has not finished. With a fast query this could already be "Kills: 12". Prints Loading….
4. **lines 14**: The database answered. stats stores the result and notifies; the menu refreshes.
5. **lines 17-20**: dirty() after the write starts a new query. Meanwhile the previous result stays; it never falls back to "Loading…".
6. **lines 21**: The new result replaces the old one; the menu shows 15.

A `null` placeholder tells "not loaded yet" apart from "zero kills". If showing zeros first is fine, pass `new PlayerStats(0, 0)` instead.

An `AsyncSignal`'s value comes only from its query function. It has no `set` or `update`; refreshing means calling `dirty()`.

## Repeated refreshes are merged

Queries for one `AsyncSignal` never run in parallel. Calling `dirty()` while a query is running only records "query once more afterwards"; calling it many times still adds just one extra query.

| Moment | Action | `get()` |
| - | - | - |
| Loaded | Last result was 12 | 12 |
| Refresh | `dirty()` starts query A | 12 |
| A still running | Two more `dirty()` calls record one extra query | 12 |
| A finishes | Publishes 15, starts query B | 15 |
| B finishes | Publishes 18 | 18 |

A round with an extra query recorded still publishes its result; it is not discarded as stale.

## Caveats

> **Warning: Do not refresh itself from the query**
>
> The query function must not directly or indirectly call its own `dirty()`, or `IllegalStateException` is thrown. Refreshes come from completed writes, player actions, or [polling](https://catnies.github.io/sparrow-ui-wiki/signal/source/polling.md).

> **Warning: Query and notification threads**
>
> The query runs on the executor's thread and should only touch the database, the network, or thread-safe data. Do not read player inventories or change the world.
>
> The notification after loading comes from that same thread. Manual `onDirty` listeners are not moved back to the player's thread, so schedule that yourself. Inside menus, Sparrow UI handles the refresh.

> **Warning: Equality and errors**
>
> A new result equal to the old one does not notify, using `Objects.equals` by default. For other rules, pass a comparison function as the fourth argument.
>
> If the query throws a `RuntimeException` or the executor rejects the task, the exception goes to Sparrow UI's exception handler and the current value is kept. If the very first query fails, the value stays at the placeholder; call `dirty()` again to retry. To show "failed to load", have the query return a business value that means failure.

Stats that belong to each player and are shared by several menus fit better in a source partitioned by UUID; see [Player partitions](https://catnies.github.io/sparrow-ui-wiki/signal/keyed/player.md).

**Next**: [polling](https://catnies.github.io/sparrow-ui-wiki/signal/source/polling.md) — When other services change the data, query again periodically while someone is watching.
