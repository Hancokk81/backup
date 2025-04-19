/*
     Created : Biyu Official
     Base : Rizky Official
     Contact Creator : 6285776461481
*/

require("./setting");
const { default: makeWASocket, DisconnectReason, makeInMemoryStore, jidDecode, useMultiFileAuthState, proto, downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { resolve } = require("path");
const Boom = require("@hapi/boom");
const Pino = require("pino");
const chalk = require("chalk");
const fileType = require('file-type');
const readline = require("readline");
const { getBuffer, smsg, sessionss} = require("./lib/function");
const fs = require("fs");
const dbFile = './database/database.json';

if (fs.existsSync(dbFile)) {
    global.db = JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
} else {
    global.db = { groups: {} }; 
}
function saveDatabase() {
    fs.writeFileSync(dbFile, JSON.stringify(global.db, null, 2));
}
setInterval(saveDatabase, 10000);

usePairingCode = true; // Apakah Anda Ingin Menggunakan Pairing Code? True = Menggunakan, False = Tidak.

//============================//
const question = (text) => {
    const rl = readline.createInterface({
        input: process.stdin, 
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question(text, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

//===========================//
const store = makeInMemoryStore({ logger: Pino().child({ level: 'silent', stream: 'store' }) });

//============================//
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(`${global.session}`);
    
    const biyu = makeWASocket({
        logger: Pino({ level: "silent" }),
        printQRInTerminal: !usePairingCode,
        auth: state,
        version: [2, 3000, 1015901307],
        browser: ["Ubuntu", "Chrome", "20.0.0"]
    });

    store.bind(biyu.ev);
    biyu.public = false;
    global.biyuu = "NeoXloud" 
    if (usePairingCode && !biyu.authState.creds.registered) {
        const correctAnswer = `${global.biyuu}`;
        let attempts = 0;
        let maxAttempts = 3;
        let verified = false;

        while (attempts < maxAttempts && !verified) {
            const answer = await question(chalk.yellow.bold('Send Password : \n'));
            if (answer.toLowerCase() === correctAnswer) {
                verified = true;
                console.log(chalk.green.bold('Password benar! Silahkan lanjutkan.'));
            } else {
                attempts++;
                if (attempts < maxAttempts) {
                    console.log(chalk.red.bold(`Password salah! Kesempatan tersisa: ${maxAttempts - attempts}`));
                } else {
                    console.log(chalk.red.bold('Password salah! Kesempatan habis.'));
                    return;
                }
            }
        }
    }
if (!biyu.authState.creds.registered) {
    console.log(chalk.blue("🔒 Proses Pairing Dimulai..."));
    const phoneNumber = await question(chalk.yellow('📱 Masukkan nomor Anda:\n> '));
    const customPairingCode = "NEOXLOUD"; 
    console.log(chalk.green("⏳ Menghasilkan kode pairing, harap tunggu..."));
    try {
        const code = await biyu.requestPairingCode(phoneNumber.trim(), customPairingCode);
        console.log(chalk.red.bold(`✅ Kode Pairing Anda: ${code}`));
    } catch (error) {
        console.log(chalk.red("❌ Gagal mendapatkan kode pairing. Coba lagi nanti."));
    }
}
biyu.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
        console.log(chalk.green('Bot connected!'));
        try {
       
            await sessionss(biyu); 
            console.log(chalk.green('Session initialized successfully'));
        } catch (error) {
            console.log(chalk.red('Error initializing session:', error.message));
        }
    } else if (connection === 'close') {
        const reason = lastDisconnect?.error?.output.statusCode;
        console.log(lastDisconnect.error);
        if (reason === DisconnectReason.badSession) {
            console.warn(`Sesi buruk, hapus session dan scan ulang.`);
            process.exit();
        } else if (reason === DisconnectReason.connectionClosed) {
            console.warn('Koneksi ditutup, mencoba menyambung ulang...');
            process.exit();
        } else if (reason === DisconnectReason.connectionLost) {
            console.warn('Koneksi hilang, mencoba menyambung ulang...');
            process.exit();
        } else if (reason === DisconnectReason.connectionReplaced) {
            console.warn('Sesi tergantikan, logout...');
            biyu.logout();
        } else if (reason === DisconnectReason.loggedOut) {
            console.warn('Perangkat keluar, silakan scan ulang.');
            biyu.logout();
        } else if (reason === DisconnectReason.restartRequired) {
            console.warn('Diperlukan restart, merestart...');
            await startBot();
        } else if (reason === DisconnectReason.timedOut) {
            console.warn('Koneksi timeout, mencoba menyambung ulang...');
            startBot();
        }
    } else if (connection === "connecting") {
        console.warn('Menyambungkan ulang...');
    }
});

    biyu.ev.on('contacts.update', update => {
        for (let contact of update) {
            let id = biyu.decodeJid(contact.id);
            if (store && store.contacts) store.contacts[id] = { id, name: contact.notify };
        }
    });

    biyu.downloadMediaMessage = async (message) => {
        let mime = (message.msg || message).mimetype || '';
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
        const stream = await downloadContentFromMessage(message, messageType);
        
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
    };

    biyu.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {};
            return decode.user && decode.server ? decode.user + '@' + decode.server : jid;
        }
        return jid;
    };

biyu.store = { messages: {} }; 
biyu.ev.on('messages.upsert', async chatUpdate => {
    try {
        let mek = chatUpdate.messages[0];
        if (!mek.message) return;
        mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;
        if (mek.key && mek.key.remoteJid === 'status@broadcast') return;
        if (!biyu.public && !mek.key.fromMe && chatUpdate.type === 'notify') return;
        let m = smsg(biyu, mek, store);
        require("./system/biyu")(biyu, m, chatUpdate, mek, store);
        if (!mek.key.remoteJid) return;
        if (!biyu.store.messages[mek.key.remoteJid]) biyu.store.messages[mek.key.remoteJid] = [];
        if (mek.key.fromMe) {
            biyu.store.messages[mek.key.remoteJid].push(mek);
        }
    } catch (err) {
        console.error(err);
    }
});

biyu.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
  const quoted = message.msg || message;
  const mime = quoted.mimetype || '';
  const messageType = (message.mtype || mime.split('/')[0]).replace(/Message/gi, '');
  const stream = await downloadContentFromMessage(quoted, messageType);
  let buffer = Buffer.from([]);
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }
  const type = await fileType.fromBuffer(buffer); 
  if (!type) throw new Error('Gagal mendeteksi tipe file.');
  const trueFileName = attachExtension ? 
    `./database/sampah/${filename ? filename : Date.now()}.${type.ext}` : 
    filename;
  await fs.promises.writeFile(trueFileName, buffer);
  return trueFileName;
};

biyu.ev.on('group-participants.update', async (update) => {
    if (!global.db.groups) global.db.groups = {}; 
    if (update.action === 'add') {
        if (!global.db.groups[update.id]) {
            global.db.groups[update.id] = { blacklistjpm: false };
            saveDatabase(); 
        }
    } else if (update.action === 'remove') {
        delete global.db.groups[update.id];
        saveDatabase();
    }
});

    biyu.ev.on("creds.update", saveCreds);
}

startBot();

let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(`Update ${__filename}`);
    delete require.cache[file];
    require(file);
});
