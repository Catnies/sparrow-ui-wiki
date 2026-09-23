# lens

Source: <https://catnies.github.io/sparrow-ui-wiki/signal/derive/lens>

A player's HUD settings live in a record with two fields, "show coordinates" and "interface scale". The settings menu has one button that toggles coordinates and another that adjusts the scale.

Each button has to write `hud.update(current -> new HudSettings(...))` and copy the other field unchanged. With more fields, forgetting one scrambles the player's settings. Worse, adjusting the scale also refreshes the coordinates button, because both depend on the same `hud`.

## What lens does

`MutableSignal.lens` pulls one field out of an object state and gives you a `MutableSignal` you can read and write on its own.

It needs two functions.

| Parameter | Purpose |
| - | - |
| Getter | Reads the field from the complete object |
| Setter | Takes the current complete object and the new field value, returns a new complete object |

Writing to a lens builds a new object with the setter and writes it back to the original Signal. When the field value does not change, the lens does not notify, so adjusting the scale leaves the coordinates button alone.

## One field per button

The coordinates button depends on `showCoords` and the scale button depends on `scale`. Step through and see which button each click refreshes.

```java
record HudSettings(boolean showCoords, int scale) {}

MutableSignal<HudSettings> hud = Signal.of(new HudSettings(true, 2));

MutableSignal<Boolean> showCoords = hud.lens(
        HudSettings::showCoords,
        (current, value) -> new HudSettings(value, current.scale())
);
MutableSignal<Integer> scale = hud.lens(
        HudSettings::scale,
        (current, value) -> new HudSettings(current.showCoords(), value)
);

showCoords.update(value -> !value);             // coordinates button refreshes, scale button does not
scale.update(value -> Math.min(value + 1, 4));  // scale becomes 3
scale.update(value -> Math.min(value + 1, 4));  // scale becomes 4
scale.update(value -> Math.min(value + 1, 4));  // already 4, the write is skipped

System.out.println(hud.get());  // HudSettings[showCoords=false, scale=4]
```

1. **lines 1-3**: There is only one complete settings object.
2. **lines 5-12**: One lens per field; each button depends on its own lens.
3. **lines 14**: hud is a new object, but the scale field did not change, so the scale button does not refresh.
4. **lines 15**: The lens builds a new object with its setter and writes it back to hud, keeping the coordinates field as is.
5. **lines 16**
6. **lines 17**: Already at the cap of 4. New and old values are equal, and nothing happens.
7. **lines 19**: To save to the database, just read hud.get(). Prints HudSettings\[showCoords=false, scale=4].

## Caveats

> **Warning: Both functions may be retried**
>
> Writing a lens calls `update` on the original Signal, so the setter may run more than once under concurrency. Keep both functions free of side effects. The setter returns a new object that keeps the other fields of the current one, and never modifies the object passed in.
>
> Do not capture players, worlds, or windows in these functions.

> **Tip: Custom field comparison**
>
> Whether a field changed is decided with `Objects.equals` by default. For other rules, pass a comparison function as the third argument; the rules match [Signal.of](https://catnies.github.io/sparrow-ui-wiki/signal/basics/mutable.md#caveats).

**Next**: [switching](https://catnies.github.io/sparrow-ui-wiki/signal/derive/switching.md) — Read a different Signal depending on the current selection, such as showing the skill points of the selected class.
