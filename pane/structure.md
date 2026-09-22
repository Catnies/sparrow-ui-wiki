# Character layouts

Source: <https://catnies.github.io/sparrow-ui-wiki/pane/structure>

A Pane's layout is described with a character template: each string is one row of the menu, each character takes one slot, and slots holding the same character display the same content.

## Drawing the layout with characters

When you create a Pane with `Pane.builder`, write a few strings inside the parentheses and the menu takes shape directly: the first string is the menu's first row, the second string the second row, and so on. Every character in a string stands for one slot.

Below is the skeleton of a help menu. The top and bottom rows are a border, and the middle holds a help book:

```java
ItemStack border = new ItemStack(Material.BLACK_STAINED_GLASS_PANE);
border.setData(DataComponentTypes.CUSTOM_NAME, Component.empty());

ItemStack book = new ItemStack(Material.BOOK);
book.setData(
        DataComponentTypes.CUSTOM_NAME,
        Component.text("Help Book", NamedTextColor.WHITE)
                .decoration(TextDecoration.ITALIC, false)
);

Pane pane = Pane.builder(
                "---------",
                "####B####",
                "---------"
        )
        .addIngredient('-', Item.simple(border))
        .addIngredient('B', Item.simple(book))
        .build();

Window.builder(pane)
        .setTitle(Component.text("Help"))
        .open(viewer);
```

Three strings of nine characters each, so this Pane is 3 rows by 9 columns, 27 slots in total. Use the "template" and "player view" buttons to switch between the template and what the player sees:

```text title="Help"
---------
####B####
---------
```

- `-`: border (`black_stained_glass_pane`)
- `B`: help book (`book`)
- `#`: empty

