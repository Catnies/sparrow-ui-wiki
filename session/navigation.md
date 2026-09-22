# Submenus and going back

Source: <https://catnies.github.io/sparrow-ui-wiki/session/navigation>

The previous chapters covered building and opening a single Window. A menu with product details, category lists, and other submenus needs to manage moving between and back across several Windows. A `WindowSession` represents one player's session from opening the menu to leaving it: it records how the Windows relate and runs a callback when the whole session ends.

Calling the Window's `open()` creates the session automatically, and that Window becomes the session's root, so there is no `WindowSession` to construct by hand. Windows opened through `navigate(...)` afterwards join the same session; they can go back to the previous Window, and Esc can be set to do the same.

The session a Window belongs to is available through `window.session()`; for a Window that has been built but not yet opened, the value is `null`.

## Chaining menus

Calling `navigate(...)` from the current Window opens the next Window and continues the session. Going from a product catalog into a detail view and back is one browsing session, so both Windows belong to it.

`navigate` takes three kinds of arguments; pick by how the next Window gets built.

| Argument | Usage |
| - | - |
| `Window` | Pass an already built Window, including a previously saved instance |
| `Window.Builder<?, ?>` | The library builds the next Window synchronously for the current player; each call produces a new instance |
| `CompletionStage<? extends Window>` | Pass a Future that builds the Window asynchronously; it opens once building completes |

With a Builder, building runs on the thread calling `navigate`. For async building, schedule the task yourself and hand the Future to `navigate`. The actual open is scheduled onto the player's entity thread; the build-time thread requirements are in [Opening and closing](https://catnies.github.io/sparrow-ui-wiki/window/lifecycle.md).

`navigate(...)` returns a `CompletableFuture<Window>`: the opened Window on success, `null` when it could not be opened. If the async build task throws, the Future completes exceptionally. After building, the library also checks that the originating Window still belongs to the original session and is still the current one; if that has changed, the navigation is cancelled.

> **Warning: Use navigate for chaining menus**
>
> Calling another Window's `open()` directly starts a new session, the old session ends with the `OPEN_NEW` reason, and the session can no longer return to the original Window. The Window passed to `navigate(Window)` must belong to the same player.

If the next Window needs business data such as product info, pass it at build time with `setData`, see [Window data](https://catnies.github.io/sparrow-ui-wiki/window/data.md). Joining a session does not forward that data automatically.

## Going back

With a session in place, going back does not rebuild the parent menu. Call the current Window's `back()` and the library finds the previous Window and reopens it, keeping that Window's data and content intact.

`back()` and `backOrClose()` differ in what happens when there is no previous Window.

| Method | Previous Window exists | No previous Window |
| - | - | - |
| `back()` | Goes back | Keeps the current Window open |
| `backOrClose()` | Goes back | Closes the current Window |

A back button usually calls `backOrClose()`: it goes back inside a submenu and closes at the root. Both return a `CompletableFuture<Window>` that resolves to the reopened Window, or `null` when there was nothing to return to or the Window only closed.

Sessions default to the stack structure, returning level by level in entry order. The tree structure instead lets each Window return to its own parent; the differences are in [The three session structures](https://catnies.github.io/sparrow-ui-wiki/session/structures.md).

### Going back with Esc

By default, pressing Esc in a submenu ends the whole session. Set `setBackOnPlayerClose(true)` on the submenu's Builder and a player-initiated close goes back one Window instead; the root has nothing behind it and still exits.

The setting applies to that Window only, so every Window that should support Esc-back needs its own call. It can also be changed after building with `window.backOnPlayerClose(true)`.

A plugin calling `close()` still closes the current Window and ends the session; use `back()` or `backOrClose()` when you want a return. If the Window has `setCloseable(false)`, player close attempts are blocked, see [Opening and closing](https://catnies.github.io/sparrow-ui-wiki/window/lifecycle.md).

## The session end callback

A session can handle the end of the whole menu flow in one place. Register a callback on the root Window's Builder with `addSessionEndHandler(...)`; it runs exactly once when the session ends, and neither entering submenus nor going back triggers it.

The Window's own close callback is per Window and may fire as soon as the player switches to a submenu. Work that should wait until the player leaves the entire menu belongs in the session end callback.

The callback receives a `WindowCloseReason` describing why the session ended.

| Reason | When it happens |
| - | - |
| `PLAYER` | The player left on their own, with no return to a previous Window |
| `PLUGIN` | A plugin closed the current Window, or called `session.end()` |
| `OPEN_NEW` | A Window outside the session replaced the current one |
| `DISCONNECT` | The player disconnected |

`addSessionEndHandler` on the Builder only takes effect when that Window becomes the root. Once the session is running, add callbacks through `window.session().addSessionEndHandler(...)`.

To end the whole session deliberately, call `session.end()`. It closes the current Window, fires the end callback with the `PLUGIN` reason, and clears the session's Window references. Calling it again fires no second callback.

**Next**: [The three session structures](https://catnies.github.io/sparrow-ui-wiki/session/structures.md) — Compare how each structure returns, and whether exited Windows are kept.
