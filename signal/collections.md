# Collection state

Source: <https://catnies.github.io/sparrow-ui-wiki/signal/collections>

A shop menu starts out selling apples and bread. An admin lists diamonds and the product list gains an entry while the "number of products" counter moves with it; removing apples updates both places again.

This page introduces collection Signals through that shop's product list, its selection, and its price table. They keep the usual `List`, `Set`, and `Map` operations and notify dependents after each change. We observe the data from the console first; wiring into menus is covered in [Binding to the UI](https://catnies.github.io/sparrow-ui-wiki/signal-ui/list.md).

## Editing lists, sets, and maps directly

First, listing and delisting. `products` holds the names of products currently on sale, and `count` is the number of varieties the menu displays. The count derives from the list's size, so only the product list ever needs touching.

This snippet runs standalone and simulates the admin's two actions in order. A `ListSignal` is both a `List` and a `Signal<List<E>>`, so it can grow and shrink and still derive `count`.

```java
ListSignal<String> products = ListSignal.of();
products.addAll(List.of("Apple", "Bread"));

Signal<Integer> count = products.mapDistinct(List::size);
System.out.println(count.get());

// The admin lists diamonds; the product count follows the list.
products.add("Diamond");
System.out.println(count.get());

// The admin removes apples.
products.remove("Apple");
System.out.println(products.get());
System.out.println(count.get());
```

The outputs are `2`, `3`, `[Bread, Diamond]`, and `2` in order. Listing takes the count from two to three, delisting brings it back, and `count` is never set by hand.

The shop also lets players tick products for comparison. The same product should only be ticked once, which is a job for `SetSignal` over product ids. Below, a player ticks apples twice and then checks the tick count.

```java
SetSignal<String> selected = SetSignal.of();
Signal<Integer> selectedCount = selected.mapDistinct(Set::size);
selected.add("apple");
boolean addedAgain = selected.add("apple");
System.out.println(addedAgain);
System.out.println(selectedCount.get());
```

The output is `false` and `1`. The second add changed nothing, so no subscriber hears about it.

The price table needs lookups by product id. Keeping it in a `MapSignal` lets us derive the current apple price text. Below, the admin moves apples from `20` coins to `25`.

```java
MapSignal<String, Integer> prices = MapSignal.of();
prices.put("apple", 20);
Signal<String> applePrice = prices.map(map -> "Apple " + map.get("apple") + " coins");
System.out.println(applePrice.get());

prices.compute("apple", (id, price) -> price + 5);
System.out.println(applePrice.get());
```

The output moves from "Apple 20 coins" to "Apple 25 coins". `prices.get("apple")` reads one price directly, while the no-argument `prices.get()` returns the whole map. Any product's price change invalidates the map's dependents; to subscribe per product, see [Partition state](https://catnies.github.io/sparrow-ui-wiki/signal/partitions.md).

These collections' `get()` returns a **live view** of the current collection, and later edits keep showing up in that reference. To preserve a moment in time or derive a collection value, copy it into an independent result, for instance `products.map(List::copyOf)`. Do not use `products.map(list -> list)` to hold the same mutable collection, and mutating fields inside element objects does not notify the collection's subscribers either.

## Wrapping existing collections

If the config loader already returned a `LinkedHashMap` price table whose insertion order is the menu's display order, `wrap` plugs the existing data in.

Two records for apples and bread stand in for the loader's output. Adding diamonds afterwards should preserve that order in the derived id list.

```java
Map<String, Integer> initialPrices = new LinkedHashMap<>();
initialPrices.put("apple", 20);
initialPrices.put("bread", 30);

MapSignal<String, Integer> prices = MapSignal.wrap(initialPrices);
Signal<List<String>> productIds = prices.map(map -> List.copyOf(map.keySet()));

prices.put("diamond", 100);
System.out.println(productIds.get());
```

The output is `[apple, bread, diamond]`. `wrap` does not copy the original collection, so edit it through `prices` from then on; calling `initialPrices.put(...)` behind the wrapper's back changes the data but sends no notification.

`of()` creates an empty collection with these backing implementations:

| Type | Collection used by `of()` | What to know when choosing |
| - | - | - |
| `ListSignal` | `CopyOnWriteArrayList` | Safe concurrent iteration; every write copies the backing array |
| `SetSignal` | `CopyOnWriteArraySet` | Also copy-on-write; lookups scan the array |
| `MapSignal` | `ConcurrentHashMap` | No iteration order; no `null` keys or values |

After `wrap`, thread safety and mutability stay whatever the original collection had. The `LinkedHashMap` example above should be used from a single thread; wrapping it in a Signal does not make it concurrent. For large or write-heavy collections, pick a different backing collection to match actual access.

## Merging a burst of notifications with batch

The admin runs a reload command and the config's products become apples, bread, and diamonds. We want to replace the menu's list so subscribers receive one complete new content, not an empty list followed by the new products.

`products` below starts with only "Old product". An `onDirty` callback plays the consumer watching the list, and `batch` wraps the clear-and-fill pair.

```java
ListSignal<String> products = ListSignal.of();
products.add("Old product");

Subscription subscription = products.onDirty(() ->
        System.out.println(products.get()));

products.batch(() -> {
    products.clear();
    products.addAll(List.of("Apple", "Bread", "Diamond"));
});

subscription.close();
```

The callback prints `[Apple, Bread, Diamond]` once. `SetSignal` and `MapSignal` offer `batch` too. With nested calls, notifications wait until the outermost batch ends; no changes in between means no notification.

> **Warning: batch offers no rollback or isolation**
>
> Every edit applies immediately. If the callback throws midway, completed edits remain and subscribers are notified. `batch` only merges this thread's notifications for this collection; other threads can still observe intermediate states, or modify it and notify separately.

## Handling elements as they join and leave

The product editor lets admins type tags. Typing "  Limited offer  " should store the trimmed "Limited offer", and deleting a tag should also log what was removed.

`beforeAdd` processes an element before it is stored, and `afterRemove` handles one that has just been removed. Below, a standalone tag list goes through one input and one deletion.

```java
ListSignal<String> tags = ListSignal.of();
Subscription normalize = tags.beforeAdd(String::strip);
Subscription removed = tags.afterRemove(tag ->
        System.out.println("Removed " + tag));

tags.add("  Limited offer  ");
System.out.println(tags.get(0));
tags.remove(0);

normalize.close();
removed.close();
```

It prints `Limited offer` first, then `Removed Limited offer`. The element `beforeAdd` returns is what actually gets stored; it is not a boolean interceptor. Multiple add hooks process in registration order, each receiving the previous one's return value.

`SetSignal` uses the same method names; `MapSignal`'s add hook is `beforePut((key, value) -> ...)` and its removal hook `afterRemove((key, value) -> ...)`. Replacing an existing element also passes through the remove-old and process-new hooks; an explicit `remove` is not the only trigger.

**Keep the `Subscription`s the hooks return and close them when done.** Collections only weakly hold hooks, so dropping the tickets can let them be collected. Hooks run synchronously on the modifying thread, so configure them before handing the collection to other code, and never modify the same collection from inside a hook.

> **Tip: Identifying the removed object**
>
> When a List removes by index or iterator, `afterRemove` receives the originally stored object; `remove(Object)` receives the caller's argument. If `beforeAdd` replaced the object, do not assume the two are the same instance.
>
> If a removal hook throws, the change has already happened and is not undone; the exception reaches the modifier, and subscribers still get the change notification.

**Next**: [Partition state](https://catnies.github.io/sparrow-ui-wiki/signal/partitions.md) — Keep independent state per product or player, each with its own reads, subscriptions, and cache.
