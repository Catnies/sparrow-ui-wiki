# 子菜单与返回

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/session/navigation>

菜单有商品详情、分类列表等子菜单时，需要处理窗口跳转和返回。`WindowSession` 表示一名玩家从打开菜单到退出菜单的这段会话，负责记录窗口之间的关系，并在整段会话结束时执行回调。

调用 Window 的 `open()` 后，Sparrow UI 会自动创建会话，这扇窗口就是会话的根窗，不需要另外创建 `WindowSession`。之后通过 `navigate(...)` 打开的窗口会加入同一个会话，可以返回上一扇窗口，也可以设置按 Esc 返回。

窗口所属的会话可以通过 `window.session()` 取得；窗口刚构建好、尚未打开时，这个值为 `null`。

## 打开子菜单

从当前窗口调用 `navigate(...)`，就能打开下一扇窗口并继续当前会话。例如从商品目录进入详情，再从详情返回目录，这两个窗口属于同一次浏览。

`navigate` 接受三种参数，按下一扇窗口的构建方式选择就行。

| 参数 | 用法 |
| - | - |
| `Window` | 传入已经构建好的窗口，也可以再次传入之前保存的窗口实例 |
| `Window.Builder<?, ?>` | 由 Sparrow UI 使用当前玩家同步构建下一扇窗口，每次调用都会生成新实例 |
| `CompletionStage<? extends Window>` | 传入异步构建窗口的 Future，等构建完成后再打开 |

传入 Builder 时，构建就在调用 `navigate` 的线程执行。需要异步构建时，由插件安排任务，再把 Future 交给 `navigate`。实际打开窗口由 Sparrow UI 调度到玩家实体线程，构建时的线程要求看 [打开与关闭](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/window/lifecycle.md)。

`navigate(...)` 返回 `CompletableFuture<Window>`，成功时结果为打开的窗口，未能打开时为 `null`。异步构建任务抛出异常时，Future 也会异常完成。构建完成后，Sparrow UI 还会检查发起导航的窗口是否仍属于原会话、仍是当前窗口；如果已经切换，就取消这次导航。

> **注意：打开子菜单使用 navigate**
>
> 直接调用另一扇窗口的 `open()` 会开始新会话，原会话以 `OPEN_NEW` 原因结束，无法再通过会话返回原窗口。传给 `navigate(Window)` 的窗口必须属于同一名玩家。

若下一扇窗口需要商品信息等业务数据，可以在构建时用 `setData` 传入，看 [窗口数据](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/window/data.md)。加入同一个会话不会自动传递这些数据。

## 返回上一扇窗口

有了会话，返回时就不必重新构建上一级菜单。调用当前窗口的 `back()`，Sparrow UI 会找到上一扇 Window 并重新打开，原窗口中的数据和内容也会保留。

`back()` 和 `backOrClose()` 的区别在于没有上一扇窗口时怎么处理。

| 方法 | 有上一扇窗口 | 没有上一扇窗口 |
| - | - | - |
| `back()` | 返回上一扇窗口 | 保持当前窗口打开 |
| `backOrClose()` | 返回上一扇窗口 | 关闭当前窗口 |

返回按钮通常使用 `backOrClose()`，放在子菜单中用于返回，放在根菜单中用于关闭。两个方法都返回 `CompletableFuture<Window>`，返回成功时结果为重新打开的窗口，没有返回或只关闭了窗口时为 `null`。

会话默认使用栈结构，按进入顺序逐级返回。也可以选择树结构，让窗口返回自己的父节点，区别看 [三种会话结构](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/session/structures.md)。

### 按 Esc 返回

默认在子菜单按 Esc 会结束整个会话。在子菜单 Builder 上设置 `setBackOnPlayerClose(true)` 后，玩家主动关闭窗口时会返回上一扇；根窗没有上一扇，仍然会退出。

这个设置只对当前 Window 生效，需要 Esc 返回的窗口要分别设置。构建后也可以通过 `window.backOnPlayerClose(true)` 修改。

插件调用 `close()` 仍会关闭当前窗口并结束会话，需要返回时使用 `back()` 或 `backOrClose()`。如果窗口设置了 `setCloseable(false)`，玩家的关窗操作会被拦截，看 [打开与关闭](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/window/lifecycle.md)。

## 会话结束回调

会话可以统一处理整次菜单操作的结束。在根窗 Builder 上调用 `addSessionEndHandler(...)` 注册回调，它只在会话结束时执行一次，进入子菜单或返回上一级都不会触发。

Window 自己的关闭回调针对单扇窗口，切换到子菜单时就可能执行。需要等玩家退出整段菜单后再做的处理，可以放在会话结束回调中。

回调参数为 `WindowCloseReason`，表示结束原因。

| 原因 | 何时发生 |
| - | - |
| `PLAYER` | 玩家主动退出，且没有返回上一扇窗口 |
| `PLUGIN` | 插件关闭当前窗口，或调用 `session.end()` |
| `OPEN_NEW` | 会话外的窗口替换了当前窗口 |
| `DISCONNECT` | 玩家断线 |

Builder 上的 `addSessionEndHandler` 只在该窗口成为根窗时生效。会话已经开始后，可以通过 `window.session().addSessionEndHandler(...)` 追加回调。

需要主动结束整个会话时，调用 `session.end()`。它会关闭当前窗口，以 `PLUGIN` 原因触发结束回调，并清除会话持有的窗口引用。重复调用不会再次触发回调。

**下一步**：[三种会话结构](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/session/structures.md) — 比较三种结构如何返回，以及退出子菜单后是否保留窗口。
