# Mutable state: Signal.of

Source: <https://catnies.github.io/sparrow-ui-wiki/signal/basics/mutable>

The arena menu has a score item. Every kill adds a point, and the number in the menu has to follow.

If the score is just an `int` field, you have to find every open menu after each change and refresh it yourself. Miss one, and that player sees an old score.

## What Signal.of does

`Signal.of(initial)` wraps a value into a state you can read and write, typed `MutableSignal<T>`. It has three basic operations.

| Method | Purpose |
| - | - |
| `get()` | Read the current value |
| `set(value)` | Write a new value directly |
| `update(fn)` | Compute a new value from the current one and write it |

When the value changes, menus depending on it refresh by themselves. When it does not change, nothing happens.

## Tracking the arena score

The menu has a score item that depends on `score`. Click "Next" to run the code line by line and watch the score and the item.

```java
MutableSignal<Integer> score = Signal.of(0);

score.set(3);
score.update(value -> value + 1);  // another kill
score.set(4);                      // same as the current value, the write is skipped

System.out.println(score.get());   // 4
```

1. **lines 1**: Create the score, starting at 0.
2. **lines 3**: Write 3 directly. The value changed, so the score item is redrawn on the next tick.
3. **lines 4**: update adds one to the current 3, giving 4.
4. **lines 5**: Old and new values are both 4. The write is skipped and the menu does not refresh.
5. **lines 7**: Read the current value. Prints 4.

Use `update` for read-then-write operations like adding a point. When two players score at the same moment, separate `get()` and `set()` calls let the later write overwrite the earlier one, and a point is lost. `update` always computes from the latest value.

## Only the match logic changes the score

Only the match logic should change the score; menus and other modules just display it. Declare the field as `MutableSignal` and return it as `Signal`.

```java
public final class ArenaMatch {
    private final MutableSignal<Integer> score = Signal.of(0);

    // Callers get a Signal without set or update; they can only read and subscribe
    public Signal<Integer> score() {
        return this.score;
    }

    public void recordKill() {
        this.score.update(value -> value + 1);
    }
}
```

Every point goes through `recordKill()`. Adding a streak bonus later means changing this one method.

## Several fields

Dungeon settings have a difficulty and a player limit. Put them in a record and replace the whole object on every change.

```java
record DungeonSettings(String difficulty, int maxPlayers) {}

MutableSignal<DungeonSettings> settings = Signal.of(new DungeonSettings("Normal", 4));
settings.update(current -> new DungeonSettings("Hard", current.maxPlayers()));

System.out.println(settings.get());  // DungeonSettings[difficulty=Hard, maxPlayers=4]
```

To read and write just one field, use [lens](https://catnies.github.io/sparrow-ui-wiki/signal/derive/lens.md).

## Custom equality

On every write, the Signal compares new and old values with `Objects.equals`. When "the same" means something else for your data, pass a comparison function as the second argument.

Guild tags ignore case, so `MOON` and `moon` are the same guild.

```java
MutableSignal<String> guildTag = Signal.of("MOON", String::equalsIgnoreCase);

guildTag.set("moon");
System.out.println(guildTag.get());  // MOON, judged equal, the write is skipped
guildTag.set("SUN");
System.out.println(guildTag.get());  // SUN
```

## Caveats

> **Warning: Keep state objects immutable**
>
> A Signal holds an object reference. Changing a field inside the object goes unnoticed, and passing the same object to `set` again counts as unchanged. Create a new object to replace the old one.

> **Warning: The update function only computes**
>
> With several writing threads, the function passed to `update` may run more than once. Only return a new value computed from the argument; handing out rewards, taking items, and sending messages do not belong there.
>
> The Signal itself can be read and written from any thread. If the object it holds is mutable, its thread safety is up to you.

> **Warning: Rules for the comparison function**
>
> The comparison returns `true` for equal values. It should be an equivalence relation, short, and free of side effects. Two `null`s count as equal and `null` against a value counts as different; the function itself only receives non-`null` values.
>
> The Signal keeps the function for its whole life, so do not capture a `Player`, `World`, or `Window` in it.

**Next**: [Subscribing to changes](https://catnies.github.io/sparrow-ui-wiki/signal/basics/subscribe.md) — Get notified with onDirty when a value changes, and manage how long the subscription lives.
