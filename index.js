const Discord = require('discord.js');
const {
    prefix,
    TOKEN
} = require('./config.json');
const ytdl = require('ytdl-core');
const client = new Discord.Client();

client.on('ready', () => {
    console.log('Ready!');
});
client.on('reconnecting', () => {
    console.log('Reconnecting!');
});
client.on('disconnect', () => {
    console.log('Disconnect!');
});

let backticks = "```"
let help = `
${prefix}help => ehh... me imagino que ya sabras lo que hace

${prefix}play "Song url you want to play" => reproduzco una cancion o la añado a la queue

${prefix}stop => paro la cancion, limpio la queue y me piro del vc

${prefix}skip => siguiente

${prefix}rec => Recomendacion de la casa :wink:

${prefix}playrec => Reproduzco la recomendacion de la casa

${prefix}queue

testing: ${prefix}volume "1-7.5"

testing: ${prefix}move (*/ DO NOT USE /*)
`

//Eventlisteners

client.on('message', async message => {
    if (!message.content.startsWith(prefix)) return;
    const serverQueue = queue.get(message.guild.id);

    if (message.content.startsWith(`${prefix}play ` || `${prefix}p `)) {
        execute(message, serverQueue)
        return
    } else if (message.content.startsWith(`${prefix}skip`)) {
        skip(message, serverQueue)
        return
    } else if (message.content.startsWith(`${prefix}stop`)) {
        stop(message, serverQueue)
        return
    } else if (message.content.startsWith(`${prefix}move`)) {
        move(message, serverQueue)
        return
    }
    if (message.content.startsWith(`${prefix}rec`)){
        message.channel.send(randomRec())
    }
    if (message.content.startsWith(`${prefix}playrec`)) {
        (async ()=>{
            let connection = await message.member.voice.channel.join()
        })()
        message.channel.send(`?play ${randomRec()}`)
        return
    }
    if (message.content.startsWith(`${prefix}queue`)) {
        message.channel.send(getQueue(serverQueue))
        return
    }
    if (message.content.startsWith(`${prefix}help`))  {
        message.channel.send(`${backticks + help + backticks}`);
    }
    if (message.content.startsWith(`${prefix}server`)) {
        message.channel.send(message.guild.id);
    }
    if (message.content.startsWith(`${prefix}camalardo`)) {
        message.channel.send("https://i.imgur.com/twFOqNw.jpg");
    }
    if (message.content.startsWith(`${prefix}calamardo`)) {
        message.channel.send("https://i.pinimg.com/550x/5c/35/19/5c35191fc79090f966fe0e017cfac491.jpg");
    }
});

const queue = new Map();

//Function to add a song

async function execute(message, serverQueue) {
    const args = message.content.split(" ")
    const voiceChannel = message.member.voice.channel
    if(!voiceChannel) 
        return message.channel.send(
            'bro, metete a un vc'
        )
    const permissions = voiceChannel.permissionsFor(message.client.user)
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send('no tengo los permisos necesarios! ｡ﾟ･(>﹏<)･ﾟ｡')
    }

    const songInfo = await ytdl.getInfo(args[1])
    const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url
    }
    if (!serverQueue) {
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true
        }
        queue.set(message.guild.id, queueContruct)
        queueContruct.songs.push(song)

        try {
            let connection = await voiceChannel.join()
            queueContruct.connection = connection
            play(message.guild, queueContruct.songs[0])
        } catch (err) {
            console.log(err);
            queue.delete(message.guild.id)
            return message.channel.send(err)
        }
    } else {
        serverQueue.songs.push(song)
        console.log(serverQueue.songs);
        return message.channel.send(`${song.title} añadida a la lista de reproducción 
(〜￣▽￣)〜	`)
    }
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id)
    if (!song) {
        serverQueue.voiceChannel.leave()
        queue.delete(guild.id)
        return
    }
    const dispatcher = serverQueue.connection
        .play(ytdl(song.url))
        .on("finish", () => {
            serverQueue.songs.shift()
            play(guild , serverQueue.songs[0])
        })
        .on("error", error => console.error(error))
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5)
    serverQueue.textChannel.send(`**Playing:** "${song.title}" **( ˘ ɜ˘) ♬♪♫**`)
}

function skip(message, serverQueue) {
    if (!message.member.voice.channel)
    return message.channel.send(
        'bro, metete a un vc'
    )
    if (!serverQueue)
    return message.channel.send("No hay nada que skipear, Skipper")
    serverQueue.connection.dispatcher.end()
}

function stop(message, serverQueue){
    if (!message.member.voice.channel)
    return message.channel.send(
        'bro, metete a un vc'
    )
    if (!serverQueue)
    return message.channel.send("?????")
    serverQueue.songs = []
    serverQueue.connection.dispatcher.end()
}

function move(message, serverQueue){
    if (!message.member.voice.channel)
    return message.channel.send(
        'bro, metete a un vc'
    )
    if (!serverQueue)
    return message.channel.send("No hay nada que mover ヾ(`ヘ´)ﾉﾞ")
    const args = message.content.split(" ")
    let positionOfSong = args[1]
    let positionToMove = args[2]
    if(!positionToMove || !positionOfSong) return message.channel.send('Escribe bien cazurro')
    if(serverQueue) return message.channel.send(serverQueue.songs)
    moveSong(serverQueue.songs, positionOfSong, positionToMove)
    console.log(serverQueue.songs)
}

function moveSong(serverQueue, positionOfSong, positionToMove){
    if (positionToMove >= serverQueue.length) {
        message.channel.send('Escribe bien cazurro')
    }
    serverQueue.splice(positionToMove, 0, serverQueue.splice(positionOfSong, 1)[0]);
    return serverQueue
}

function getQueue(serverQueue){
    if(!serverQueue)
    return "No hay nada en la queue (￣▽￣*)ゞ"

    let queueToView = []
    serverQueue.songs.map((element, i)=>{
        if (i == 0) {
            queueToView.push(`**Now playing:** ${element.title}`)
            return
        }
        queueToView.push(`${i}. ${element.title}`)
    })
    return queueToView
}

function randomRec(){
    const recommendations = ['https://www.youtube.com/watch?v=M7afGQkooYI', 'https://www.youtube.com/watch?v=ySeXuAdt6Kk', 'https://www.youtube.com/watch?v=YiLK0tqhIx0']
    return recommendations[Math.floor(Math.random() * 3)]
}



client.login(TOKEN);