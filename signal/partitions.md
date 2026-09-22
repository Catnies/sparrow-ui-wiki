# Partition state

Source: <https://catnies.github.io/sparrow-ui-wiki/signal/partitions>

The shop's apples and bread each have their own stock. Viewing the apple detail page cares about apples only; selling one bread should not force a re-read of apple stock.

A `KeyedSignal` keeps independent values per key, one partition each. Subscribing to the apple partition hears only apple updates. This page uses product stock to cover reading and cleaning partitions, then two players' purchase quantities to introduce `PlayerKeyedSignal`.

## Independent updates per key

Assume a demo shop that tracks stock only in memory, with apples and bread both starting at `10`. The shop service holds `stock`; `"apple"` and `"bread"` are product ids, and the detail page fetches its own stock Signal by id.

The console below plays the apple detail page. In order, two breads sell, one apple sells, and after a stocktake the apple stock is corrected to six. Watch which actions trigger the apple callback.

```java
MutableKeyedSignal<String, Integer> stock = KeyedSignal.of(id -> 10);
MutableSignal<Integer> apples = stock.at("apple");

System.out.println(apples.get());
Subscription subscription = apples.onDirty(() ->
        System.out.println("Apple stock " + apples.get()));

// Selling bread never notifies the apple detail page.
stock.set("bread", 8);
stock.update("apple", amount -> amount - 1);
// After the stocktake, correct the apple stock to the real count.
apples.set(6);

subscription.close();
```

It prints the initial `10` first, then the callback prints `Apple stock 9` and `Apple stock 6`. Changing bread stock never triggers the apple callback. `apples.set(6)` and `stock.set("apple", 6)` write to the same partition.

`KeyedSignal.of(initial)` calls `initial` the first time a partition is read and caches the result after that. Loading happens on the reading thread, so the function should be quick, side-effect free, and safe to run repeatedly; use the async variants for database queries. The `update` function may retry under concurrent updates, same as an ordinary `MutableSignal.update`.

To re-read from the source, call `dirty(key)`. A synchronous partition sends its stale notification and re-runs the load function on the next read; an async one submits a re-query. `dirtyAll()` handles every partition that currently exists, and `dirty(key)` never conjures a partition that does not exist yet.

## Clearing partitions and keeping handles

When a limited-time event ends, the business may no longer need its partition, and `remove(key)` clears the cache. But other code may still hold the `apples` handle from before; what happens to that reference?

A fresh demo stock writes `6`, then clears the apple partition. One read through the original `apples` afterwards shows whether the cache rebuilt.

```java
MutableKeyedSignal<String, Integer> stock = KeyedSignal.of(id -> 10);
MutableSignal<Integer> apples = stock.at("apple");

apples.set(6);
stock.remove("apple");
System.out.println(stock.keys().get().isEmpty());

System.out.println(apples.get());
System.out.println(stock.keys().get().contains("apple"));
```

The output is `true`, `10`, then `true`. The `apples` here is a stable handle, a Signal that keeps pointing at the apple partition. After clearing, reading it rebuilds the partition and runs the initial function, so it reads `10`, and apples reappear in `keys()`.

`remove(key)` deletes no database records and sends no notification to that partition's subscribers. Existing handles keep their subscriptions and derivations and follow the rebuilt partition. So the business notion of "product removed from sale" still needs to update the catalog; clearing the cache cannot express it.

`clear()` clears every partition. `keys()` returns a Signal listing the keys created so far; creating or removing a partition notifies it, while writing a partition's value does not. Its value is an unordered unmodifiable snapshot.

Reading an unfamiliar key, or even just calling `at(key)`, creates a partition. So `keys()` cannot serve as the product catalog or an online-player roster; those lists belong to separate business data.

## Per-player state

Two players open the shop at once, both starting from a quantity of one. Alice taps the plus button once and hers becomes two, while Bob's must stay at one; when Alice opens the confirm menu later, it reads her chosen two.

Keeping one `PlayerKeyedSignal` in the shop service lets menus fetch per-player values. `alice` and `bob` below are two currently online `Player`s, and `quantities` should be created once at service initialization.

