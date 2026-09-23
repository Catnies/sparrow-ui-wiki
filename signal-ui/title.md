# Window titles

Source: <https://catnies.github.io/sparrow-ui-wiki/signal-ui/title>

The dungeon lobby's window title reads "Dungeon lobby · 1 / 4 ready". Each time a party member clicks ready, the number in the title should go up.

The title is not an item in a slot, so `dependsOn` cannot reach it. Once the window opens, the title stays fixed unless something asks it to be recomputed.

## What setTitleSupplier and window\.bind do

`setTitleSupplier` makes the title come from a function, called when the window opens. `window.bind(signal, callback)` runs the callback whenever the Signal notifies; with `Window::updateTitle` as the callback, the title is recomputed and sent to the player.

The binding follows the window: active while it is open, paused when it closes, and resumed when it opens again.

## A title showing the ready count

```java
MutableSignal<Integer> readyCount = Signal.of(0);

Pane pane = Pane.builder("####R####")
        .addIngredient('R', Item.builder()
                .setItemProviderConstant(named(Material.LIME_DYE, "Ready"))
                .addClickHandler(click -> readyCount.update(value -> Math.min(value + 1, 4)))
                .build()
        )
        .build();

Window window = Window.builder(pane)
        .setTitleSupplier(() -> Component.text("Dungeon lobby · " + readyCount.get() + " / 4 ready"))
        .build(viewer);
window.bind(readyCount, Window::updateTitle);  // declare before open
window.open();
```

1. **lines 1**: Nobody is ready yet.
2. **lines 11-13**: The title comes from a function. The window is not open yet, so the function has not run.
3. **lines 14**: Declare the binding. bind does not run the callback right away; it asks for a title update only after a notification.
4. **lines 15**: Opening the window computes the title for the first time.
5. **lines 6**: Someone clicks ready, and updateTitle recomputes the title.
6. **lines 6**
7. **lines 6**: The whole party is ready.

## Caveats

> **Warning: bind callbacks do not switch threads**
>
> `updateTitle()` hands the title update to the player's thread. Other callbacks you pass to `bind` are not moved to another thread; schedule that yourself when you need to touch the player.

> **Warning: Bind before opening**
>
> Declare the binding before `open()` so it is active as soon as the window opens. The title function should only read data, never change state.

**The naming helper used in the examples**

```java
private static ItemStack named(Material material, String name) {
    ItemStack stack = new ItemStack(material);
    stack.setData(DataComponentTypes.CUSTOM_NAME,
            Component.text(name).decoration(TextDecoration.ITALIC, false)
    );
    return stack;
}
```

It uses Paper's `DataComponentTypes` with Adventure's `Component` and `TextDecoration`, matching [Item rendering](https://catnies.github.io/sparrow-ui-wiki/item/render.md).

**Next**: [Visual layers](https://catnies.github.io/sparrow-ui-wiki/signal-ui/visual.md) — Switch how a slot looks with a Signal without changing its contents or click behavior.
