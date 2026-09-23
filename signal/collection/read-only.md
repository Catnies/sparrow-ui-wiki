# Read-only views and online players

Source: <https://catnies.github.io/sparrow-ui-wiki/signal/collection/read-only>

A room's waiting queue should only be changed by the room itself; menus, scoreboards, and other modules just display it. Hand out the `MutableListSignal`, though, and anyone can call `clear()` and wipe the queue.

Another common need is the online player list. Maintaining it yourself means listening to join and quit events and handling several players joining in the same tick.

## What read-only views and the online list do

Every collection Signal can produce a read-only view with `asReadOnly()`. The view can be read, subscribed to, and derived from, but any modifying method throws `UnsupportedOperationException`. It is another way of looking at the same collection, not a copy: when the source changes, the view's subscribers are notified.

`Signals.onlinePlayers()` is Sparrow UI's built-in online player list, a read-only `ListSignal<Player>` that updates as players join and leave.

## Exposing read-only access

Keep the field as `MutableListSignal` and return a read-only view.

```java
public final class GameRoom {
    private final MutableListSignal<UUID> waiting = ListSignal.of();

    // calling asReadOnly() repeatedly on the same list returns the same view object
    public ListSignal<UUID> waiting() {
        return this.waiting.asReadOnly();
    }

    public void join(UUID playerId) {
        if (!this.waiting.contains(playerId)) {
            this.waiting.add(playerId);
        }
    }

    public void leave(UUID playerId) {
        this.waiting.remove(playerId);
    }
}
```

This is what other code sees once it has `waiting()`. `alice` and `bob` are two players' UUIDs.

```java
GameRoom room = new GameRoom();
ListSignal<UUID> waiting = room.waiting();
Signal<Integer> waitingCount = waiting.mapDistinct(List::size);

room.join(alice);
room.join(bob);
System.out.println(waitingCount.get());  // 2

waiting.clear();  // throws UnsupportedOperationException
```

1. **lines 1-3**: This is a read-only view, and deriving from it works as usual.
2. **lines 5**: The room changes its own queue, and the view's subscribers are notified too.
3. **lines 6**
4. **lines 7**: Prints 2.
5. **lines 9**: Modifying through the view throws, and the queue is untouched. Prints UnsupportedOperationException.

The view's `get()`, iterators, and `subList` cannot be used to modify it either. `asReadOnly()` on `SetSignal` and `MapSignal` follows the same rules; a read-only `MapSignal` also blocks changes through `keySet()`, `values()`, `entrySet()`, and `Map.Entry.setValue`.

## Showing online players

The lobby menu's title shows the online count and lists player names below. No event listeners needed.

```java
ListSignal<Player> online = Signals.onlinePlayers();
Signal<String> onlineText = online.mapDistinct(players ->
        "Online: " + players.size()
);
Signal<List<String>> names = online.mapDistinct(players ->
        players.stream().map(Player::getName).toList()
);

// Alice and Bob join the server in the same tick
// on the next tick, onlineText and names are each notified once
```

1. **lines 1-7**: Only Steve is on the server.
2. **lines 9**: Right after the join events, get() already reads the new list. The notification is held and merged into the next tick.
3. **lines 10**: One notification on the next tick: two players joined, and the menu refreshes once.

To put list contents in menu slots, see [List contents](https://catnies.github.io/sparrow-ui-wiki/signal-ui/list.md).

## Caveats

> **Warning: Only the collection is read-only**
>
> The view blocks changes to the collection, but mutable element objects can still have their fields changed. Keep elements immutable.

> **Warning: The online list's get() returns a snapshot**
>
> Each time the list changes, `get()` produces a new unmodifiable list, and returns the same one while nothing changes. A list you already obtained does not change with later joins and quits.
>
> Notifications come from the Bukkit main thread, or the global region thread on Folia. There is one instance for the whole server, and every call returns the same object. Sparrow UI must be [initialized](https://catnies.github.io/sparrow-ui-wiki/getting-started/installation.md#initialization) first.

> **Warning: Do not keep Player objects**
>
> The `Player` objects in the list are managed by Sparrow UI and removed when players quit. Do not copy them into your own collections, maps, or partitions; store UUIDs when you need to remember players.
>
> Derivation functions may run on threads that do not own the player, so only read names, UUIDs, and other data that does not need the owning thread.

**Next**: [KeyedSignal](https://catnies.github.io/sparrow-ui-wiki/signal/keyed/basics.md) — Hold independent state per key, with each key notifying separately.
