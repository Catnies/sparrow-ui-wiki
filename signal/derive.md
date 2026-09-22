# Deriving and combining

Source: <https://catnies.github.io/sparrow-ui-wiki/signal/derive>

A buy button may depend on the quantity, the unit price, and the balance all at once; switching a category makes the menu read a different source. Derived Signals can combine these inputs and also control when change notifications fire.

## Combining several values

`Signals.combine` takes two or three Signals. Any source changing notifies downstream; the actual computation reads each source's current value only when the result is read.

Below, two sources compute a total and three sources judge affordability:

```java
MutableSignal<Integer> quantity = Signal.of(2);
MutableSignal<Integer> price = Signal.of(30);
MutableSignal<Integer> coins = Signal.of(100);

Signal<Integer> total = Signals.combine(quantity, price,
        (amount, unitPrice) -> amount * unitPrice);
Signal<Boolean> affordable = Signals.combine(quantity, price, coins,
        (amount, unitPrice, balance) -> (long) amount * unitPrice <= balance);

System.out.println(total.get());
System.out.println(affordable.get());
quantity.set(4);
System.out.println(total.get());
System.out.println(affordable.get());
```

The initial total is `60` with enough balance; after the quantity becomes `4`, the total is `120` and the balance falls short. The demo uses the same initial values. Changing the balance leaves the total alone; changing the quantity or price recomputes both results.

Like `map`, `combine` computes on demand, caches, and never compares old with new results. A balance moving from `100` to `150` notifies downstream even when the player still affords the item. To filter repeats, chain `.mapDistinct(value -> value)`.

> **Warning: Sources are read separately**
>
> The combine function may run on any reading thread and should only compute. Reading several sources is not an atomic snapshot; writing the quantity and then the price may let a reader see one updated and the other not.
>
> If two fields must change together, keep them in one immutable object, replace it with a single `update`, and read fields through `map` or `lens`.

## Reading and writing one field

`MutableSignal.lens` extracts a field from an object into a readable and writable `MutableSignal`. The first function reads the field; the second builds a new complete object from the new field value.

```java
record Settings(boolean sound, int volume) {}

MutableSignal<Settings> settings = Signal.of(new Settings(true, 5));
MutableSignal<Integer> volume = settings.lens(
        Settings::volume,
        (current, value) -> new Settings(current.sound(), value));

volume.set(8);
System.out.println(settings.get());

settings.update(current -> new Settings(false, current.volume()));
System.out.println(volume.get());
```

After writing `volume`, the full settings become `Settings[sound=true, volume=8]`. Toggling the sound afterwards leaves `volume.get()` at `8`, and subscribers to the volume hear nothing about the sound switch.

Writing through a lens invokes the original Signal's atomic update, so the second function should carry over the untouched fields of the current object. `volume.update(value -> value + 1)` works too. For custom field equality, pass `sameValue` as a third argument.

> **Warning: Field conversion functions may retry**
>
> Both functions should be side-effect free, with the write function returning a new object rather than mutating the one it receives. They may run on different threads and retry under concurrent updates. Never capture players, worlds, or windows inside them.

## Following the current selection

Weapons and armor each have their own stock, and the menu shows only the active category. `Signals.switching` uses a category Signal as the selector, and its output follows whichever source is selected.

```java
MutableSignal<Integer> weapons = Signal.of(5);
MutableSignal<Integer> armor = Signal.of(8);
MutableSignal<String> category = Signal.of("weapons");

Signal<Integer> currentStock = Signals.switching(
        Map.of("weapons", weapons, "armor", armor), category);

System.out.println("Initial stock: " + currentStock.get());
try (Subscription subscription = currentStock.onDirty(() ->
        System.out.println("Stock now: " + currentStock.get()))) {
    armor.set(7);
    category.set("armor");
    weapons.set(4);
    armor.set(6);
}
```

The initial stock is `5`, and the callback prints `7` then `6`. While weapons are selected, armor changes never reach downstream; after switching to armor, weapon changes stop mattering. Switching categories reads the newly selected source's latest value.

The Map is copied, so changing it afterwards adds no sources. The Map must be non-empty, and the category value must match one of its keys; a missing source throws an `IllegalArgumentException`.

