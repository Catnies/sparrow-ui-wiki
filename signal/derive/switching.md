# switching

Source: <https://catnies.github.io/sparrow-ui-wiki/signal/derive/switching>

The skill menu has two class tabs at the top, Warrior and Mage, and shows the remaining skill points of the current class below. Each class's skill points live in their own Signal.

Combining the class and both point Signals with [combine](https://catnies.github.io/sparrow-ui-wiki/signal/derive/combine.md) gives the right answer, but adds dependencies. While a player looks at the Warrior tab, any change to the Mage points still refreshes the item. The more classes, the more wasted refreshes.

## What switching does

`Signals.switching` takes a "selection" Signal and a set of sources. It only follows the currently selected source; the others can change however they like without affecting it.

When the selection changes, it switches to the new source and reads its current value right away.

## Showing the selected class's skill points

The first argument maps selection values to sources, and the second is the selection Signal. The skill point item depends on `skillPoints`.

```java
MutableSignal<Integer> warriorPoints = Signal.of(5);
MutableSignal<Integer> magePoints = Signal.of(2);
MutableSignal<String> job = Signal.of("warrior");

Signal<Integer> skillPoints = Signals.switching(
        Map.of("warrior", warriorPoints, "mage", magePoints),
        job
);

Subscription subscription = skillPoints.onDirty(() -> {
    System.out.println("Skill points: " + skillPoints.get());
});

magePoints.set(3);     // mage not selected, prints nothing
job.set("mage");       // prints "Skill points: 3"
warriorPoints.set(6);  // warrior is no longer the source, prints nothing
magePoints.set(4);     // prints "Skill points: 4"

subscription.close();
```

1. **lines 1-8**: Warrior is selected, so skillPoints follows warriorPoints.
2. **lines 10-12**: Subscribe to skill point changes.
3. **lines 14**: The Mage points changed, but Mage is not selected, so the item does not refresh.
4. **lines 15**: Switch to Mage. It now follows magePoints and reads 3. Prints Skill points: 3.
5. **lines 16**: Warrior is no longer the source, so this change is ignored.
6. **lines 17**: Prints Skill points: 4.

In real projects the selection is usually an enum, such as `Map.of(Job.WARRIOR, warriorPoints, Job.MAGE, magePoints)`.

## Switching between partitions

There are many arenas and new ones get added, so listing them in a map is not practical. Each arena's player count lives in a [KeyedSignal](https://catnies.github.io/sparrow-ui-wiki/signal/keyed/basics.md) partitioned by arena id, and `switching` accepts it directly.

```java
MutableKeyedSignal<String, Integer> arenaPlayers = KeyedSignal.of(arena -> 0);
MutableSignal<String> selectedArena = Signal.of("desert");
Signal<Integer> shown = Signals.switching(arenaPlayers, selectedArena);

arenaPlayers.set("desert", 6);
arenaPlayers.set("forest", 2);
System.out.println(shown.get());  // 6

selectedArena.set("forest");      // the player clicked the forest arena in the list
System.out.println(shown.get());  // 2
```

When partitions load asynchronously, switching to a new partition starts loading it on the first read, and the placeholder is returned meanwhile; see [Async and polling partitions](https://catnies.github.io/sparrow-ui-wiki/signal/keyed/async.md).

## Caveats

> **Warning: The map and the selection**
>
> The map is copied, so changing the original map later adds no sources. It must not be empty; if the current selection has no source in the map when read, `IllegalArgumentException` is thrown.
>
> The selection Signal's value must not be `null`.

**Next**: [merging](https://catnies.github.io/sparrow-ui-wiki/signal/derive/merging.md) — Track a group of members that come and go, such as the total health of a party.
