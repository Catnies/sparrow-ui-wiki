# polling

Source: <https://catnies.github.io/sparrow-ui-wiki/signal/source/polling>

In the lobby's minigame menu, the Bed Wars icon says "128 playing". The count lives in Redis and is updated by each game server.

The lobby hears nothing from those servers. Querying once with [async](https://catnies.github.io/sparrow-ui-wiki/signal/source/async.md) freezes the count at the moment the menu opened. Running your own timer means remembering to stop it when nobody is looking, or you keep hitting Redis for nothing.

## What Signal.polling does

`Signal.polling` is a `Signal.async` that queries again periodically. While someone is subscribed, it runs the query at a fixed interval; once the last subscriber leaves, it stops automatically.

The first three arguments match `Signal.async`, and the fourth is the polling period. Placeholders, error handling, and extra-query rules are the same as for async.

## Polling the player count

Suppose `network.onlineCount(String)` reads a game's player count from Redis, and `ioExecutor` is a background I/O executor. Every player opening the minigame menu can share this source, so create it once when the plugin starts.

```java
AsyncSignal<Integer> bedwarsOnline = Signal.polling(
        (Integer) null,
        ioExecutor,
        () -> network.onlineCount("bedwars"),
        100L                                  // query every 100 ticks
);
Signal<String> onlineText = bedwarsOnline.map(value ->
        value == null ? "Fetching player count…" : value + " playing"
);

// a player opens the minigame menu, which subscribes to onlineText; polling starts
Subscription watching = onlineText.onDirty(() -> {
    System.out.println(onlineText.get());
});
// from here on it queries every 100 ticks and prints only when the count changes

// the last viewer closes the menu; polling stops
watching.close();
```

1. **lines 1-9**: The first query is submitted on creation. This only creates the source; without a subscriber it does not keep polling.
2. **lines 11-14**: With a subscriber, polling starts. The first query returns 128. Prints 128 playing.
3. **lines 15**: The second query also returns 128. Same result, no notification.
4. **lines 15**: Three more players joined; the count is 131. Prints 131 playing.
5. **lines 17-18**: The last subscription closes and polling stops. The value stays at 131.

Menus that bind through `dependsOn` and similar APIs subscribe on open and unsubscribe on close, so nothing needs to be managed by hand. As long as one menu is open, polling continues.

Polling resumes when someone subscribes again. If more than one period has passed since the last query and none is running, a query runs immediately, so players do not see a stale count.

## Polling by real time

`100` ticks is about 5 seconds at 20 TPS, longer when the server lags. To poll by real time, use `pollingMillis`.

```java
AsyncSignal<Integer> bedwarsOnline = Signal.pollingMillis(
        (Integer) null,
        ioExecutor,
        () -> network.onlineCount("bedwars"),
        5000L
);
```

## Caveats

> **Warning: No subscriber, no continuous polling**
>
> Calling `get()` or `map` alone does not start polling; a subscription is required. Stopping does not cancel queries already submitted; they still finish and update the value. Calling `bedwarsOnline.dirty()` refreshes regardless of subscribers.

> **Warning: Periods and extra queries**
>
> Pollers with the same period share one clock and query on its beat, not "5 seconds after the last query finished". When a query takes longer than the period, the same Signal never queries in parallel and instead [merges into one extra query](https://catnies.github.io/sparrow-ui-wiki/signal/source/async.md#repeated-refreshes-are-merged).
>
> The `polling` period must be positive, and `pollingMillis` must be at least 50 milliseconds.

> **Warning: You read the latest result**
>
> A polled value is only the result of the latest query. Whether a game still has room when a player joins must be checked by the game logic in real time.

Writing a `Signal.polling` for every game gets tedious. A [KeyedSignal.polling](https://catnies.github.io/sparrow-ui-wiki/signal/keyed/async.md) partitioned by game id only polls the games someone is looking at.

**Next**: [ListSignal](https://catnies.github.io/sparrow-ui-wiki/signal/collection/list.md) — Hold a list that grows and shrinks, such as a minigame room's waiting queue.
