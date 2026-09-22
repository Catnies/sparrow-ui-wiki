# Sending and injecting

Source: <https://catnies.github.io/sparrow-ui-wiki/network/send-receive>

> **Info: Optional capability; the API may still change**
>
> The network API grew out of Sparrow UI's own needs and was polished for outside use. It approaches a simplified PacketEvents in capability, with the implementation favoring processing efficiency, but stability is not promised. Prefer the UI APIs for ordinary menu features.

`NetworkManager.user(viewer)` fetches the player's `NetworkUser`. It may return `null` when no matching connection exists; `viewer` in the examples is the target player.

## Sending versus receiving

`sendPacket` pushes data to the client, while `receivePacket` injects a request into the server's inbound flow. Both accept NMS objects and, alternatively, a `PacketType` plus a payload writer.

Below, the client's experience bar temporarily shows half full at level ten. The field order was checked against Minecraft Java 1.21.11, and the server's stored experience is untouched.

```java
NetworkUser user = SparrowUI.getInstance().networkManager().user(viewer);
if (user == null) return;

PacketType experience = new PacketType(
        "minecraft:set_experience", ConnectionState.PLAY, PacketFlow.CLIENTBOUND);
user.sendPacket(experience, payload -> {
    payload.writeFloat(0.5F);
    payload.writeVarInt(10);
    payload.writeVarInt(175);
});
```

The library writes the current version's packet ID; the callback only appends the payload. It runs synchronously on the calling thread, so do not keep the buffer; actual forwarding goes through the connection's Netty event loop, and returning from the method does not mean the client has processed it.

Injecting a client request uses a `SERVERBOUND` type. For example, continuing with `user` above, inject a request selecting the third hotbar slot:

```java
PacketType heldSlot = new PacketType(
        "minecraft:set_carried_item", ConnectionState.PLAY, PacketFlow.SERVERBOUND);
user.receivePacket(heldSlot, payload -> payload.writeShort(2));
```

This passes through the matching inbound listeners and vanilla processing; it does not mean the player actually operated the client. The caller must ensure the packet fits the connection's current phase and adapt field formats.

## Other entry points

| Data form | To the client | Into the server |
| - | - | - |
| NMS packet object | `sendPacket(packet)` | `receivePacket(packet)` |
| Packet type plus payload writer | `sendPacket(type, writer)` | `receivePacket(type, writer)` |
| Already encoded `ByteBuf` | `sendByteBuf(frame)` | `receiveByteBuf(frame)` |

Raw frames must contain "VarInt packet ID + payload", with no length, compression, or encryption headers. Once the framework takes over, do not use or release the buffer. Ordinary usage fits the typed entry points better, since the library allocates buffers and writes the ID.

`PacketBuf` wraps a Netty `ByteBuf`, adding `readVarInt` / `writeVarInt`, VarLong, UUID, UTF string, and other helpers. It shares data, pointers, and reference counts with the original buffer; it is not an independent copy.

Every send and receive entry point has a `Silently` variant, such as `sendPacketSilently` and `receiveByteBufSilently`. These skip Sparrow's listeners in the matching direction during synchronous propagation only, including the built-in state listeners; they neither skip third-party plugins nor preserve silence across deferred forwarding. Do not use them to bypass protocol phase switching.

When coexisting with other packet libraries or moving between Minecraft versions, verify in your actual environment. A shared logical packet name guarantees neither identical field layouts nor identical third-party handler behavior.

**Next**: [Object lifecycle and subscriptions (optional)](https://catnies.github.io/sparrow-ui-wiki/advanced/lifecycle.md) — How objects, observers, and subscriptions are released when work ends.