With a `KeyedSignal` already in hand, `Signals.switching(source, category)` reads the partition matching the current key. Creating and managing partitions is covered in [Partition state](https://catnies.github.io/sparrow-ui-wiki/signal/partitions.md).

## Following a membership list that changes

Counting stock across several warehouses means the warehouse list itself can change. `Signals.merging` tracks both the member list and every member's Signal, subscribing to members as they join and unsubscribing as they leave.

Three independent inventories demonstrate it. `members` decides which inventories participate in the count:

```java
MutableSignal<Integer> apples = Signal.of(5);
MutableSignal<Integer> books = Signal.of(3);
MutableSignal<Integer> gems = Signal.of(10);
MutableSignal<List<MutableSignal<Integer>>> members = Signal.of(List.of(apples, books));

Signal<Long> changed = Signals.merging(members, member -> member);
Signal<Integer> total = changed.map(ignored ->
        members.get().stream().mapToInt(Signal::get).sum());

System.out.println("Initial total: " + total.get());
try (Subscription subscription = total.onDirty(() ->
        System.out.println("Total now: " + total.get()))) {
    apples.set(4);
    members.set(List.of(books, gems));
    apples.set(0);
    gems.set(9);
}
```

The initial total is `8`, and the callback prints `7`, `13`, then `12`. Once the apple inventory leaves the list, writing to it no longer moves the count.

The `Long` that `merging` returns is only an incrementing change marker, not a member count or the sum. The `map` here re-sums whenever the marker changes, with `merging` having already built the member dependencies.

When the list holds business objects, the second argument reads that object's Signal, for instance `Warehouse::stock`. Return a Signal the member already owns, and keep the iteration order of the member collection stable. A plain `MutableSignal<List<T>>` publishes a new list via `set`; `ListSignal` and `SetSignal` can serve as member sources directly, see [Collection state](https://catnies.github.io/sparrow-ui-wiki/signal/collections.md).

## Waiting for input to settle

Typing `d`, `di`, `diamond` into a search box usually only warrants handling the final term. `debounce(5)` waits 5 ticks after the last change; another change inside that window restarts the wait.

The method below takes the input Signal and returns the `Subscription` for this watch:

```java
public static Subscription watchSearch(Signal<String> input) {
    Signal<String> settled = input.debounce(5).mapDistinct(String::strip);
    return settled.onDirty(() -> System.out.println("Search term: " + settled.get()));
}
```

Write the box's text into the raw Signal and `settled` follows. Keep the returned subscription and close it when the search ends. `strip` removes whitespace, and identical processed text notifies nobody.

While subscribed, a pending `settled.get()` still returns the value from the last notification. To read the box right now, read the raw `input`. If typing never pauses, the debounce keeps waiting.

For wall-clock timing, use `input.debounceMillis(250)`. The tick variant follows server ticks, so 5 ticks is only about 250 ms at 20 TPS.

> **Warning: Timed derivations need subscribers**
>
> Debounce and throttle schedule their timers only while subscribers exist. Creating the derived Signal and calling `get()` reads the upstream's current value immediately, with no waiting. Once the last subscription closes, pending delayed tasks cancel too.
>
> Sparrow UI initialization must have completed before using the timed APIs. The tick variant's delayed callbacks run on the global region scheduler thread and the millisecond variant on Paper's async scheduler thread; never touch players or blocks inside them. For wiring in async queries, see [Async loading](https://catnies.github.io/sparrow-ui-wiki/signal/async.md).

## Limiting the rate of consecutive updates

When progress climbs continuously, a debounce may never see a pause. `throttle(5)` notifies once up front, then keeps at least 5 ticks between notifications; changes in between merge into the next notification, which reads the latest value at that moment.

```java
public static Subscription watchProgress(Signal<Integer> progress) {
    Signal<Integer> limited = progress.throttle(5);
    return limited.onDirty(() -> System.out.println("Progress: " + limited.get()));
}
```

Assume the initial value is `0`, the subscription exists, and the delayed tasks run on schedule:

| Time | Action | `debounce(5)` | `throttle(5)` |
| - | - | - | - |
| tick 0 | Write 10 | Waiting | Notifies 10 |
| tick 2 | Write 20 | Restarts waiting | Holds |
| tick 4 | Write 30 | Restarts waiting | Holds |
| tick 5 | No new writes | Still waiting | Notifies 30 |
| tick 9 | No new writes | Notifies 30 | Nothing |

Inside an interval, the throttled Signal still reads the last notified value while the raw Signal reads the latest. A make-up notification also opens the next interval; with no new changes after it, nothing further goes out. The millisecond form is `progress.throttleMillis(250)`.

> **Warning: Throttle callbacks arrive from different threads**
>
> The immediate notification runs on the thread that wrote the upstream, and the delayed make-up runs on its scheduling thread. The intervals of `debounce`, `throttle`, and their millisecond variants must all be greater than 0, or an `IllegalArgumentException` is thrown.
>
> Timed callbacks read the upstream. When the upstream includes a `map`, its computation may run on that thread too, so keep the whole chain short and free of slow I/O.

## Driving a countdown with clocks

A clock Signal notifies its dependents on a schedule, fitting countdowns, cooldown displays, and anything else needing continuous refresh.

| API | Notification interval | Value of `get()` |
| - | - | - |
| `Signals.ticking()` | Every tick | Ticks accumulated while the clock runs |
| `Signals.everyTicks(20)` | Every 20 ticks | Number of elapsed 20-tick periods |
| `Signals.everyMillis(1000)` | Every 1000 ms | Number of elapsed periods of that millisecond clock |

Below, ten periods count down from the clock's current reading. The initial remainder is `10`, dropping by one each beat:

```java
public static Subscription watchCountdown() {
    Signal<Long> clock = Signals.everyTicks(20);
    long start = clock.get();
    Signal<Long> remaining = clock.mapDistinct(value -> Math.max(0L, 10L - (value - start)));

    System.out.println("Remaining: " + remaining.get());
    return remaining.onDirty(() -> System.out.println("Remaining: " + remaining.get()));
}
```

After reaching `0`, `mapDistinct` filters the repeated zeros. Close the returned subscription when done; the clock does not unsubscribe itself when a countdown hits zero.

Clocks of the same period are shared among users: the first subscriber starts it, the last one leaves stops it, and resuming continues the original count. So `get()` is neither the current time nor how long this player has had the menu open. If the clock is already running, a new subscriber joins the existing beat and may not wait a full 20 ticks for its first one.

> **Warning: Timing units and threads**
>
> Tick clocks slow down when the server slows down. For real-time deadlines, keep your own expiry timestamp and use the clock purely to drive display refreshes.
>
> `everyTicks` requires a positive period, and `everyMillis` at least 50 ms. Tick clocks notify from the global region scheduler thread and millisecond clocks from an async thread; neither is the current player's entity thread.

**Next**: [Async loading](https://catnies.github.io/sparrow-ui-wiki/signal/async.md) — Query the balance when the shop opens, and re-read results after rewards are granted.
