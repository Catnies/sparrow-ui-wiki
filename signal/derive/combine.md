# combine

Source: <https://catnies.github.io/sparrow-ui-wiki/signal/derive/combine>

The Fireball button on the skill bar is lit when it can be cast and gray when it cannot. That depends on three things: whether there is enough mana, how much mana it costs, and whether the player is silenced.

[map](https://catnies.github.io/sparrow-ui-wiki/signal/derive/map.md) follows only one Signal. Reading the other two inside its function creates no dependency, so the button would not gray out when the player gets silenced.

## What combine does

`Signals.combine` merges two or three Signals into one result. When any source changes, the combined result notifies downstream. On read, it computes from each source's current value.

The function's parameters come in the same order as the Signals passed in.

## Can the skill be cast

The mana item depends on `mana`, and the Fireball button depends on `castable`. Step through and see which step refreshes which item.

```java
MutableSignal<Integer> mana = Signal.of(40);
MutableSignal<Integer> manaCost = Signal.of(30);
MutableSignal<Boolean> silenced = Signal.of(false);

Signal<Boolean> castable = Signals.combine(mana, manaCost, silenced,
        (current, cost, muted) -> !muted && current >= cost
);

System.out.println(castable.get());  // true
silenced.set(true);
System.out.println(castable.get());  // false, silenced
silenced.set(false);
mana.update(value -> value - 30);
System.out.println(castable.get());  // false, only 10 mana left
```

1. **lines 1-7**: 40 mana covers the cost of 30 and nobody is silenced, so the button is lit.
2. **lines 9**: Prints true.
3. **lines 10**: Silence changed, castable is notified, and the button grays out. The mana item does not depend on silence and stays put.
4. **lines 11**: Prints false.
5. **lines 12**: Silence ends.
6. **lines 13**: One cast leaves 10 mana. Both items depend on mana, so both refresh.
7. **lines 14**: Not enough mana, the button stays gray. Prints false.

Try it yourself below. "Toggle silence" only redraws the skill button, while "Mana +20" redraws both items.

## Two sources

With two sources, the function takes two parameters. Current experience and the experience required for the next level decide the progress percentage.

```java
MutableSignal<Integer> experience = Signal.of(30);
MutableSignal<Integer> required = Signal.of(120);

Signal<String> progress = Signals.combine(experience, required,
        (current, needed) -> current * 100 / needed + "%"
);

System.out.println(progress.get());  // 25%
experience.set(90);
System.out.println(progress.get());  // 75%

// After leveling up, experience resets and the next level needs more
experience.set(0);
required.set(200);
System.out.println(progress.get());  // 0%
```

## Caveats

> **Warning: Notifies even when the result is unchanged**
>
> Like `map`, `combine` does not compare results. When mana regenerates from 40 to 60, `castable` is still `true`, yet downstream is notified. If the button only cares whether the skill can be cast, add a `mapDistinct` after it.
>
> ```java
> Signal<Boolean> castableDistinct = castable.mapDistinct(value -> value);
> ```

> **Warning: Sources are read one by one**
>
> The combined result reads its sources one at a time, not as a snapshot of one moment. If you change `mana` and then `manaCost`, another thread may read the new mana with the old cost in between.
>
> When two values must change together, put them in one immutable object, replace it with a single `update`, and read fields with `map` or [lens](https://catnies.github.io/sparrow-ui-wiki/signal/derive/lens.md).

> **Warning: The function only computes**
>
> The function may run on any reading thread and may run several times for the same inputs. Compute only from the arguments; do not change state or query a database.
>
> `combine` takes at most three sources. For more, combine some of them into an intermediate result first, or merge related fields into one record.

**Next**: [lens](https://catnies.github.io/sparrow-ui-wiki/signal/derive/lens.md) — Pull one field out of a settings object and read, write, and subscribe to it on its own.
