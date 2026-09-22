# Per-player display

Source: <https://catnies.github.io/sparrow-ui-wiki/signal-ui/player>

Alice picks two in the shop while Bob stays at one, and both can share the same Item. The difference is that the dependency is now a player partition: the provider reads the current viewer's value, and a click updates the clicker's partition.

`viewer` in the examples is the player opening the menu, and Sparrow UI initialization must have completed beforehand. `named` builds an item with a name; drop the method below into your menu class.

**The item naming helper shared by the examples**

```java
private static ItemStack named(Material material, String name) {
    ItemStack stack = new ItemStack(material);
    stack.setData(DataComponentTypes.CUSTOM_NAME,
            Component.text(name).decoration(TextDecoration.ITALIC, false));
    return stack;
}
```

It uses Paper's `DataComponentTypes` with Adventure's `Component` and `TextDecoration`, matching the style in [Item rendering](https://catnies.github.io/sparrow-ui-wiki/item/render.md).

## One shared button, each player's own data

The `quantities` Signal and `amountButton` below can be created once in the shop service and reused by many Windows. On each menu open, just place the button into the Pane.

```text title="Pick a quantity"
####Q####
```

- `Q`: current player's quantity (`diamond`)

Alice and Bob both start at 1. After Alice clicks once, her name shows 2 while Bob still shows 1.

```java
MutablePlayerKeyedSignal<Integer> quantities = PlayerKeyedSignal.of(uuid -> 1);
Item amountButton = Item.builder()
        .dependsOn(quantities)
        .setItemProvider(context -> named(Material.DIAMOND,
                "Quantity: " + quantities.get(context.player())))
        .addClickHandler(click -> quantities.update(click.player(), value -> value + 1))
        .build();

Pane pane = Pane.builder("####Q####")
        .addIngredient('Q', amountButton)
        .build();
Window.builder(pane).setTitle("Pick a quantity").open(viewer);
```

`dependsOn(PlayerKeyedSignal)` binds each viewer's partition by UUID. When Alice changes her quantity, only display positions using her partition are notified; Bob's button keeps reading one. Never capture the `viewer` from menu creation inside a shared provider; use `context.player()`.

### Binding by other business keys

When a shared button shows diamond stock instead, use the `KeyedSignal` overload. `stock` below is the shop's stock source, with a demo initial stock of ten; every viewer binds the product id `"diamond"`.

```java
MutableKeyedSignal<String, Integer> stock = KeyedSignal.of(productId -> 10);
Item stockButton = Item.builder()
        .dependsOn(stock, player -> "diamond")
        .setItemProvider(context -> named(Material.DIAMOND,
                "Remaining stock: " + stock.get("diamond")))
        .build();
```

Once `stockButton` sits in a Pane, a business call to `stock.set("diamond", 9)` shows everyone the new stock. `keyOf` can also compute business keys such as team ids from the player, but it is evaluated at mount time; a player switching teams mid-session does not rebind just because the function would now return differently. When the source should switch dynamically, express that with [`switching`](https://catnies.github.io/sparrow-ui-wiki/signal/derive.md) first.

**Next**: [List contents](https://catnies.github.io/sparrow-ui-wiki/signal-ui/list.md) — Map a product list that keeps growing and shrinking onto menu slots.
