# Animations

Source: <https://catnies.github.io/sparrow-ui-wiki/visual/animation>

An animation changes a slot's display frame by frame for a while, then the original look returns. Like [visual layers](https://catnies.github.io/sparrow-ui-wiki/visual/layers.md), it changes only the display: real items stay untouched, and clicks are unaffected.

## Playing an animation

`visual().play(definition)` plays one animation. It can play on a Pane, an inventory, or a Window, and who sees it depends on where it plays:

| Played on | Call | Slot indexes | Who sees it |
| - | - | - | - |
| Pane | `pane.visual().play(...)` | Pane slots | Every Window displaying the Pane |
| Inventory | `inventory.visual().play(...)` | Inventory slots | Every Window displaying the inventory |
| Window | `window.visual().play(...)` | Window slots | Only this Window's viewer |

Below, after the chest opens, rewards are covered by gray glass panes and then uncovered one by one from left to right:

```java
public static void openChest(Player viewer, VirtualInventory rewards) {
    Pane pane = Pane.builder(
                    "#########",
                    "#RRRRRRR#",
                    "#########"
            )
            .addIngredient('R', rewards)
            .setFrozen(true)
            .build();

    Window.builder(pane)
            .setTitle("Treasure chest")
            // Play after the Window opens, so the player sees the whole sequence
            .addOpenHandler(window -> pane.visual().play(
                    // The seven R slots are covered by gray glass first, then uncovered
                    // one slot every 4 ticks, left to right
                    AnimationDefinition.reveal(pane.slots("R"), 4, glass(Material.GRAY_STAINED_GLASS_PANE))
            ))
            .open(viewer);
}
```

**The glass() implementation**

```java
private static ItemStack glass(Material material) {
    ItemStack stack = new ItemStack(material);
    // Empty name; purely decorative
    stack.setData(DataComponentTypes.CUSTOM_NAME, Component.empty());
    return stack;
}
```

`pane.slots("R")` collects the R slots from the template in reading order, left to right, top to bottom. Time is measured in ticks, 20 to a second.

An animation advances on the server's tick and never pauses just because nobody is watching. Playing it in the Window's open handler lets the player see the whole sequence; starting it before opening means the beginning may finish before the Window appears.

An animation draws above the visual mappings at its location, and the original display shows through once it finishes. It is display-only: the example freezes the Pane, so players cannot take rewards before they are uncovered; unfrozen, items under the cover can still be taken.

## Built-in animations

`AnimationDefinition` provides four common animations:

| Method | Effect | Total length |
| - | - | - |
| `frames(slots, period, frames)` | All slots play the frame list together | Frame count × period |
| `loop(slots, period, frames)` | All slots cycle the frame list together | Never ends by itself |
| `reveal(order, stagger, cover)` | Slots are covered first, then uncovered in order | Stagger × (slot count − 1) |
| `staggeredFrames(order, stagger, period, frames, cover)` | Start times stagger in order; each slot plays the frames once | Stagger × (slot count − 1) + frame count × period |

`period` is the ticks per frame and must be positive; `stagger` is the tick gap between neighboring slots' start times, which `reveal` requires to be positive and `staggeredFrames` allows to be 0. Invalid arguments or an empty frame list throw an `IllegalArgumentException`. Frame items are copied when the animation is created; later changes to the originals do not reach it.

Definitions are immutable, so keep one as a constant and play it repeatedly, even in several places at once; each play runs independently.

### Playing together: frames

`frames` advances all slots through the frames at once and ends after the last. The reward slots below flash twice when claimed:

```java
private static final List<ItemStack> FLASH = List.of(
        glass(Material.LIME_STAINED_GLASS_PANE),
        glass(Material.WHITE_STAINED_GLASS_PANE),
        glass(Material.LIME_STAINED_GLASS_PANE),
        glass(Material.WHITE_STAINED_GLASS_PANE)
);

// Every R slot flashes together, 3 ticks per frame, 4 frames in 12 ticks
pane.visual().play(AnimationDefinition.frames(pane.slots("R"), 3, FLASH));
```

### Looping: loop

`loop` is `frames` that returns to the first frame after the last and never ends by itself. The border below cycles through seven colors:

```java
private static final List<ItemStack> RAINBOW = List.of(
        glass(Material.RED_STAINED_GLASS_PANE),
        glass(Material.ORANGE_STAINED_GLASS_PANE),
        glass(Material.YELLOW_STAINED_GLASS_PANE),
        glass(Material.LIME_STAINED_GLASS_PANE),
        glass(Material.LIGHT_BLUE_STAINED_GLASS_PANE),
        glass(Material.BLUE_STAINED_GLASS_PANE),
        glass(Material.PURPLE_STAINED_GLASS_PANE)
);

// The border's # swaps color every 4 ticks, cycling through seven, never ending by itself
AnimationHandle border = pane.visual().play(AnimationDefinition.loop(pane.slots("#"), 4, RAINBOW));
```

