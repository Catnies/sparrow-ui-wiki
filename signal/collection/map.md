# MapSignal

Source: <https://catnies.github.io/sparrow-ui-wiki/signal/collection/map>

During a team fight, kills are recorded per player name, and the scoreboard menu shows who is leading at the top.

Kill counts are naturally a "name → count" map. Holding it in a `MutableSignal<Map<...>>` means copying the whole map and calling `set` for every kill.

## What MapSignal does

A `MapSignal` is a `Map` you can subscribe to. `put`, `remove`, `merge`, `compute`, and the other modifying methods all notify whatever depends on it. `MapSignal.of()` returns a `MutableMapSignal`.

Mind the two `get`s: `kills.get("Bob")` is the `Map` method and reads one value; the no-argument `kills.get()` is the `Signal` method and returns the whole map.

## A kill leaderboard

The leader depends on everyone's kills, so it depends on the whole map.

```java
MutableMapSignal<String, Integer> kills = MapSignal.of();
Signal<String> leader = kills.map(map -> map.entrySet().stream()
        .max(Map.Entry.comparingByValue())
        .map(entry -> entry.getKey() + " (" + entry.getValue() + " kills)")
        .orElse("Nobody yet")
);

kills.merge("Alice", 1, Integer::sum);  // puts 1 when the key is missing
kills.merge("Bob", 1, Integer::sum);
kills.merge("Bob", 1, Integer::sum);    // adds to it when present

System.out.println(kills.get("Bob"));   // 2
System.out.println(leader.get());       // Bob (2 kills)
```

1. **lines 1-6**: The match starts; nobody has a kill.
2. **lines 8**
3. **lines 9**: A tie; max keeps the first one, Alice. leader is derived with map, so it notifies even though its result is unchanged.
4. **lines 10**: Bob takes the lead.
5. **lines 12-13**: Prints 2, Bob (2 kills).

When each display position only cares about one key, such as each player's head showing their own kills, Alice's change also refreshes Bob's display. Use a [KeyedSignal](https://catnies.github.io/sparrow-ui-wiki/signal/keyed/basics.md) for that, which notifies each key separately.

## Wrapping data read from a config

The waypoint list is read from a config file, and the config loader returns a `LinkedHashMap` that keeps the config order. Wrap it with `wrap`, and waypoints added later go at the end.

```java
record Waypoint(String world, int x, int y, int z) {}

Map<String, Waypoint> loaded = new LinkedHashMap<>();
loaded.put("Spawn", new Waypoint("world", 0, 64, 0));
loaded.put("Mines", new Waypoint("world", 320, 12, -150));

MutableMapSignal<String, Waypoint> waypoints = MapSignal.wrap(loaded);
Signal<List<String>> names = waypoints.map(map -> List.copyOf(map.keySet()));

waypoints.put("Nether Portal", new Waypoint("world", -88, 70, 42));
System.out.println(names.get());  // [Spawn, Mines, Nether Portal]
```

Waypoints store a world name and coordinates rather than a `Location`, because a `Location` holds a `World` object.

## Backing map and hooks

`MapSignal.of()` is backed by a `LinkedHashMap`: insertion order, `null` keys and values allowed. For cross-thread access, wrap a `ConcurrentHashMap`, which has no iteration order and rejects `null`.

```java
MutableMapSignal<String, Integer> kills = MapSignal.wrap(new ConcurrentHashMap<>());
```

`MutableMapSignal` provides `batch` with the same rules as [ListSignal](https://catnies.github.io/sparrow-ui-wiki/signal/collection/list.md#merging-changes-with-batch). Its hooks are named a little differently.

| Hook | When |
| - | - |
| `beforePut((key, value) -> ...)` | Before a value is stored; returns the value actually stored |
| `afterRemove((key, value) -> ...)` | After an entry is removed; receives the removed key and value |

For example, `kills.beforePut((name, count) -> Math.max(0, count))` keeps kill counts from going negative. Overwriting a key runs `afterRemove` on the old value, then `beforePut` on the new one.

## Caveats

> **Warning: After wrap, change it only through the wrapper**
>
> `wrap` does not copy the map. Calling `loaded.put(...)` directly notifies nobody. Changes through `keySet()`, `values()`, `entrySet()`, and `Map.Entry.setValue` go through the wrapper and do notify. Maps created with `of()` are not thread safe.

> **Warning: Hooks on concurrent maps**
>
> A `put` with hooks reads before writing, so it is not atomic on concurrent maps. The `compute` family runs hooks inside the remapping function, where they may run more than once and must not touch the same map. Keep the hook handles.

**Next**: [Read-only views and online players](https://catnies.github.io/sparrow-ui-wiki/signal/collection/read-only.md) — Expose read-only access, and use Sparrow UI's built-in online player list.
