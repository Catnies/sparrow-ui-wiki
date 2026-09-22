# Core concepts and layers

Source: <https://catnies.github.io/sparrow-ui-wiki/getting-started/concepts>

A Window manages the window, a Pane arranges the layout, and an Element describes what goes in each slot. Panes can nest, and one Window can take several Panes at once.

## The component hierarchy

Click a node to see what it does and how it connects. Every Pane can place Items, link an Inventory, or nest further Panes.

One Window can connect multiple Panes

- [Window · UI window](https://catnies.github.io/sparrow-ui-wiki/window/lifecycle.md): Each player gets their own Window, and Windows cannot be shared between players. A Window manages the container, the title, and the open/close flow; the Panes, Items, and other UI components attached to it can be shared across Windows.
  - [Pane](https://catnies.github.io/sparrow-ui-wiki/pane/structure.md): A Pane decides what goes in each slot. Its slots are described by Elements: place an Item directly, link a child Pane or a slot of an Inventory, or leave the slot empty.
    - [Item](https://catnies.github.io/sparrow-ui-wiki/item/create.md) (Element.Item · item placed directly): An Item provides the stack shown in the slot and handles clicks. The Pane places it into the layout through Element.Item.
    - [Pane](https://catnies.github.io/sparrow-ui-wiki/pane/structure.md) (Element.PaneLink · links a child Pane's slots): A parent Pane links a child Pane's slots through Element.PaneLink. The child can place Items, link an Inventory, and nest further Panes.
      - [Item](https://catnies.github.io/sparrow-ui-wiki/item/create.md) (Element.Item · item placed directly): Items inside nested Panes still handle display and clicks. The Window resolves content by following the slot links between Panes.
  - [Pane](https://catnies.github.io/sparrow-ui-wiki/window/layout.md): One Window can connect several sibling Panes. Each Pane organizes its own slots and has the same layout capabilities.
    - [Inventory](https://catnies.github.io/sparrow-ui-wiki/inventory/basics.md) (Element.InventoryLink · links inventory slots): An Inventory holds the items players interact with. A Pane links to a specific slot through Element.InventoryLink and shows and operates on the item inside.

Beyond layout: content updates and visual effects

- [Signal · Let content follow the data](https://catnies.github.io/sparrow-ui-wiki/signal/why.md): A Signal is a value that notifies its dependents. Once an Item or layout declares a dependency, a change triggers an update. It does not occupy a layer in the diagram.
- [Visual · Draw on top of the content](https://catnies.github.io/sparrow-ui-wiki/visual/layers.md): Visual layers draw highlights, animations, and other effects on top of the content. They change what the player sees and never modify the items actually stored in the inventory.

When several Windows chain into one flow, [sessions](https://catnies.github.io/sparrow-ui-wiki/session/navigation.md) handle moving forward and back.

## Per-player or shared

Of these components, **Windows are counted per player**. Panes and Elements never record which slot they occupy or who is looking at them, which leaves two ways to use them: build one set per player, or share a single set.

| | Fresh on every open | Shared |
| - | - | - |
| Best for | The vast majority of menus | Content every player should see identically |
| Between players | Fully isolated | One change, everyone sees it immediately |
| Watch out | No extra constraints | No player state inside the component |

### Fresh on every open

Menu objects are cheap. Building one just parses a character template and creates a few items; there is no IO. So **this is the default**, and the [quick start](https://catnies.github.io/sparrow-ui-wiki/getting-started/quick-start.md) uses it too:

```java
public static void open(Player viewer) {
    // A fresh Pane and Window on every call
    Window.builder(buildPane())
            .setTitle(Component.text("Welcome Menu"))
            .open(viewer);
}
```

Each player gets an isolated set of components: no concurrency to think about, no state left behind by the previous player. **When in doubt, do this.**

### Shared

Hand the same Item, the same Pane, or the same inventory to several Windows. When the component changes, every observer is notified and each Window refreshes only the affected slots.

This fits content that is identical for everyone by design: a shared guild chest, a server-wide leaderboard.

```java
// One announcement Pane, two players each opening a Window onto the same content
Window.builder(boardPane).setTitle(Component.text("Announcements")).open(alice);
Window.builder(boardPane).setTitle(Component.text("Announcements")).open(bob);
```

> **Warning: Shared components must not hold player state**
>
> This rule **only applies to shared components**. If one component serves several players at once, it cannot cache "who the current player is". Anything per-player comes from `RenderContext` or `ItemClick`.
>
> The "fresh on every open" style above is exempt from this.

**Next**: [Creating items](https://catnies.github.io/sparrow-ui-wiki/item/create.md) — Start at the innermost layer and build an Item first
