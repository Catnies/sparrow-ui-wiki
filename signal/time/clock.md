# Clocks

Source: <https://catnies.github.io/sparrow-ui-wiki/signal/time/clock>

Once a minigame room is full, the menu shows "Starting in 10 seconds" and counts down every second. Skill cooldowns are the same: the remaining time has to refresh every second.

During that time no data changes; only time passes. Nothing tells the menu to refresh, so the number stays at 10.

## What clocks do

A clock is a Signal that notifies automatically at a fixed interval. Use it to drive refreshes that depend only on time.

| API | Interval | Value of `get()` |
| - | - | - |
| `Signals.ticking()` | Every tick | Ticks elapsed while the clock has been running |
| `Signals.everyTicks(20)` | Every 20 ticks | Number of 20-tick periods elapsed |
| `Signals.everyMillis(1000)` | Every 1000 ms | Number of 1000 ms periods elapsed |

A clock's value is only a count, not the current time. Its job is to tell whatever depends on it that it is time to refresh.

## Match start countdown

Record the count at subscription time as the starting point, and take one second off for every 20-tick period. The countdown item depends on `remaining`.

```java
Signal<Long> clock = Signals.everyTicks(20);
long start = clock.get();  // record the start; the clock may already be running
Signal<Long> remaining = clock.mapDistinct(value ->
        Math.max(0L, 10L - (value - start))
);

Subscription subscription = remaining.onDirty(() -> {
    System.out.println("Starting in: " + remaining.get());
});
// prints every 20 ticks from here, counting 9 down to 0

// close when the match starts or the room disbands; reaching 0 does not stop the clock
subscription.close();
```

1. **lines 1-5**: The clock was already running, so the count is not 0. Record 37 as the start; 10 seconds remain.
2. **lines 7-9**: After subscribing, clock notifications start arriving.
3. **lines 10**: 20 ticks passed. Prints Starting in: 9.
4. **lines 10**: Another 20 ticks. Prints Starting in: 8.
5. **lines 10**: The tenth period; the countdown is over. Prints Starting in: 0.
6. **lines 10**: The clock keeps going, but remaining stays 0, so mapDistinct stops notifying.
7. **lines 12-13**: Close the subscription.

## Showing a cooldown in real time

Tick clocks slow down when the server lags. For things measured in real time, such as a skill cooldown, store a deadline and let the clock only trigger refreshes.

```java
static Signal<Long> cooldownSeconds(Signal<Long> readyAt) {
    return Signals.combine(Signals.everyMillis(1000), readyAt, (ignored, deadline) -> {
        long left = deadline - System.currentTimeMillis();
        return Math.max(0L, (left + 999) / 1000);  // round up to whole seconds
    }).mapDistinct(value -> value);
}
```

`readyAt` is the timestamp in milliseconds when the skill can be cast again. Casting writes `System.currentTimeMillis() + 8000`, and the display counts down from 8 every second. The clock's count is unused here; only its notifications trigger a recompute.

When `readyAt` is written again, `combine` notifies right away instead of waiting for the next second.

## Caveats

> **Warning: Clocks are shared**
>
> All clocks with the same period share one instance across the server. It starts with the first subscriber and stops when the last one leaves; the next subscriber continues from the previous count.
>
> So `get()` does not tell you how long a player has had the menu open, which is why the countdown records its own starting point. When a clock is already running, the first notification may arrive before a full period has passed, and the first second of a countdown may be short.

> **Warning: Threads and limits**
>
> Tick clocks notify on the Bukkit main thread, or the global region thread on Folia. Millisecond clocks notify on Sparrow UI's async worker thread. Manual listeners must not touch players or blocks directly. When a clock is used in a menu, Sparrow UI schedules the refresh onto the right thread.
>
> The `everyTicks` period must be positive, and the `everyMillis` period must be at least 50 milliseconds.

**Next**: [async](https://catnies.github.io/sparrow-ui-wiki/signal/source/async.md) — Query the database on a background thread and show a placeholder until the result arrives.
