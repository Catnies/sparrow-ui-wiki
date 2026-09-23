# List contents

Source: <https://catnies.github.io/sparrow-ui-wiki/signal-ui/list>

The first row of the party menu shows a head for each member. When someone joins, another head appears at the end; when someone leaves, the others move up and the last slot empties.

What changes is a whole group of slots. Writing a separate item per slot and updating each one is tedious, and when the party size changes, the mapping between slots and players falls apart.

## What filling slots from a list does

`addIngredient(identifier, list, toElement)` binds a list Signal to every slot of an identifier in the template. Item n of the list, converted by `toElement`, goes into the nth occurrence of the identifier.

When the list changes, the slots follow: new entries fill in at the end, removals shift later entries forward, and leftover slots are cleared. Both `ListSignal` and `Signal<List<T>>` can be passed directly.

## Party members

The party stores names here; real projects should store UUIDs and look up names in `toElement`.

```java
MutableListSignal<String> party = ListSignal.of();
party.add("Alice");

Pane pane = Pane.builder("MMMMM####")
        .addIngredient('M', party, name ->
                Element.item(Item.simple(named(Material.PLAYER_HEAD, name)))
        )
        .build();
Window.builder(pane).setTitle("My party").open(viewer);

// later, when the party changes, only change the list
party.add("Bob");       // Bob appears in the second slot
party.add("Carol");     // Carol appears in the third slot
party.remove("Alice");  // the others move up and the third slot empties
```

1. **lines 1-2**: Only Alice is in the party.
2. **lines 4-9**: The five M slots take the list from left to right. On open, the first slot is Alice and the rest are empty.
3. **lines 12**: Only the list changes, and Bob appears in the second slot.
4. **lines 13**
5. **lines 14**: Alice leaves. Bob and Carol move up and the third slot empties.

## Showing online players

[Signals.onlinePlayers()](https://catnies.github.io/sparrow-ui-wiki/signal/collection/read-only.md#showing-online-players) is a list Signal too and can fill slots directly; the slots update as players join and leave.

```java
Pane pane = Pane.builder("MMMMMMMMM")
        .addIngredient('M', Signals.onlinePlayers(), player ->
                Element.item(Item.simple(named(Material.PLAYER_HEAD, player.getName())))
        )
        .build();
```

With more than nine players online, only the first nine show; use [pagination](https://catnies.github.io/sparrow-ui-wiki/signal-ui/page.md) or [scrolling](https://catnies.github.io/sparrow-ui-wiki/signal-ui/scroll.md) for more.

## Caveats

> **Warning: toElement threads**
>
> `toElement` converts one entry into the `Element` for its slot and must not return `null`. The first conversion runs on the thread calling `build()`, and later updates run on Sparrow UI's async worker executor. Only handle prepared data in it; do not read player inventories, the world, or other state that needs the owning thread.
>
> If your code already has a suitable `Executor`, pass it as the fourth argument, `addIngredient('M', party, toElement, executor)`, and later conversions run there; the first still runs on the building thread.

> **Warning: Slots are limited**
>
> When the list is longer than the slots, only the part that fits is shown.

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

**Next**: [Pagination and filtering](https://catnies.github.io/sparrow-ui-wiki/signal-ui/page.md) — Keep page contents, arrows, and the page number in sync with the data.
