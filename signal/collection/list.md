# ListSignal

Source: <https://catnies.github.io/sparrow-ui-wiki/signal/collection/list>

In a minigame room's waiting menu, each slot shows one queued player and a corner item says "Waiting 3 / 8". Players join and leave at any time.

A `MutableSignal<List<String>>` can do this, but every join means copying a new list and calling `set`. Changing the list inside it goes unnoticed, and the menu does not refresh.

## What ListSignal does

A `ListSignal` is both a `List` and a `Signal`. `add`, `remove`, and `clear` work like on any list, and every change notifies whatever depends on it.

`ListSignal.of()` returns a `MutableListSignal`, which has all the modifying methods plus `batch` and the element hooks covered below. When others should only read, hand out a `ListSignal` or a [read-only view](https://catnies.github.io/sparrow-ui-wiki/signal/collection/read-only.md).

## Players joining and leaving

The room status text is derived from the queue and needs no bookkeeping of its own. The queue stores names here to keep the output readable; real projects should store player UUIDs.

```java
MutableListSignal<String> queue = ListSignal.of();
Signal<String> queueText = queue.mapDistinct(list ->
        "Waiting " + list.size() + " / 8"
);

queue.add("Alice");
queue.add("Bob");
queue.add("Carol");
System.out.println(queueText.get());  // Waiting 3 / 8

queue.remove("Bob");
System.out.println(queue.get());      // [Alice, Carol]
System.out.println(queueText.get());  // Waiting 2 / 8
```

1. **lines 1-4**: The room just opened and the queue is empty.
2. **lines 6**: add like any list, and the menu follows.
3. **lines 7**
4. **lines 8**
5. **lines 9**: Prints Waiting 3 / 8.
6. **lines 11**: Bob leaves, Carol moves up, and the freed slot at the end is cleared.
7. **lines 12-13**: Prints \[Alice, Carol], Waiting 2 / 8.

To show list contents in menu slots, see [List contents](https://catnies.github.io/sparrow-ui-wiki/signal-ui/list.md).

## Merging changes with batch

After a match the room resets: clear the queue, then add the next group. Changing it step by step shows subscribers an empty queue and then the new one, and the menu flickers. Wrap the steps in `batch` to notify only once at the end.

```java
MutableListSignal<String> queue = ListSignal.of();
queue.addAll(List.of("Alice", "Bob", "Carol"));

Subscription subscription = queue.onDirty(() -> {
    System.out.println("Queue: " + queue.get());
});

// the match ended, swap in the next group
queue.batch(() -> {
    queue.clear();
    queue.addAll(List.of("Dave", "Eve"));
});  // prints "Queue: [Dave, Eve]" once

subscription.close();
```

1. **lines 1-6**: The three players from the last match.
2. **lines 9-10**: Inside batch the queue is cleared. The data changed, but the notification is held, so the menu still shows the old contents.
3. **lines 11**: Two new players go in, still no notification.
4. **lines 12**: batch ends and notifies once. The menu goes straight from the old queue to the new one; the empty queue is never shown. Prints Queue: \[Dave, Eve].

Nested `batch` calls postpone the notification to the end of the outermost one. If nothing changed, nothing is notified.

## Hooks before adding and after removing

Server announcements are typed by admins and need surrounding spaces trimmed, and taking one down should write a log line. `beforeAdd` processes an element before it is stored, and `afterRemove` receives an element after it is removed.

```java
MutableListSignal<String> notices = ListSignal.of();
Subscription trim = notices.beforeAdd(String::strip);
Subscription log = notices.afterRemove(notice -> {
    System.out.println("Removed announcement: " + notice);
});

notices.add("  New dungeon opens at 8 PM tonight  ");
System.out.println("[" + notices.get(0) + "]");  // [New dungeon opens at 8 PM tonight]
notices.remove(0);                               // prints "Removed announcement: New dungeon opens at 8 PM tonight"

trim.close();
log.close();
```

What `beforeAdd` returns is what actually gets stored; it has no way to reject an element. Several hooks run in registration order, each receiving the previous result. When `set` replaces an element, `afterRemove` runs on the old one before `beforeAdd` runs on the new one.

## Backing list

`ListSignal.of()` is backed by an `ArrayList`, fastest when only one thread modifies it. For cross-thread access, either synchronize yourself or wrap a concurrent list.

```java
MutableListSignal<String> queue = ListSignal.wrap(new CopyOnWriteArrayList<>());
```

## Caveats

> **Warning: get() returns a live view**
>
> `queue.get()` returns the list itself, and later changes show up through that reference. When a derived result must keep one moment's contents, copy it, as in `queue.map(List::copyOf)`.
>
> Changing a field inside an element object goes unnoticed. Keep elements immutable and replace them with `set(index, newValue)`.

> **Warning: After wrap, change it only through the wrapper**
>
> `wrap` does not copy the list. Changing the original list directly changes the data but notifies nobody. Lists created with `of()` are not thread safe.

> **Warning: batch is not a transaction**
>
> Each change inside `batch` takes effect immediately. If an exception is thrown midway, completed changes stay and subscribers are still notified. It only merges this list's notifications from the current thread; other threads may still see intermediate states.

> **Warning: Holding hooks and their thread**
>
> Keep the `Subscription` a hook returns. The list only holds hooks weakly, and a dropped handle can let the hook be collected. Hooks run synchronously on the modifying thread; register them before handing the list to other code, and do not modify the same list from inside a hook.
>
> When removing by index or iterator, `afterRemove` gets the stored object; `remove(Object)` passes the caller's argument. If a removal hook throws, the removal has already happened and is not undone.

**Next**: [SetSignal](https://catnies.github.io/sparrow-ui-wiki/signal/collection/set.md) — Hold unique elements, such as the waypoints a player has discovered.
