# Async loading

Source: <https://catnies.github.io/sparrow-ui-wiki/signal/async>

A player opens the shop and the menu needs to show the account balance, but the balance lives in a database and the query can take a few hundred milliseconds. The menu should show "Loading" first and the balance once the query lands; code reading the menu's state meanwhile keeps running.

This page walks that flow with `Signal.async`, then shows how to re-query after granting a reward. The wiring for item names and window display lives in [Binding to the UI](https://catnies.github.io/sparrow-ui-wiki/signal-ui/item.md); here we watch the results from the console.

## Querying the balance when the shop opens

Assume the plugin already has an economy service `economy` whose `loadBalance(UUID)` queries the database and returns the player's balance in coins. That method comes from your business code; replace it with whatever economy API your project uses. Sparrow UI does not connect to databases for you.

The code below belongs wherever the shop-open request is handled. `viewer` is the player opening the menu and `ioExecutor` is a background I/O executor the plugin already created and reuses. For the sake of the walkthrough, this player's balance in the database is `100`.

```java
UUID playerId = viewer.getUniqueId();
AsyncSignal<Long> balance = Signal.async(
        (Long) null,
        ioExecutor,
        () -> economy.loadBalance(playerId)
);

Signal<String> balanceText = balance.map(value ->
        value == null ? "Loading…" : "Balance: " + value);

Subscription subscription = balanceText.onDirty(() ->
        System.out.println(balanceText.get()));
System.out.println(balanceText.get());
```

`Signal.async` submits the query to the executor the moment it is created. Its three arguments are the placeholder value shown before the first result, the executor running the query, and the query itself. The function captures the UUID, so the background task never needs the player object.

Until the query completes, `balance.get()` returns `null` and `balanceText.get()` returns "Loading…". Once it finds `100`, the Signal stores it and notifies dependents, and the callback reads "Balance: 100". If the query has already finished, the first read returns the balance directly; never assume "Loading…" gets printed first.

The example spells out both the first read and the subscription because `onDirty` does not replay the current value. The console subscription here only observes changes; call `subscription.close()` when done. How real menus bind is covered in [Binding to the UI](https://catnies.github.io/sparrow-ui-wiki/signal-ui/item.md).

Using `null` as the placeholder separates "not loaded yet" from "a balance of zero". If showing zero up front suits the business, pass `0L` instead. Both the placeholder and the query result may be `null`; the meaning is yours to define.

New and old balances are compared with `Objects.equals` by default, so an unchanged result notifies nobody. For custom equality, pass `sameValue` as the last argument of `Signal.async`; the rules are in [Signal basics](https://catnies.github.io/sparrow-ui-wiki/signal/basics.md).

## Refreshing the balance after granting a reward

The player claims a reward of `50` coins and the database balance moves from `100` to `150`. The existing `balance` still holds the old result, so it needs to query again.

Continuing with `playerId`, `balance`, and `ioExecutor` from the previous section. Assume eligibility is already confirmed at the business layer, and `economy.deposit(playerId, 50L)` writes to the database and returns after the commit succeeds. This code belongs in the reward-granting flow.

```java
ioExecutor.execute(() -> {
    economy.deposit(playerId, 50L);
    // Only after the database commit succeeds, read the balance again.
    balance.dirty();
});
```

An `AsyncSignal`'s value comes from its query function, so refreshing means calling `dirty()` to re-run `() -> economy.loadBalance(playerId)`. It offers no `set` or `update`.

During the re-query, `get()` keeps returning the previous result and never falls back to "Loading". With the balance already read as `100`, a refresh keeps showing `100` until the new result replaces it.

Queries on the same Signal never run in parallel. Calling `dirty()` while a query is still running books one extra query for after it finishes; calling it several more times in the meantime still books only one.

Say the first reward is being queried and a second reward is deposited during it. Refreshing again books the follow-up query for after this round.

| Moment | Action | Readable value |
| - | - | - |
| Loaded | The last query found `100` | `100` |
| Refresh starts | `dirty()` submits query A | `100` |
| A still running | Two more `dirty()` calls, booking one follow-up | `100` |
| A finishes | Publishes `150`, submits query B | `150`, until B finishes |
| B finishes | Publishes `200` | `200` |

The current round's result still publishes even when a follow-up is booked. `dirty()` never cancels the running query or throws its result away as stale. When queries switch by search term, combine with [`switching`](https://catnies.github.io/sparrow-ui-wiki/signal/derive.md) from the previous page so different terms never write into the same state.

> **Warning: Never refresh yourself from inside the query**
>
> The query function must not call its own Signal's `dirty()`, directly or indirectly, or an `IllegalStateException` is thrown. Refreshes belong to completed writes, user actions, or polling.

> **Warning: Query and notification threads**
>
> The query function should touch only databases, network requests, or thread-safe data. Reading player inventories or operating on worlds needs owning threads and must stay out of the background query.
>
> The stale notification after loading also fires from the query thread. Manually registered `onDirty` callbacks are not moved onto the player thread; when a callback must act on players or worlds, schedule onto the right thread itself.

A `RuntimeException` from the query function, or an executor rejecting the task, goes to Sparrow UI's exception handler with the stored value unchanged. A first-query failure keeps the placeholder; another `dirty()` retries afterwards. The placeholder cannot distinguish "loading" from "failed" on its own, so show error states by having the business layer provide a suitable value.

**Next**: [Polling](https://catnies.github.io/sparrow-ui-wiki/signal/polling.md) — When other services can change the data, re-query on a schedule while someone is watching.
