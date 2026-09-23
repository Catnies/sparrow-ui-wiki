# SetSignal

Source: <https://catnies.github.io/sparrow-ui-wiki/signal/collection/set>

In the waypoint menu, places the player has visited show as maps and the rest show as question marks, with discovery progress at the top. The first time a player reaches a waypoint, it is recorded.

The catch is that players keep coming back to spawn. With a list, you would check for duplicates every time, or spawn gets recorded over and over and the progress goes wrong.

## What SetSignal does

A `SetSignal` is a `Set` you can subscribe to, with no duplicate elements. Adding an element that is already there changes nothing and notifies nobody.

It works almost like [ListSignal](https://catnies.github.io/sparrow-ui-wiki/signal/collection/list.md); `SetSignal.of()` returns a `MutableSetSignal`. It suits "have or have not" data, such as unlocked achievements, discovered waypoints, or checked options.

## Recording discovered waypoints

Each waypoint button in the menu uses `discovered.contains(name)` to decide between a map and a question mark.

```java
MutableSetSignal<String> discovered = SetSignal.of();
Signal<String> progress = discovered.mapDistinct(set ->
        "Discovered " + set.size() + " / 4"
);

discovered.add("Spawn");
discovered.add("Desert Temple");
boolean addedAgain = discovered.add("Spawn");  // already there, returns false, no notification

System.out.println(addedAgain);                           // false
System.out.println(progress.get());                       // Discovered 2 / 4
System.out.println(discovered.contains("Desert Temple"));  // true
```

1. **lines 1-4**: No waypoint visited yet.
2. **lines 6**
3. **lines 7**
4. **lines 8**: Back at spawn, it is recorded again. Spawn is already in the set, so add returns false and the menu does not refresh. No contains check needed.
5. **lines 10-12**: Prints false, Discovered 2 / 4, true.

## Backing set

`SetSignal.of()` is backed by a `LinkedHashSet` and iterates in insertion order. For cross-thread access, wrap a concurrent set.

```java
MutableSetSignal<String> discovered = SetSignal.wrap(ConcurrentHashMap.newKeySet());
```

`MutableSetSignal` also provides `batch`, `beforeAdd`, and `afterRemove`; see [ListSignal](https://catnies.github.io/sparrow-ui-wiki/signal/collection/list.md#merging-changes-with-batch).

## Caveats

> **Warning: Same rules as ListSignal**
>
> `get()` returns a live view of the set itself; after `wrap` it must only be changed through the wrapper; sets created with `of()` are not thread safe; hook handles must be kept.

> **Warning: add checks for duplicates before hooks**
>
> `add` first checks whether the original element is present, and if so, `beforeAdd` does not run. If a hook swaps in an element equal to one already in the set, the add has no effect.

> **Warning: Do not store players**
>
> Set elements are kept long term. Do not store `Player`, `Entity`, or `World`; use UUIDs, names, or ids.

**Next**: [MapSignal](https://catnies.github.io/sparrow-ui-wiki/signal/collection/map.md) — Hold data by key, such as a kill leaderboard or waypoints read from a config.
