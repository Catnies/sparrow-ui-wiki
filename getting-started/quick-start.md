# Quick start

Source: <https://catnies.github.io/sparrow-ui-wiki/getting-started/quick-start>

## A simple welcome menu

Let's build a welcome menu: a three-row chest, a ring of decorative background, and two buttons in the middle. One greets the player, the other closes the menu.

Hover over the items to see their names and lore:

```text title="Welcome Menu"
#########
###G#C###
#########
```

- `#`: `gray_stained_glass_pane`
- `G`: Say hi (`lime_dye`), lore: Click to greet yourself.
- `C`: Close (`barrier`), lore: Click to close this menu.

## Define the layout

The layout is declared as three strings, one character per slot:

```java
Pane.builder(
        "#########",
        "###G#C###",
        "#########"
)
```

The ring of `#` is decoration players cannot click; `G` and `C` are the two buttons. Where each character lands:

```text
#########
###G#C###
#########
```

- `#`: background
- `G`: greeting
- `C`: close menu

## Walk through the code

The whole menu is the single class below. Step through the stepper to see what each part does; unselected lines dim, and the code stays the same.

```java
import io.papermc.paper.datacomponent.DataComponentTypes;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;
import net.kyori.adventure.text.format.TextDecoration;
import net.momirealms.sparrow.ui.item.Item;
import net.momirealms.sparrow.ui.pane.NormalPane;
import net.momirealms.sparrow.ui.pane.Pane;
import net.momirealms.sparrow.ui.window.Window;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;

public final class WelcomeMenu {

  private WelcomeMenu() {
  }

  /** Opens the welcome menu for one player. */
  public static void open(Player viewer) {
      Window.builder(buildPane())
              .setTitle(Component.text("Welcome Menu"))
              .open(viewer);
  }

  /** The menu layout: a ring of background and two buttons in the middle. */
  private static NormalPane buildPane() {
      return Pane.builder(
                      "#########",
                      "###G#C###",
                      "#########"
              )
              .setBackground(background())
              .addIngredient('G', greetButton())
              .addIngredient('C', closeButton())
              .build();
  }

  /** Greets the player when clicked. */
  private static Item greetButton() {
      ItemStack itemStack = new ItemStack(Material.LIME_DYE);
      itemStack.setData(DataComponentTypes.CUSTOM_NAME,
              Component.text("Say hi", NamedTextColor.YELLOW).decoration(TextDecoration.ITALIC, false));

      return Item.builder()
              .setItemProviderConstant(itemStack)
              .addClickHandler(click -> click.player().sendMessage(
                      Component.text("Hi, " + click.player().getName() + "!", NamedTextColor.GREEN)))
              .build();
  }

  /** Closes the menu when clicked. */
  private static Item closeButton() {
      ItemStack itemStack = new ItemStack(Material.BARRIER);
      itemStack.setData(DataComponentTypes.CUSTOM_NAME,
              Component.text("Close", NamedTextColor.RED).decoration(TextDecoration.ITALIC, false));

      return Item.builder()
              .setItemProviderConstant(itemStack)
              .addClickHandler(click -> click.window().close())
              .build();
  }

  /** The decorative item shown in empty slots. */
  private static ItemStack background() {
      ItemStack itemStack = new ItemStack(Material.GRAY_STAINED_GLASS_PANE);
      itemStack.setData(DataComponentTypes.CUSTOM_NAME, Component.empty());
      return itemStack;
  }
}
```

1. **Draw the layout** (lines 27-31): Three strings describe the shape of the menu: one character per slot. Three rows of nine makes a 27-slot chest. Pick any characters you like; they are just labels for naming which slots hold what in the next step.
2. **Lay the background** (lines 32,64-68): setBackground fills every slot without a dedicated assignment, here the whole ring of #. Background items cannot be clicked; they hold space and split the menu into areas.
3. **Fill in the buttons** (lines 33-34): addIngredient binds a character to an Item. Bind once and every slot that character occupies in the layout uses it. Each button appears only once, so each takes one slot.
4. **What the buttons look like** (lines 40-42): The looks are just a plain ItemStack. Name and lore go through Paper's data component API; do not reach for ItemMeta. Turning off the default italic is a habit worth keeping, otherwise vanilla renders custom names in italics.
5. **What a click does** (lines 46-47,59): The click handed to addClickHandler carries the full context of this click: who clicked, which slot, what kind of click, what the cursor held, and which Window it belongs to. The close button uses window() from it.
6. **Open it** (lines 19-23): Window\.builder takes a Pane as the top half; the bottom half maps to the player's own inventory. open() sends the menu to the player.

## Add a command to open it

The menu class is done; it just needs a caller. Register a `/welcome` command with Paper's Brigadier API. Join the server, type `/welcome`, and the menu appears.

```java
// In your JavaPlugin#onEnable
this.getLifecycleManager().registerEventHandler(LifecycleEvents.COMMANDS, event ->
        event.registrar().register(
                Commands.literal("welcome")
                        .executes(context -> {
                            if (context.getSource().getExecutor() instanceof Player player) {
                                WelcomeMenu.open(player);
                            }
                            return Command.SINGLE_SUCCESS;
                        })
                        .build(),
                "Open the welcome menu"));
```

> **Tip: build() and open() may run off the main thread**
>
> `build(viewer)` and `open()` can both be called from any thread (any thread); building a menu does not have to squeeze onto the main thread.
>
> What you do have to own is the gap between starting the build and the menu actually opening, because state can change in between. Say a player right-clicks a shulker box item and you read its contents asynchronously to build the menu. By the time the menu opens, the item in their hand may no longer be that shulker box.

> **Info: The return value of open()**
>
> `open()` returns a `CompletableFuture<Window.OpenResult>` with three outcomes: `OPENED`, `ALREADY_OPEN`, and `VIEWER_UNAVAILABLE`. The example above ignores the result, so it just drops the future.

**Next**: [Core concepts and layers](https://catnies.github.io/sparrow-ui-wiki/getting-started/concepts.md) — How Window, Pane, and Item actually relate
