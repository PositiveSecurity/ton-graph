import "@stdlib/tvm-lowlevel"

// Example of a loop and message sending

fun sendMany(destinations: slice[], value: int) {
    var i = 0;
    while (i < destinations.length()) {
        sendRawMessage(destinations[i], value, 0);
        i = i + 1;
    }
}

@public
fun multiSend(recipients: slice[]) {
    sendMany(recipients, 1);
}

fun sendRawMessage(addr: slice, amount: int, mode: int) {
    var msg = beginCell().storeSlice(addr).endCell();
    sendMessage(msg, amount, mode);
}
