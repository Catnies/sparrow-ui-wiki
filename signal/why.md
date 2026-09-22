# Why Signals

Source: <https://catnies.github.io/sparrow-ui-wiki/signal/why>

The data a menu shows changes: a boss's health is dropping, a player's coins just arrived, a few units of a product sold. A Signal holds a changing value and notifies its dependents when it changes, so they can redraw. The menus built from fixed data in the previous chapters follow the data automatically once a Signal is attached.

## Three common scenarios

Each scenario below is implemented two ways. Switch the tabs to compare plain code against Signals; all three scenarios switch together.

### Several players watching one piece of data

A world boss's health shows in every player's open menu. When the boss takes damage, every open menu has to update.

**Without a Signal**

```java
public final class Boss {
    private volatile int health = 1000;
    // The boss must track which items are displaying its health
    private final Set<ObservableItem> healthItems = ConcurrentHashMap.newKeySet();

    public void damage(int amount) {
        this.health = Math.max(0, this.health - amount);
        // Every change has to notify each one individually
        for (ObservableItem item : this.healthItems) {
            item.notifyWindows();
        }
    }
}

// Menu: register on open, remove on close. Forget the removal and
// the item stays in the set forever
ObservableItem healthItem = Item.builder()
        .setItemProvider(context -> healthIcon(boss.health()))
        .build();
boss.healthItems().add(healthItem);
window.addCloseHandler(reason -> boss.healthItems().remove(healthItem));
```

**With a Signal**

```java
public final class Boss {
    private final MutableSignal<Integer> health = Signal.of(1000);

    public Signal<Integer> health() {
        return this.health;
    }

    // Callable from any thread; the boss never needs to know who displays its health
    public void damage(int amount) {
        this.health.update(value -> Math.max(0, value - amount));
    }
}

// Menu: declare that rendering reads health, and the display refreshes on its own
Item healthItem = Item.builder()
        .setItemProvider(context -> healthIcon(boss.health().get()))
        .dependsOn(boss.health())
        .build();
```

Without a Signal, the boss maintains a registry of "who is displaying me", must remember to remove entries on menu close, and handles concurrent damage writes itself. With a Signal, the boss only writes its own value; the menu declares its dependency, and the subscription unwinds when the menu closes.

### One button depending on three states

A shop's buy button shows as purchasable when the player can afford it and stock remains. Affordability depends on the quantity, the player's balance, and the remaining stock, modified by the quantity buttons, the economy system, and the shop system respectively.

**Without a Signal**

```java
ObservableItem confirm = Item.builder()
        .setItemProvider(context -> confirmIcon(this.quantity <= this.stock && this.balance >= this.quantity * PRICE))
        .build();

Item plus = Item.builder()
        .setItemProviderConstant(plusIcon)
        .addClickHandler(click -> {
            this.quantity++;
            // The quantity changed, so notify the buy button
            confirm.notifyWindows();
        })
        .build();

// Balance changes inside the economy system and stock inside the shop system,
// so both places also need to find this button and notify it
```

**With a Signal**

```java
// Three states combine into one result; any of them changing recomputes it
Signal<Boolean> affordable = Signals.combine(quantity, balance, stock,
        (amount, money, left) -> amount <= left && money >= (long) amount * PRICE);

Item confirm = Item.builder()
        .setItemProvider(context -> confirmIcon(affordable.get()))
        .dependsOn(affordable)
        .build();

Item plus = Item.builder()
        .setItemProviderConstant(plusIcon)
        // Only writes the quantity; it never needs to know who depends on it
        .addClickHandler(click -> quantity.update(value -> value + 1))
        .build();
```

Without a Signal, every place that modifies state has to know which buttons depend on it, and every new item depending on that state means tracking down all the writers again to add notifications. With a Signal, writers only write; the reading side declares the dependency.

### Data living in a database

The player's coins sit in a database, so opening the menu queries on an async thread. By the time the result returns, the player may have closed the menu.

**Without a Signal**

```java
UUID uuid = viewer.getUniqueId();
CompletableFuture.supplyAsync(() -> database.loadCoins(uuid), executor)
        .thenAccept(result -> {
            // While the query ran, the player may have closed the menu or even left
            if (!window.isOpen()) {
                return;
            }
            this.coins = result;
            coinsItem.notifyWindows();
        });

// Every open queries once more; if the coins changed elsewhere,
// re-query and notify every open menu again
```

**With a Signal**

```java
// One coin Signal per player, queried on the executor at first read, showing 0 until then
PlayerKeyedSignal<Long> coins = PlayerKeyedSignal.async(0L, executor, database::loadCoins);

// Each viewer reads their own coins
Item coinsItem = Item.builder()
        .setItemProvider(context -> coinsIcon(coins.get(context.player())))
        .dependsOn(coins)
        .build();

// Coins changed elsewhere: mark stale, re-query in the background, and open menus update
coins.dirty(uuid);
```

Without a Signal, every open queries and the callback must check whether the menu survived. With a Signal, each player's coins are queried once and cached, and reads return immediately:

- If the menu closed before the query finished, nothing is waiting on the result and nothing happens; the next open uses the cache
- During a re-query, menus keep showing the previous result and update when it lands, with no blank state
- Player A's coins changing only redraws A's menus
- When a player leaves, their cache is dropped automatically

## What a Signal is

A Signal is a value that changes and notifies its dependents when it does. Working with Signals involves three roles:

| Role | What it is | Examples |
| - | - | - |
| Source | Holds the value and accepts writes | `Signal.of`, `Signal.async`, `PlayerKeyedSignal` |
| Derived | Computed from other Signals, following them when they change | `map`, `Signals.combine` |
| Consumer | Reads Signals and updates the UI | Item's `dependsOn`, the `bind` of Windows, Panes, and inventories |

Notifications only say "the value is stale" and carry no new value. Once a source changes, the notification travels down the dependency chain to deriveds and consumers; a consumer just marks its slots for redisplay and only reads and computes the latest value at the next redraw. Click the buttons below to write to the sources and watch the notification spread:

In the demo, each item depends only on the data it displays: changing the stock redraws only the buy button, while quantity, total, and balance stay put. Clicking "Quantity −1" when the quantity is already 1 writes the same value, so no notification goes out.

This style buys a few things:

- Sources never need to know who reads them, and any thread may write
- Only slots depending on changed data redraw, and several changes in one tick redraw once
- A redraw always reads the latest value
- With no menu watching, deriveds stop computing and polling sources stop querying
- Closing a menu unwinds its subscriptions; no unsubscribe code to write

**Next**: [Signal basics](https://catnies.github.io/sparrow-ui-wiki/signal/basics.md) — Create, read, and write Signals, derive new values, and subscribe to changes.
