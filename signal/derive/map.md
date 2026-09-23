# map

Source: <https://catnies.github.io/sparrow-ui-wiki/signal/derive/map>

A player's health lives in a `Signal<Integer>`, but the menu needs to show text like "❤ 14 / 20", plus a ten-segment health bar.

You could update the text every time you change the health. But the text and the bar are just the health in another shape. There is no reason to store them separately, let alone make every place that changes health remember to update them.

## What map does

`map` takes a conversion function and derives a new Signal from the original. When the original changes, the new one follows.

A derived Signal is read-only. It also does not compute on every change: it waits until someone reads it, then computes and caches the result.

## Showing health text and a health bar

`map` returns a Signal, so you can `map` again. Below, health becomes text, then a percentage, then a ten-segment bar. The two menu items depend on `healthText` and `bar`.

Watch the "not computed yet" badge as you step. When health changes, the derived values are only marked stale; they are computed when someone reads them.

```java
MutableSignal<Integer> health = Signal.of(20);
Signal<String> healthText = health.map(value -> "❤ " + value + " / 20");
Signal<Integer> percent = health.map(value -> value * 100 / 20);
Signal<String> bar = percent.map(value ->
        "■".repeat(value / 10) + "□".repeat(10 - value / 10)
);

health.set(14);
health.set(9);

System.out.println(healthText.get());  // ❤ 9 / 20
System.out.println(bar.get());         // ■■■■□□□□□□
```

1. **lines 1-6**: Full health. The menu reads both derived values and shows them.
2. **lines 8**: Health drops to 14. Both derived values are notified and marked stale, but nothing is computed yet.
3. **lines 9**: Now 9. "❤ 14 / 20" is never computed at all.
4. **lines 11-12**: Reading computes once, from the latest health of 9. Menus work the same way: they read on the next tick when they redraw. Prints ❤ 9 / 20, ■■■■□□□□□□.

## Caveats

> **Warning: Notifies even when the result is unchanged**
>
> Every notification from the original makes `map` notify downstream, whether or not the result changed. When health drops from 13 to 12, the bar still has six segments, yet items depending on `bar` refresh once anyway.
>
> One extra refresh usually does not matter. When the result rarely changes and refreshes are costly, use [mapDistinct](https://catnies.github.io/sparrow-ui-wiki/signal/derive/map-distinct.md).

> **Warning: The function only uses its argument**
>
> The function runs on the thread calling `get()`, and concurrent reads may compute the same input more than once. Only compute a result from the argument; do not change state, send messages, or query a database.
>
> Reading another Signal inside the function creates no dependency, so the result will not update when that Signal changes. For several Signals, use [combine](https://catnies.github.io/sparrow-ui-wiki/signal/derive/combine.md).

**Next**: [mapDistinct](https://catnies.github.io/sparrow-ui-wiki/signal/derive/map-distinct.md) — Skip notifications when the result did not change, such as updating only when the player enters a new chunk.