`#` has no bound content, but `pane.slots("#")` still collects its slots. Keep the handle `play` returns for a looping animation and call `cancel()` when it is no longer needed; see [Animation handles](https://catnies.github.io/sparrow-ui-wiki/visual/animation.md#animation-handles).

### Uncovering slot by slot: reveal

`reveal` covers every slot with `cover`, then uncovers one every `stagger` ticks in order, as in the preview at the top of this page. Slot 1 uncovers immediately at the start, slot n at `stagger × (n − 1)` ticks, and the animation ends when the last slot shows.

Passing `null` as `cover` covers nothing, leaving a pure timer; combine with an [animation handle](https://catnies.github.io/sparrow-ui-wiki/visual/animation.md#animation-handles) to run code after a delay.

### Staggered play: staggeredFrames

`staggeredFrames` staggers each slot's start: slots waiting their turn display `cover`, then play the frames once, then show the original content. Below, the whole window lights up column by column:

```java
private static final List<ItemStack> SPARK = List.of(
        glass(Material.WHITE_STAINED_GLASS_PANE),
        glass(Material.YELLOW_STAINED_GLASS_PANE),
        glass(Material.ORANGE_STAINED_GLASS_PANE),
        glass(Material.RED_STAINED_GLASS_PANE)
);

// Order every slot by column: each column top to bottom, columns left to right
SlotSequence order = SlotSequence.all(pane.size()).transform(SlotPatterns.COLUMN_MAJOR);
// Each slot starts 2 ticks after the previous one, showing a black glass pane until then,
// swapping frames every tick, and showing the original content afterwards
pane.visual().play(AnimationDefinition.staggeredFrames(order, 2, 1, SPARK, glass(Material.BLACK_STAINED_GLASS_PANE)));
```

`stagger` must be a multiple of `period`, or an `IllegalArgumentException` is thrown. With `stagger` at 0, all slots start together.

## Custom frame functions

When the built-ins cannot express the effect, `AnimationDefinition.of` computes each slot's frame yourself. The frame function receives the slot's position in the animation `orderIndex`, the slot index `slot`, the ticks elapsed `elapsedTicks`, and the slot's current item `actual`, returning the `ItemProvider` to display, with `null` showing the original content. Below, a progress bar fills over 45 ticks:

```java
// Build the frames ahead of time; every call returns the same instance
private static final ImmediateItemProvider FILLED = ItemProvider.constant(glass(Material.LIME_STAINED_GLASS_PANE));
private static final ImmediateItemProvider UNFILLED = ItemProvider.constant(glass(Material.GRAY_STAINED_GLASS_PANE));

int[] bar = pane.slots("P").toArray();
// Progress bar: one more slot fills every 5 ticks, 9 slots done in 45 ticks
pane.visual().play(AnimationDefinition.of(bar, 5, 45,
        (orderIndex, slot, elapsedTicks, actual) -> orderIndex <= elapsedTicks / 5 ? FILLED : UNFILLED));
```

`of`'s second and third arguments are the frame period and total length; a negative total never ends by itself. Frames refresh only when the period elapses.

> **Warning: Frame functions compute from their arguments only**
>
> Within one tick the function may be called several times, or not at all, so never drive state by call count, and never play sounds or send messages inside it. Precompute any data the animation needs and let the function just look things up by `elapsedTicks`. `actual` is read-only. Frame functions run at render time, so return fast and pre-build frame items as in the example.

## Picking slots and order

The order of the slot array is the play order, matching the `orderIndex` the frame function receives. `frames`, `loop`, `reveal`, and `staggeredFrames` also accept a `SlotSequence`; `of` needs `toArray()` to turn one into an array.

The usual picks:

- `pane.slots("R")`: a template identifier's slots, left to right, top to bottom
- `pane.slots(SlotPatterns.COLUMN_MAJOR, "R")`: the same, ordered by column
- `SlotSequence.all`, `row`, `column`, `borders`, `rectangle`: pick by shape, see [Programmatic layouts](https://catnies.github.io/sparrow-ui-wiki/pane/programmatic.md)
- `int[]`: write the slot indexes directly, played in the order written

Below, one half of a checkerboard uncovers first, then the other:

```java
SlotSequence all = SlotSequence.all(pane.size());
// One color of the checkerboard first, then the other
SlotSequence order = SlotSequence.concat(
        all.transform(SlotPatterns.CHECKERBOARD_EVEN),
        all.transform(SlotPatterns.CHECKERBOARD_ODD)
);
pane.visual().play(AnimationDefinition.reveal(order, 1, glass(Material.GRAY_STAINED_GLASS_PANE)));
```

Slot indexes outside the host throw an `IndexOutOfBoundsException` from `play`; the same slot appearing twice throws an `IllegalArgumentException`. An animation over an empty slot list ends immediately.

## Animation handles

`play` returns an `AnimationHandle`. `cancel()` stops the animation immediately and covered slots recover at once; `whenFinished` registers an end callback that receives the finish reason:

| Reason | When |
| - | - |
| `COMPLETED` | The total length ran out and it finished naturally |
| `CANCELLED` | `cancel()` was called |
| `WINDOW_CLOSED` | The animation played on a Window and the Window closed |

```java
AnimationHandle opening = pane.visual().play(
        AnimationDefinition.reveal(pane.slots("R"), 4, glass(Material.GRAY_STAINED_GLASS_PANE)));
opening.whenFinished(reason -> {
    // Only the natural finish gets a message, not a cancellation
    if (reason == AnimationHandle.FinishReason.COMPLETED) {
        viewer.sendMessage(Component.text("The chest has opened.", NamedTextColor.GREEN));
    }
});
```

Each registration's callback fires exactly once; if the animation already ended when you register, it fires immediately on the current thread. Callbacks may run on any thread: the timing thread on natural completion, the caller's thread on cancellation, so keep callbacks thread-safe.

An animation's start aligns to the period's beat, so animations sharing a period swap frames together; the cost is that the first frame may run up to one period shorter than the rest.

> **Warning: Animations on Panes and inventories outlive the Window**
>
> Only animations played on a Window end when the Window closes. Ones played on a Pane or inventory keep playing after the Window closes, and `loop` never ends by itself.
>
> Pan created fresh per open are collected after the Window closes, taking their animations along, but no `whenFinished` callback fires. On Panes shared by several players and long-lived inventories, cancel animations yourself when they are no longer needed:
>
> ```java
> AnimationHandle border = pane.visual().play(AnimationDefinition.loop(pane.slots("#"), 4, RAINBOW));
>
> Window.builder(pane)
>         .setTitle("Treasure chest")
>         // The animation plays on the Pane and outlives the Window, so cancel on close
>         .addCloseHandler((window, reason) -> border.cancel())
>         .open(viewer);
> ```

## Stacking animations

Several animations can play at the same place at once. The later one draws on top; when it returns `null` for a slot, the earlier one shows through. Below, the whole window blinks in a loop first, then lights up column by column, each lit slot revealing the still-blinking layer beneath:

```java
private static final List<ItemStack> BLINK = List.of(
        glass(Material.LIME_STAINED_GLASS_PANE),
        glass(Material.GREEN_STAINED_GLASS_PANE)
);

SlotSequence all = SlotSequence.all(pane.size());
// The earlier one sits below: every slot blinks in a loop
pane.visual().play(AnimationDefinition.loop(all, 5, BLINK));
// The later one sits above: lighting column by column, revealing the blinking layer beneath
pane.visual().play(AnimationDefinition.staggeredFrames(
        all.transform(SlotPatterns.COLUMN_MAJOR), 2, 1, SPARK, glass(Material.BLACK_STAINED_GLASS_PANE)));
```

Animations in different places stack in [visual-layer](https://catnies.github.io/sparrow-ui-wiki/visual/layers.md#how-the-display-stacks-up) order: a Window's animation covers a Pane's, and a Pane's covers an inventory's.

## Title animations

`window.playTitleAnimation` plays a title animation and also returns an `AnimationHandle`. Below, while the rewards uncover, the title shows "Opening" and dancing dots:

```java
private static final TitleAnimationDefinition OPENING_TITLE = TitleAnimationDefinition.loop(10, List.of(
        Component.text("Opening"),
        Component.text("Opening."),
        Component.text("Opening.."),
        Component.text("Opening...")
));

// Uncover a reward every 10 ticks so the title changes are easy to follow
AnimationHandle opening = pane.visual().play(
        AnimationDefinition.reveal(pane.slots("R"), 10, glass(Material.GRAY_STAINED_GLASS_PANE)));

// The title swaps frames every 10 ticks, looping
AnimationHandle title = window.playTitleAnimation(OPENING_TITLE);
// Stop once every reward is uncovered; the title returns to what setTitle set
opening.whenFinished(reason -> title.cancel());
```

During playback, the title changes every 10 ticks. At tick 60, all seven rewards are uncovered and the title returns to “Treasure chest”. Pressing Stop also restores the original title.

`TitleAnimationDefinition` mirrors the slot animations: `frames(period, frames)` plays through once and ends, `loop(period, frames)` cycles, and `of(period, total, elapsedTicks -> ...)` computes the title yourself, with `null` showing the original.

While playing, the animation's frames cover the title set by `setTitle` or `setTitleSupplier`, and the original returns afterwards. With several title animations on one Window, the later one draws on top. When the Window closes, the title animation ends with `WINDOW_CLOSED`.

> **Warning: Every title change resends the whole Window**
>
> The client cannot edit an open Window's title in place. Each title change makes the library reopen the Window and resend every slot's content. The more items in the Window, the higher the cost. Keep periods long and avoid looping title animations indefinitely.

**Next**: [Why Signals](https://catnies.github.io/sparrow-ui-wiki/signal/why.md) — Describe data with Signals and let the menu update itself as it changes.
