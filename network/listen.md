# Listening to packets

Source: <https://catnies.github.io/sparrow-ui-wiki/network/listen>

> **Info: Optional capability; the API may still change**
>
> This network API was built for Sparrow UI's own needs and later polished for outside use. It sits near a simplified PacketEvents in feature terms, with the implementation favoring processing efficiency, but it is not treated as absolutely stable.
>
> If you are only writing menus, skip this chapter; click handling and window updates are covered by the UI APIs.

`NetworkManager` offers listeners at the byte level and the NMS object level. After Sparrow UI initialization, get the manager via `SparrowUI.getInstance().networkManager()`.

## Byte-level listening

Name the packet, protocol phase, and direction with `PacketType`, then call `listenByteBuf`. Below reads the player's request to select a hotbar slot.

```java
NetworkManager network = SparrowUI.getInstance().networkManager();
PacketType type = new PacketType(
        "minecraft:set_carried_item", ConnectionState.PLAY, PacketFlow.SERVERBOUND);

Subscription listener = network.listenByteBuf(type, (user, event) -> {
    int slot = event.buffer().readShort();
    System.out.println("Hotbar index: " + slot);
});
```

The field layout here was checked against Minecraft Java 1.21.11; the hotbar index runs `0` through `8`. `SERVERBOUND` means client-to-server and `CLIENTBOUND` server-to-client; `PLAY` is the game phase, and handshake, status, login, and configuration phases can be named too.

The library resolves the packet ID for the current server; registering a packet the current version lacks throws an `IllegalArgumentException`. Field formats still need adapting to the target version by the caller.

`event.buffer()` provides the payload without the packet ID, and each listener reads it from the start. Writing marks it modified, `clear()` empties only the payload, and `event.cancel()` cancels the current frame and stops further propagation. The buffer is borrowed only for the callback: do not keep it, and never call `retain()` or `release()` on it.

## NMS object-level listening

With an NMS adapter in place, `listenNMS` is an alternative. The third callback argument is the currently matched packet object; read its fields through your project's own version adapter.

```java
Subscription listener = network.listenNMS(type, (user, event, packet) -> {
    System.out.println(packet.getClass().getName());
});
```

This and the byte listener above are two independent approaches. The object level also supports `event.cancel()`, or `event.replaceRootAndStop(replacement)` to swap the whole root packet and stop propagation. For bundles, `packet` may be a child packet, but cancelling or replacing still applies to the whole root.

Both callback kinds run synchronously on Netty threads, and one listener may be invoked concurrently from different connections. No blocking queries inside, and no touching worlds or inventories that require player or region threads. Connections not yet in the game may have no `Player`: `user.player()`, `uuid()`, and `name()` can all be `null`.

To stop listening, call `close()` on the returned ticket. The manager holds listeners, so discarding the ticket does not unregister; dispatches already in flight may still complete. Close only listeners you registered, never the library's whole network manager.

**Next**: [Sending and injecting](https://catnies.github.io/sparrow-ui-wiki/network/send-receive.md) — Send packets through a player's connection, or inject a client request.