A character in the template is called an **identifier**. The character itself carries no meaning; it is just a stand-in for its slots, and `addIngredient` binds content to it. **However many slots an identifier occupies is however many slots show the bound content.** `-` appears 18 times in the template, so one bind fills the whole top and bottom rows, and those 18 slots all show the same Item. When each slot needs its own Item, see [Filling content](https://catnies.github.io/sparrow-ui-wiki/pane/ingredients.md).

Calling `addIngredient` multiple times for the same identifier keeps only the last binding.

When a single character is not enough to say what a slot is, wrap a piece of text in backticks; the whole run counts as one identifier and takes one slot. Bind it using the string without the backticks:

```java
Pane pane = Pane.builder("##`buy`###`sell`##")
        .addIngredient("buy", Item.simple(new ItemStack(Material.EMERALD)))
        .addIngredient("sell", Item.simple(new ItemStack(Material.GOLD_INGOT)))
        .build();
```

That line contains 18 characters but only 9 slots:

```text
##`buy`###`sell`##
```

- `buy`: buy button
- `sell`: sell button
- `#`: empty

Multi-character identifiers are bound as strings; a single-character one accepts both `'B'` and `"B"`.

Single characters keep the template aligned in your source so each slot's position is visible at a glance. Prefer them while the set of identifiers stays small.

> **Warning: Template mistakes fail immediately**
>
> The following throw an `IllegalArgumentException`:
>
> - Rows of different lengths; the message names the offending row, e.g. `row 2 has logical width 8, expected 9`
> - An unclosed backtick pair, or an empty pair with nothing between them
> - Control characters such as tabs in the template
> - `addIngredient` bound an identifier that does not exist in the template; it throws on the spot, not at `build()`

> **Warning: Regular windows require width 9, height 1-6**
>
> The Pane itself has no size limits; the limits come from the Window hosting it. `Window.builder(pane)` opens a chest-style window whose row count is the Pane's height, so the Pane must be 9 wide and 1 to 6 tall, or `build` and `open` throw an `IllegalArgumentException`.
>
> Hoppers, dispensers, and other window types have their own fixed sizes; see [Window types](https://catnies.github.io/sparrow-ui-wiki/window/types.md).

## Empty slots

The template does not require every identifier to be bound. Unbound slots are empty: no item, no click behavior.

The examples on this site use `#` for such slots. `#` has no special meaning in the library; if you bind content to it, it works like any other character.

When the Pane has a background, empty slots show the background item. Below, gray glass panes fill the 26 slots around the help book:

```java
ItemStack background = new ItemStack(Material.GRAY_STAINED_GLASS_PANE);
background.setData(DataComponentTypes.CUSTOM_NAME, Component.empty());

Pane pane = Pane.builder(
                "#########",
                "####B####",
                "#########"
        )
        .setBackground(background)
        .addIngredient('B', Item.simple(new ItemStack(Material.BOOK)))
        .build();
```

The full story on backgrounds is in [Backgrounds, freezing, and nesting](https://catnies.github.io/sparrow-ui-wiki/pane/composition.md). To keep a specific slot blank without showing the background, bind [`Item.empty()`](https://catnies.github.io/sparrow-ui-wiki/item/create.md#creating-an-empty-item) to it.

> **Warning: Mistyped characters and spaces fail silently**
>
> Unbound identifiers raise no error. A character you mistype becomes a new identifier, and its slots silently stay empty.
>
> A space is a regular character and still takes a slot. Do not pad templates with spaces for alignment: `"# # # # #"` is 9 slots, four of which have a space as their identifier.

## Slots and coordinates

Every slot in a Pane has a **slot index**: the top-left is 0, increasing left to right, then top to bottom. The same slot can also be addressed as a coordinate `(x, y)`, where `x` is the column and `y` the row, both starting at 0. The conversion is `slot = x + y × width`.

```text
---------
####B####
---------
```

- `-`: border
- `B`: help book
- `#`: empty

The help book `B` sits in row 2, column 5, which is slot 13, coordinate `(4, 1)`.

A Pane's size is represented by `PaneSize`, which also converts between slots and coordinates:

```java
Pane pane = Pane.builder(
                "---------",
                "####B####",
                "---------"
        )
        .build();

PaneSize size = pane.size();                 // width 9, height 3
int area = size.area();                      // 27
int slot = size.indexOf(4, 1);               // 13
PanePosition position = size.positionOf(13); // x = 4, y = 1
String identifier = pane.identifierAt(13);   // "B"
```

Out-of-range coordinates or slots make `indexOf` and `positionOf` throw an `IndexOutOfBoundsException`.

Binding by identifier means you never have to compute slot numbers. Slots and coordinates mostly matter for [programmatic layouts](https://catnies.github.io/sparrow-ui-wiki/pane/programmatic.md), and for reading them in error messages: if an identifier's content fails to create at `build()`, the exception names the identifier, the template row and column, and the slot index.

> **Info: Pane slots versus Window slots**
>
> The numbers here are **Pane slots**, relative to that Pane only. `RenderContext.windowSlot` and `ItemClick.windowSlot()` are **Window slots**. When the Pane is used directly as the top half of `Window.builder(pane)`, the two match; when the Pane is nested inside another Pane they differ. See [Backgrounds, freezing, and nesting](https://catnies.github.io/sparrow-ui-wiki/pane/composition.md).

## Parsing the layout ahead of time

`Pane.builder("row", ...)` first parses the template into a `Structure`, then builds the Builder from it. A `Structure` records the Pane's size and every slot's identifier. It is immutable once created and stores no bound content.

When the same layout is reused, parse it once and keep it as a constant:

```java
private static final Structure LAYOUT = Structure.of(
        "---------",
        "####B####",
        "---------"
);

public static Pane createPane() {
    return Pane.builder(LAYOUT)
            .addIngredient('B', Item.simple(new ItemStack(Material.BOOK)))
            .build();
}
```

`Pane.builder(LAYOUT)` produces the same Builder as passing the template rows directly. Several Builders sharing one `Structure` never interfere with each other's bindings.

Each `Pane.builder` entry point pairs with a matching `Structure`:

| Pane entry | Matching Structure | Layout content |
| - | - | - |
| `Pane.builder(String...)` | `Structure.of(String...)` | Multi-row template |
| `Pane.builder(int, int, String)` | `Structure.of(PaneSize, String)` | Rows joined end to end into one string; the count must equal width × height |
| `Pane.builder(PaneSize)`, `Pane.builder(int, int)` | `Structure.of(PaneSize)` | Size only, no identifiers |
| `Pane.builder(Structure)` | The given `Structure` | An already parsed layout |

A size-only blank layout has no identifiers, so `addIngredient` is unavailable and every slot starts empty. It exists for slot-by-slot arrangements; see [Programmatic layouts](https://catnies.github.io/sparrow-ui-wiki/pane/programmatic.md).

## Example: a help menu

Borders on top and bottom, three help buttons in the middle that send their content to chat when clicked, and a close button centered on the bottom edge.

```text title="Server help"
---------
#R##C##W#
----X----
```

- `-`: border (`black_stained_glass_pane`)
- `R`: server rules (`book`)
- `C`: common commands (`writable_book`)
- `W`: website (`map`)
- `X`: close menu (`barrier`)
- `#`: empty

```java
import io.papermc.paper.datacomponent.DataComponentTypes;
import io.papermc.paper.datacomponent.item.ItemLore;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;
import net.kyori.adventure.text.format.TextDecoration;
import net.momirealms.sparrow.ui.item.Item;
import net.momirealms.sparrow.ui.pane.Pane;
import net.momirealms.sparrow.ui.pane.Structure;
import net.momirealms.sparrow.ui.window.Window;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;

import java.util.List;

public final class HelpMenu {
  // The layout is parsed once and reused on every menu open.
  private static final Structure LAYOUT = Structure.of(
          "---------",
          "#R##C##W#",
          "----X----"
  );

  public static void open(Player viewer) {
      Pane pane = Pane.builder(LAYOUT)
              // '-' covers 17 slots with a single binding; '#' stays unbound and empty.
              .addIngredient('-', Item.simple(border()))
              .addIngredient('R', helpButton(Material.BOOK, "Server Rules", List.of(
                      "No cheat clients.",
                      "Do not grief other players' builds."
              )))
              .addIngredient('C', helpButton(Material.WRITABLE_BOOK, "Common Commands", List.of(
                      "/spawn returns to spawn",
                      "/home returns home"
              )))
              .addIngredient('W', helpButton(Material.MAP, "Website", List.of(
                      "https://example.com"
              )))
              .addIngredient('X', closeButton())
              .build();

      Window.builder(pane)
              .setTitle(Component.text("Server Help"))
              .open(viewer);
  }

  private static Item helpButton(Material material, String title, List<String> lines) {
      ItemStack stack = new ItemStack(material);
      stack.setData(
              DataComponentTypes.CUSTOM_NAME,
              Component.text(title, NamedTextColor.YELLOW)
                      .decoration(TextDecoration.ITALIC, false)
      );
      stack.setData(
              DataComponentTypes.LORE,
              ItemLore.lore(List.of(
                      Component.text("Click to view in chat.", NamedTextColor.GRAY)
                              .decoration(TextDecoration.ITALIC, false)
              ))
      );
      return Item.builder()
              .setItemProviderConstant(stack)
              .addClickHandler(click -> {
                  click.player().sendMessage(Component.text(title, NamedTextColor.AQUA));
                  for (String line : lines) {
                      click.player().sendMessage(Component.text(line, NamedTextColor.GRAY));
                  }
              })
              .build();
  }

  private static Item closeButton() {
      ItemStack stack = new ItemStack(Material.BARRIER);
      stack.setData(
              DataComponentTypes.CUSTOM_NAME,
              Component.text("Close Menu", NamedTextColor.YELLOW)
                      .decoration(TextDecoration.ITALIC, false)
      );
      return Item.builder()
              .setItemProviderConstant(stack)
              .addClickHandler(click -> click.window().close())
              .build();
  }

  private static ItemStack border() {
      ItemStack stack = new ItemStack(Material.BLACK_STAINED_GLASS_PANE);
      stack.setData(DataComponentTypes.CUSTOM_NAME, Component.empty());
      return stack;
  }
}
```

1. **Parse the layout** (lines 17-22): The three-row template is parsed into a Structure when the class initializes. Every open reuses it to create a Builder instead of parsing again.
2. **Fill the border** (lines 26-27,85-89): "-" occupies 17 slots, so one addIngredient puts a black glass pane in all of them; "#" stays unbound, leaving those 6 slots empty.
3. **The help buttons** (lines 28-38,47-70): All three buttons come from the same helpButton method, differing only in item, title, and chat lines. R, C, and W each appear once, so each takes one slot.
4. **The close button** (lines 39,72-83): X sits at the center of the bottom edge, slot 22, coordinate (4, 2). Clicking it closes the current Window.
5. **Open the window** (lines 25,40,42-44): build() produces a 9 × 3 Pane, and Window\.builder opens a three-row chest based on its height.

**Next**: [Filling content](https://catnies.github.io/sparrow-ui-wiki/pane/ingredients.md) — Everything addIngredient can bind to an identifier.
