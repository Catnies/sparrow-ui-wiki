# debounce

Source: <https://catnies.github.io/sparrow-ui-wiki/signal/time/debounce>

In an item search menu, the player types into an anvil input box and matching items are listed below. Every keystroke changes the Signal.

While the player types `diamond`, `d`, `di`, and `dia` each trigger a search. Nobody has time to read those intermediate results, yet the server filters the whole item table several times.

## What debounce does

`debounce(ticks)` returns a Signal that delays its notification. After the original changes, it waits; if another change arrives during the wait, it starts waiting again. Once things have been quiet for the given number of ticks, it notifies once.

Reading it during the wait returns the value from the last notification.

## Search once typing stops

The raw input box text goes into `input`, and the search results depend only on the debounced `keyword`. Suppose the player types at ticks 0, 3, and 6, then stops.

```java
MutableSignal<String> input = Signal.of("");  // raw input box text
// updates only after 10 quiet ticks; strip trims spaces so an extra space does not search again
Signal<String> keyword = input.debounce(10).mapDistinct(String::strip);

Subscription subscription = keyword.onDirty(() -> {
    System.out.println("Search: " + keyword.get());
});

input.set("d");        // tick 0, starts waiting
input.set("dia");      // tick 3, waits again
input.set("diamond");  // tick 6, waits again
// tick 16, quiet for 10 ticks, prints "Search: diamond"
```

1. **lines 1-3**: The input box is empty and there are no results.
2. **lines 5-7**: Subscribe to the keyword. Debounce only schedules timers while it has subscribers.
3. **lines 9**: Start waiting 10 ticks. keyword keeps its old value, so no search.
4. **lines 10**: More input during the wait restarts the timer.
5. **lines 11**: Restarted again. The earliest notification is now tick 16.
6. **lines 12**: Three inputs, one search. Prints Search: diamond.

The `example` module of the [GitHub repository](https://github.com/Catnies/sparrow-ui) has a complete live search menu, `LiveSearchMenu`, written this way.

## Counting milliseconds

`debounce(10)` counts server ticks and equals about 500 milliseconds only at 20 TPS; when the server lags, the wait grows. To count real time, use `debounceMillis`.

```java
Signal<String> keyword = input.debounceMillis(500).mapDistinct(String::strip);
```

## Caveats

> **Warning: Constant input means no notification**
>
> If the player never stops, debounce keeps waiting. When a value changes continuously and you still want to see it periodically, use [throttle](https://catnies.github.io/sparrow-ui-wiki/signal/time/throttle.md).

> **Warning: No delay without subscribers**
>
> Debounce only schedules timers while it has subscribers. Creating `keyword` and calling `get()` just reads the original's current value without waiting. When the last subscription closes, pending timers are cancelled.

> **Warning: Notifications come from a scheduler thread**
>
> The tick version notifies on the Bukkit main thread, or the global region thread on Folia; the millisecond version notifies on Sparrow UI's async worker thread. Neither is the player's region thread, so do not touch players or blocks directly in the listener.
>
> The notification reads the original Signal, and an upstream `map` may compute on this thread too, so keep the whole chain short and free of slow I/O.

> **Warning: Interval and initialization**
>
> The interval must be greater than 0, or `IllegalArgumentException` is thrown. Sparrow UI must be [initialized](https://catnies.github.io/sparrow-ui-wiki/getting-started/installation.md#initialization) first.

**Next**: [throttle](https://catnies.github.io/sparrow-ui-wiki/signal/time/throttle.md) — Limit how often notifications fire, such as refreshing paste progress at most twice a second.