```java
MutablePlayerKeyedSignal<Integer> quantities = PlayerKeyedSignal.of(uuid -> 1);

MutableSignal<Integer> aliceQuantity = quantities.at(alice);
MutableSignal<Integer> bobQuantity = quantities.at(bob);

// After Alice taps plus, only her quantity changes.
aliceQuantity.update(value -> value + 1);

System.out.println(aliceQuantity.get());
System.out.println(bobQuantity.get());
System.out.println(quantities.get(alice));
```

The output is `2`, `1`, then `2`. The final `quantities.get(alice)` stands in for the confirm menu re-reading Alice's choice, pointing at the same data as `aliceQuantity`.

`at`, `get`, `set`, `update`, `dirty`, and `remove` all accept either a `Player` or a UUID. Passing a `Player` extracts the UUID immediately; the object is never held on to internally.

Create `quantities` once and reuse it across menus. For state that belongs to one Window only, like a checkbox inside this confirm dialog, a plain `MutableSignal` for the Window is enough. Split by business keys such as products or teams with `KeyedSignal`; split by players with offline cleanup with `PlayerKeyedSignal`.

A player's partition is removed automatically when they leave; `quantities.remove(alice)` does it on demand. As with ordinary partitions, later reads or writes can rebuild it, so offline cleanup does not replace business timers and subscription shutdown.

> **Warning: Never let state hold player objects long-term**
>
> Collection elements, map keys and values, and partition values are all stored. Store UUIDs, product ids, and business data here. Avoid `Player`, `Entity`, `World`, and load functions that capture them.

## Per-player async queries and polling

Both the shop's home page and its confirm page need the player's balance. To share one player's most recently queried result between them, turn the single balance source from [Async loading](https://catnies.github.io/sparrow-ui-wiki/signal/async.md) into a `PlayerKeyedSignal` holding results per player.

Keeping the async page's business conventions: `economy.loadBalance(UUID)` queries the database for the coin balance, and `ioExecutor` is the background I/O executor. `balances` below is created at shop service initialization, then the opening `viewer` fetches their balance text.

```java
PlayerKeyedSignal<Long> balances = PlayerKeyedSignal.async(
        (Long) null, ioExecutor, economy::loadBalance);

Signal<Long> balance = balances.at(viewer);
Signal<String> balanceText = balance.map(value ->
        value == null ? "Loading…" : "Balance: " + value);
System.out.println(balanceText.get());
```

Creating `balances` queries no player yet. `balances.at(viewer)` creates the partition and returns the handle, also without submitting a query; the first load triggers when the last line reads the derived text. If the query has not finished, it prints "Loading…"; reading again after completion returns the balance. To hear about updates, subscribe to `balanceText` like the async page does, or bind it to a menu.

Another menu calling `balances.at(viewer)` gets the same player's partition; a different player gets their own placeholder and result. This differs from `Signal.async`, which submits its query at creation.

After a database write, call `balances.dirty(playerId)` to refresh that player, where `playerId` is the UUID the write touched. The previous result stays visible during the re-query, repeat refreshes merge into one follow-up, and executor and error handling follow the [async](https://catnies.github.io/sparrow-ui-wiki/signal/async.md) rules.

If other subservers can change balances too, swap the `balances` creation for the polling version, re-querying every `100` ticks. The per-player fetch code stays identical:

```java
PlayerKeyedSignal<Long> balances = PlayerKeyedSignal.polling(
        (Long) null, ioExecutor, economy::loadBalance, 100L);
```

**Only player partitions whose handles have subscriptions poll.** Fetching a handle alone starts nothing, and one player unsubscribing never touches another player's polling. When a player leaves, their partition's polling stops with the cleanup.

For wall-clock polling use `PlayerKeyedSignal.pollingMillis(null, ioExecutor, economy::loadBalance, 5000L)`; the period and subscription rules are in [Polling](https://catnies.github.io/sparrow-ui-wiki/signal/polling.md). A plain `KeyedSignal` also offers `async`, `polling`, and `pollingMillis` for non-player data such as product stock. Async sources return read-only partition handles; the query function supplies the results, so `at(key).set(...)` cannot write to them.

**Next**: [Signals in the UI](https://catnies.github.io/sparrow-ui-wiki/signal-ui/item.md) — Use collections and player state for items, pagination, and window display, keeping menus in step with data.
