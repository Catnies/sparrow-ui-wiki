# mapDistinct

Source: <https://catnies.github.io/sparrow-ui-wiki/signal/derive/map-distinct>

The status menu has an icon that shows "Healthy", "Wounded", or "Dying" depending on health. In a fight, health drops almost every second, but the icon only changes once in a while.

Deriving this status with [map](https://catnies.github.io/sparrow-ui-wiki/signal/derive/map.md) redraws the icon on every lost point of health, and nearly all of those redraws look exactly the same.

## What mapDistinct does

`mapDistinct` computes a new value from the original, just like `map`. The extra step is a comparison: when this result equals the previous one, downstream is not notified.

Results are compared with `Objects.equals` by default, or with a comparison function you pass in.

## Refresh only when the condition changes

Above 10 health is healthy, above 4 is wounded, and anything lower is dying. Click "Next" to run the code line by line and see when the icon refreshes.

```java
MutableSignal<Integer> health = Signal.of(20);
Signal<String> condition = health.mapDistinct(value ->
        value > 10 ? "Healthy" : value > 4 ? "Wounded" : "Dying"
);

Subscription subscription = condition.onDirty(() -> {
    System.out.println("Now: " + condition.get());
});

health.set(16);  // still healthy, prints nothing
health.set(8);   // prints "Now: Wounded"
health.set(6);   // still wounded, prints nothing
health.set(3);   // prints "Now: Dying"
health.set(2);   // still dying, prints nothing

subscription.close();
```

1. **lines 1-4**: Full health, the condition is healthy.
2. **lines 6-8**: Subscribe to condition changes. Subscribing does not replay the current value.
3. **lines 10**: Recomputed, still healthy. Same result, so the icon does not refresh.
4. **lines 11**: The result becomes wounded, downstream is notified, and the icon refreshes. Prints Now: Wounded.
5. **lines 12**: Still wounded, no notification.
6. **lines 13**: Dying now, the icon refreshes. Prints Now: Dying.
7. **lines 14**: Five writes, two refreshes. With map it would be five.

## Update only when entering a new chunk

A land-claim hint only cares which chunk the player stands in, not the exact coordinates. Shifting block coordinates right by 4 gives chunk coordinates, and records implement `equals`, so two `ChunkPos` with the same coordinates count as the same result.

```java
record BlockPos(int x, int z) {}
record ChunkPos(int x, int z) {}

MutableSignal<BlockPos> position = Signal.of(new BlockPos(3, 3));
Signal<ChunkPos> chunk = position.mapDistinct(pos ->
        new ChunkPos(pos.x() >> 4, pos.z() >> 4)
);

Subscription subscription = chunk.onDirty(() -> {
    System.out.println("Entered chunk " + chunk.get());
});

position.set(new BlockPos(9, 3));    // still chunk (0, 0), prints nothing
position.set(new BlockPos(15, 12));  // still chunk (0, 0), prints nothing
position.set(new BlockPos(16, 12));  // prints "Entered chunk ChunkPos[x=1, z=0]"
position.set(new BlockPos(20, -1));  // prints "Entered chunk ChunkPos[x=1, z=-1]"

subscription.close();
```

1. **lines 4-7**: The player is in chunk (0, 0).
2. **lines 13**: The position changed, the chunk did not.
3. **lines 14**
4. **lines 15**: x reaches 16, crossing into chunk (1, 0). Prints Entered chunk ChunkPos\[x=1, z=0].
5. **lines 16**: z goes negative, entering chunk (1, -1). Prints Entered chunk ChunkPos\[x=1, z=-1].

## Custom result comparison

Chat channel names ignore case, and surrounding spaces do not count. Pass a comparison function as the second argument.

```java
MutableSignal<String> input = Signal.of("moon");
Signal<String> channel = input.mapDistinct(String::strip, String::equalsIgnoreCase);

Subscription subscription = channel.onDirty(() -> {
    System.out.println("Switched to channel: " + channel.get());
});

input.set(" MOON ");   // equal to moon once trimmed, prints nothing
input.set(" trade ");  // prints "Switched to channel: trade"

subscription.close();
```

The input box's own `input` still holds `" MOON "`; only the derived `channel` ignores that change.

## Caveats

> **Tip: Choosing between map and mapDistinct**
>
> `mapDistinct` has to compute the result before it can compare, so while subscribed, it computes on every source change. `map` can wait until the value is read.
>
> Use `map` when the result changes almost every time, such as health text or countdown seconds. Use `mapDistinct` when it often stays the same, such as a condition, the current chunk, or a "can afford" boolean.

> **Warning: The function runs on the writing thread**
>
> While subscribed, the function runs on the thread that wrote the source, to decide whether to notify. Keep it short and compute only from its argument.

> **Warning: Rules for the comparison function**
>
> The comparison follows the same rules as [Signal.of](https://catnies.github.io/sparrow-ui-wiki/signal/basics/mutable.md#caveats): an equivalence relation, short, no side effects.

**Next**: [combine](https://catnies.github.io/sparrow-ui-wiki/signal/derive/combine.md) — Compute one result from several Signals, such as mana, cost, and silence deciding whether a skill can be cast.
