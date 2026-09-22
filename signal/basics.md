# Signal basics

Source: <https://catnies.github.io/sparrow-ui-wiki/signal/basics>

A Signal holds changing data and can compute new values from it. It works fine in plain business code, with menus reading and displaying it on top.

## Creating, reading, and updating

`Signal.of(initial)` creates a `MutableSignal<T>`; read with `get()` and write with `set(value)`. To increment in place, use `update`:

```java
MutableSignal<Integer> quantity = Signal.of(1);

quantity.set(3);
quantity.update(value -> value + 1);

System.out.println(quantity.get());
```

The final output is `4`. `set` and `update` are `MutableSignal` methods; expose the read-only `Signal<Integer>` type when handing the Signal to other code.

Old and new values are compared with `Objects.equals` by default. Calling `set(4)` or `update(value -> value)` after that writes the same value, so the write and the notification are skipped. Signals accept `null` too, as in `MutableSignal<String> selection = Signal.of(null)`.

When several threads modify the quantity at once, `update` guarantees the increment applies on top of the latest value. Calling `get()` and `set()` separately leaves a window where another thread's write lands between them and gets overwritten.

> **Warning: The update function only computes the new value**
>
> With concurrent writers, `update` may retry its function. Only compute and return the new value inside; never hand out items, charge players, send messages, or mutate the old object.
>
> Signals accept reads and writes from any thread; if the object they hold is mutable, its thread safety stays your responsibility.

Several fields can live in one record, with each update producing a fresh state:

```java
record OrderOptions(int quantity, boolean giftWrap) {}

MutableSignal<OrderOptions> options = Signal.of(new OrderOptions(1, false));
options.update(value -> new OrderOptions(value.quantity() + 1, value.giftWrap()));

System.out.println(options.get());
```

The result is `OrderOptions[quantity=2, giftWrap=false]`. A Signal stores an object reference: mutating the object's fields triggers no notification, and passing the same reference back to `set` usually compares as unchanged. That is why the old state is replaced with a new object. For lists and other collections, see [Collection state](https://catnies.github.io/sparrow-ui-wiki/signal/collections.md).

## Subscribing to changes

`onDirty` registers a change callback. The callback takes no arguments; call `get()` when you need the value. The returned `Subscription` keeps the subscription alive and closes it.

```java
MutableSignal<Integer> coins = Signal.of(100);

try (Subscription subscription = coins.onDirty(() -> System.out.println("Coins now: " + coins.get()))) {
    coins.set(120);
    coins.set(120);
    coins.update(value -> value + 30);
}

coins.set(200);
```

The callback prints `Coins now: 120` and `Coins now: 150` in order. Registering does not replay the initial `100`, and the duplicate write of `120` notifies nobody. Leaving the `try` block closes the subscription; the final write of `200` still lands, it just never reaches this callback.

The example scopes the subscription with `try`. For a long-lived listener, keep the `Subscription` in a field and call `close()` when done; `isClosed()` checks its state. Read the initial value separately with `get()`.

> **Warning: Holding subscriptions and their threads**
>
> Keep the `Subscription` that `onDirty` returns. If nothing holds it, the subscription can vanish with garbage collection.
>
> The callback runs on whichever thread triggered the notification, and several writing threads may invoke it concurrently. Callbacks must be thread-safe, return quickly, and must not directly or indirectly write to the same Signal that is currently notifying.

A notification only means the value may have changed; it does not preserve the value that triggered it. Under concurrent writes, `get()` inside the callback may already see a later write. To record every coin transaction, log it where the business operation happens.

