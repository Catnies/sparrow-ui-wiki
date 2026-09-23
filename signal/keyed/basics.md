# KeyedSignal

Source: <https://catnies.github.io/sparrow-ui-wiki/signal/keyed/basics>

The arena list menu has an icon for each of the desert, forest, and tundra arenas, showing its current player count. When someone enters or leaves an arena, only that icon should change.

Putting all counts in a [MapSignal](https://catnies.github.io/sparrow-ui-wiki/signal/collection/map.md) means every icon depending on it refreshes whenever anyone enters or leaves any arena. With more arenas, most of those refreshes are wasted.

## What KeyedSignal does

A `KeyedSignal` holds a group of independent values by key; each key is called a partition. Every partition is read, subscribed to, and notified on its own, and changing one only affects what watches it.

The argument of `KeyedSignal.of` is an initializer. The first time a key is read, it computes the initial value, which is then cached.

There are two equivalent ways to read and write.

| Style | Example |
| - | - |
| Through the KeyedSignal with a key | `arenaPlayers.get("desert")`, `arenaPlayers.set("desert", 6)`, `arenaPlayers.update("desert", ...)` |
| Get a partition handle, then use it like any Signal | `desert.get()`, `desert.set(0)` |

The handle returned by `at(key)` is a regular `MutableSignal`: you can `map` it, `combine` it, or bind it in a menu.

## Player count per arena

Partition by arena id, with every count starting at 0. Each of the three icons depends on its own arena's partition.

```java
MutableKeyedSignal<String, Integer> arenaPlayers = KeyedSignal.of(arena -> 0);
MutableSignal<Integer> desert = arenaPlayers.at("desert");  // handle for the desert partition

Subscription subscription = desert.onDirty(() -> {
    System.out.println("Desert arena: " + desert.get() + " players");
});

arenaPlayers.update("forest", count -> count + 1);  // forest has nothing to do with desert, prints nothing
arenaPlayers.update("desert", count -> count + 1);  // prints "Desert arena: 1 players"
arenaPlayers.update("desert", count -> count + 1);  // prints "Desert arena: 2 players"
desert.set(0);                                      // match over, prints "Desert arena: 0 players"

subscription.close();
```

1. **lines 1-2**: All three arenas are empty.
2. **lines 4-6**: Subscribe to the desert partition.
3. **lines 8**: Only the forest icon refreshes; the desert subscription is not triggered.
4. **lines 9**: Prints Desert arena: 1 players.
5. **lines 10**: Prints Desert arena: 2 players.
6. **lines 11**: Writing through the handle does the same as arenaPlayers.set("desert", 0). Prints Desert arena: 0 players.

## Removing partitions

Once an arena closes, its partition is no longer needed, and `remove(key)` clears the cache.

```java
MutableKeyedSignal<String, Integer> arenaPlayers = KeyedSignal.of(arena -> 0);
MutableSignal<Integer> desert = arenaPlayers.at("desert");

desert.set(6);
arenaPlayers.remove("desert");
System.out.println(arenaPlayers.keys().get().isEmpty());          // true

System.out.println(desert.get());                                 // 0, rebuilt by the initializer
System.out.println(arenaPlayers.keys().get().contains("desert"));  // true
```

After `remove`, the `desert` handle you already have still works. The next read rebuilds the partition with the initializer, back to 0. Existing subscriptions and derivations stay attached and follow the rebuilt partition. `clear()` removes all partitions.

## Loading again

To recompute a partition with the initializer, call `dirty(key)`; the next read runs the initializer again. `dirtyAll()` does the same for every existing partition, and `dirty(key)` does not create a partition that does not exist yet.

For initializers that query a database, use [async partitions](https://catnies.github.io/sparrow-ui-wiki/signal/keyed/async.md).

## Caveats

> **Warning: remove only clears the cache**
>
> `remove` deletes no business data and does not notify the partition's subscribers. When an arena is deleted, the arena list itself must be updated too.

> **Warning: keys() is not a business list**
>
> `keys()` returns a Signal of the keys created so far, in no particular order. Creating and removing partitions notifies it; changing a partition's value does not.
>
> Reading a never-used key, or even just calling `at(key)`, creates a partition. So `keys()` only says which partitions were touched and cannot serve as the arena list or an online player list.

> **Warning: Keep the initializer fast**
>
> The initializer runs on the reading thread and should be fast, free of side effects, and safe to run more than once.
>
> Writing an equal value to a partition does not notify, using `Objects.equals` by default; for other rules, pass a comparison function as the second argument of `KeyedSignal.of`.

> **Warning: Keep players out of keys and values**
>
> Partitions are kept long term. Use lightweight keys such as arena ids or UUIDs; never use `Player` as a key, and do not let the initializer capture a `Player`, `Entity`, or `World`. For per-player partitions, see [Player partitions](https://catnies.github.io/sparrow-ui-wiki/signal/keyed/player.md).

**Next**: [Async and polling partitions](https://catnies.github.io/sparrow-ui-wiki/signal/keyed/async.md) — Load each partition from the database, or poll each one on its own.
