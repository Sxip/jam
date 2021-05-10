const { pluginManager, server } = window.opener.core
const zlib = require('zlib');

let interval

const speed = document.getElementById('speed')
const color = document.getElementById('color')
const item = document.getElementById('item')
const startButton = document.getElementById('start')
const stopButton = document.getElementById('stop')

function* parsePacket(packet) {
  const xtArgs = packet;
  const b64d = Buffer.from(xtArgs[4], 'base64'); // _loc9
  const zd = zlib.inflateSync(b64d); // _loc9

  const argCount = zd.readUInt16BE(); // _loc3
  let argCounter = 0; // _loc10;
  let bufOffset = 2; // +2 since we did readUInt16BE

  while (argCounter < argCount) {
    const args = []; // _loc4

    let argLen = zd.readUInt16BE(bufOffset); // _loc2
    bufOffset += 2;

    const strLen = zd.readUInt16BE(bufOffset); // _loc9;
    bufOffset += 2;
    const str = zd.toString('utf8', bufOffset, bufOffset + strLen); // _loc9
    bufOffset += strLen;

    args.push(str);
    argLen -= 1;

    let argCounter1 = 0; // _loc11
    while (argCounter1 < argLen) {
      const strLen = zd.readUInt16BE(bufOffset); // _loc9;
      bufOffset += 2;
      const str = zd.toString('utf8', bufOffset, bufOffset + strLen); // _loc9
      bufOffset += strLen;
      args.push(str);

      argCounter1++;
    }

    yield args;

    argCounter++;
  }
}



function start() {
  stopButton.disabled = false
  startButton.disabled = true

  interval = setInterval(async () => {
    await server.session.remoteWrite('%xt%o%qj%11234%coral_canyons.room_main#53%51%0%0%')
    await server.session.remoteWrite('%xt%o%qpup%1%epickey%447029%')
    await server.session.remoteWrite('%xt%o%qaskr%1%npc1a%0%1%')
    return server.session.remoteWrite('%xt%o%qat%1%etreasure%0%')
  }, speed.value || 6100)
}

function stop() {
  stopButton.disabled = false
  startButton.disabled = false

  if (interval) clearInterval(interval)
}

function onPacket(packet) {
  const type = packet[0]

  if (type === 'qpgiftplr') {
    const itemId = String(packet[7])
    const colorId = String(packet[8])

    if (itemId === String(item.value) && colorId === String(color.value)) {
      stop()
      collect()
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function collect() {
  await sleep(300000)
  await server.session.remoteWrite(`%xt%o%qpgiftplr%1%1%0%0%`)
  start()
}

pluginManager.hooks.hookPacket({
  type: 'remote',
  packet: 'qqm',
  execute: ({ packet }) => {
    const all = Array.from(parsePacket(packet.value))
    for (const args of all) onPacket(args)
  }
})
