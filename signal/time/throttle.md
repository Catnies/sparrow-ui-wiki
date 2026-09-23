# throttle

Source: <https://catnies.github.io/sparrow-ui-wiki/signal/time/throttle>

While a schematic is pasted, the placed block count goes up with every block. The progress menu shows "Placed 800 / 5000", but the count changes thousands of times per second.

Refreshing the menu on every change is wasteful. [Debounce](https://catnies.github.io/sparrow-ui-wiki/signal/time/debounce.md) does not work either: the count never stops changing during the paste, so debounce would only notify at the very end, and the player sees no progress until then.

## What throttle does

`throttle(ticks)` returns a Signal that limits how often it notifies. The first change notifies immediately, and after that at least the given number of ticks pass between notifications. Changes inside an interval are merged, and one catch-up notification fires when it ends, reading the latest value at that moment.

Reading it inside an interval returns the value from the last notification.

## Limiting progress refreshes

The paste logic keeps writing `placedBlocks`, and the progress item depends only on the throttled `limited`.

```java
MutableSignal<Integer> placedBlocks = Signal.of(0);
Signal<Integer> limited = placedBlocks.throttle(10);

Subscription subscription = limited.onDirty(() -> {
    System.out.println("Placed " + limited.get() + " / 5000");
});

placedBlocks.set(100);  // tick 0, prints "Placed 100 / 5000" right away
placedBlocks.set(400);  // tick 4, still inside the interval, held
placedBlocks.set(800);  // tick 8, held
// tick 10, interval ends, prints "Placed 800 / 5000"
// tick 20, nothing new during this interval, prints nothing
```

1. **lines 1-6**: Subscribe to the throttled progress.
2. **lines 8**: The first change notifies immediately and starts a 10-tick interval. Prints Placed 100 / 5000.
3. **lines 9**: Still inside the interval: the change is noted but not notified. limited still returns 100.
4. **lines 10**
5. **lines 11**: One catch-up notification reads the latest 800. Two changes became one refresh. Prints Placed 800 / 5000.
6. **lines 12**: No new changes, no more notifications.

The same writes through debounce and throttle compare like this.

| Time | Write | `debounce(10)` | `throttle(10)` |
| - | - | - | - |
| tick 0 | 100 | Starts waiting | Notifies 100 immediately |
| tick 4 | 400 | Waits again | Holds |
| tick 8 | 800 | Waits again | Holds |
| tick 10 | None | Keeps waiting | Catch-up, reads 800 |
| tick 18 | None | Notifies, reads 800 | Nothing |

## Limiting by milliseconds

To limit by real time, use `throttleMillis`.

```java
Signal<Integer> limited = placedBlocks.throttleMillis(500);
```

## Caveats

> **Warning: Notifications may come from different threads**
>
> The immediate notification runs on the thread that wrote the original. The catch-up runs on a scheduler thread: the Bukkit main thread or Folia's global region thread for ticks, Sparrow UI's async worker thread for milliseconds. One subscription's listener may be called from different threads over time, so it must be thread safe.

> **Warning: No throttling without subscribers**
>
> As with debounce, timers are only scheduled while there are subscribers and are cancelled when the last one closes. The interval must be greater than 0, or `IllegalArgumentException` is thrown.

**Next**: [Clocks](https://catnies.github.io/sparrow-ui-wiki/signal/time/clock.md) — Drive countdowns and cooldown displays with clocks that notify on a schedule.