When a menu binds a Signal through `dependsOn` and friends, the library owns the subscription and you keep no `Subscription`. The binding itself is covered in [Signals in the UI](https://catnies.github.io/sparrow-ui-wiki/signal-ui/item.md), and subscription lifetime rules in [Lifecycle and cleanup](https://catnies.github.io/sparrow-ui-wiki/advanced/lifecycle.md).

## Deriving values with map

`map` produces one Signal from another's current value. For example, the quantity decides the total:

```java
MutableSignal<Integer> quantity = Signal.of(2);
Signal<Integer> total = quantity.map(amount -> amount * 30);

System.out.println(total.get());
quantity.set(3);
quantity.set(4);
System.out.println(total.get());
```

The two outputs are `60` and `120`. `total` computes and caches only when read; after `quantity` changes, the next read recomputes. The example never reads while the quantity is `3`, so the total of `90` is never computed either.

`map` forwards upstream change notifications without checking whether the derived result differs. When only actual changes matter, use `mapDistinct`.

> **Warning: Derived functions depend on their inputs only**
>
> Calling `get()` triggers the computation on that thread. Concurrent reads may compute the same input several times, so the function should compute its result from its arguments alone, without mutating state or running business logic.
>
> Reading another Signal inside the function does not subscribe to it. When the result depends on several sources, use `Signals.combine` from [Deriving and combining](https://catnies.github.io/sparrow-ui-wiki/signal/derive.md).

## Filtering duplicate results with mapDistinct

A product costs `50`; the balance rises from `100` to `120` and the player still affords it, so the buy button's look need not change. Deriving that boolean with `mapDistinct` skips notifications when the result is unchanged:

```java
MutableSignal<Integer> coins = Signal.of(100);
Signal<Boolean> affordable = coins.mapDistinct(value -> value >= 50);

System.out.println("Initial: " + affordable.get());
try (Subscription subscription = affordable.onDirty(() ->
        System.out.println("Affordable: " + affordable.get()))) {
    coins.set(120);
    coins.set(40);
    coins.set(30);
    coins.set(60);
}
```

The initial state is `true`, and the callback prints only `false` and `true`:

| Balance change | Affordable | Notifies subscribers |
| - | - | - |
| 100 → 120 | true → true | No |
| 120 → 40 | true → false | Yes |
| 40 → 30 | false → false | No |
| 30 → 60 | false → true | Yes |

`mapDistinct` compares results with `Objects.equals` by default. On the first subscription it computes the current result; afterwards each upstream notification triggers a recompute and comparison, notifying only on an actual difference. With no subscribers, computation still waits for `get()`.

Because the comparison must compute the result first, a `mapDistinct` function can also run during upstream writes, so keep it short. If every quantity change moves the total anyway, plain `map` is fine.

## Custom equality

When your notion of equality differs from `Objects.equals`, pass a `sameValue` function to `Signal.of`; returning `true` means the two values are the same. Category codes, for instance, may ignore case:

```java
MutableSignal<String> category = Signal.of("books", String::equalsIgnoreCase);

try (Subscription subscription = category.onDirty(() ->
        System.out.println("Category: " + category.get()))) {
    category.set("BOOKS");
    System.out.println("Current: " + category.get());
    category.set("tools");
}
```

Writing `"BOOKS"` compares as unchanged, so the write is skipped and `get()` still returns `"books"`. Only `"tools"` fires the callback.

To preserve the raw input while one derived view ignores case, put the equality on `mapDistinct`:

```java
MutableSignal<String> input = Signal.of("books");
Signal<String> keyword = input.mapDistinct(String::strip, String::equalsIgnoreCase);

try (Subscription subscription = keyword.onDirty(() ->
        System.out.println("Search term: " + keyword.get()))) {
    input.set(" BOOKS ");
    System.out.println("Raw input: " + input.get());
    input.set(" tools ");
}
```

Here `input` keeps `" BOOKS "` and notifies its own subscribers. `keyword` strips whitespace and then compares ignoring case, so equal results stop the notification; switching to `" tools "` finally prints `Search term: tools`.

> **Warning: The comparison contract**
>
> `sameValue` should be an equivalence relation: every value equals itself, and the function should be short and side-effect free. It only ever receives two non-`null` values; the library treats two `null`s as equal and one-sided `null` as different.
>
> Signals hold the comparison function for their lifetime, so do not capture `Player`, `World`, or `Window` inside it. Ignoring one field in a source's equality means writes touching only that field are skipped wholesale.

**Next**: [Deriving and combining](https://catnies.github.io/sparrow-ui-wiki/signal/derive.md) — Combine several sources, switch dependencies, and pace updates with debounce, throttle, and clocks.
