const Discord = require('discord.js');
const { prefix, recommendations, GOOGLE_API_KEY, listToDo } = require('./config.json');
const { MessageEmbed } = require('discord.js');
const simpleYT = require('simple-youtube-api');
const ytdl = require('ytdl-core');
const video = require('ffmpeg/lib/video');
const client = new Discord.Client();
const youtube = new simpleYT(process.env.DJS_GOOGLE_API_KEY);
client.on('ready', () => {
    console.log('Ready!');
});
client.on('reconnecting', () => {
    console.log('Reconnecting!');
});
client.on('disconnect', () => {
    console.log('Disconnect!');
});


//Eventlisteners

client.on('message', async message => {
    if (message.author.bot) return undefined;
    if (!message.content.startsWith(`${prefix}`)) return undefined;
    const args = message.content.split(' ');
    const searchString = args.slice(1).join(' ')
    let url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '' ;
    console.log(url)
    const serverQueue = queue.get(message.guild.id);

    



    if (message.content.startsWith(`${prefix}play `) || message.content.startsWith(`${prefix}p `)) {
        execute(message, url, searchString)
        return
    } else if (message.content.startsWith(`${prefix}skip` ) || message.content.startsWith(`${prefix}next`)) {
        skip(message, serverQueue)
        return
    } else if (message.content.startsWith(`${prefix}stop`)) {
        stop(message, serverQueue)
        return
    } else if (message.content.startsWith(`${prefix}move`)) {
        move(message, serverQueue)
        return
    }
    if (message.content.startsWith(`${prefix}embed`)){
        ExampleEmbed(message)
    }
    if (message.content.startsWith(`${prefix}rec`)){
        message.channel.send(randomRec())
    }
    if (message.content.startsWith(`${prefix}playrec`)) {
        (async ()=>{
            let connection = await message.member.voice.channel.join()
        })()
        url = randomRec()

        execute(message, url, searchString)
        return
    }
    if (message.content.startsWith(`${prefix}queue`) || message.content.startsWith(`${prefix}q`)) {
        message.channel.send(getQueue(serverQueue))
        return
    }
    if (message.content.startsWith(`${prefix}leave`)) {
        const voiceChannel = message.member.voice.channel
        voiceChannel.leave()
        message.channel.send('aight')
        return
    }
    if (message.content.startsWith(`${prefix}join`)) {
        const voiceChannel = message.member.voice.channel
        voiceChannel.join()
        message.channel.send('aight')
        return
    }
    if (message.content.startsWith(`${prefix}help`))  {
        helpEmbed(message)
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
    if (message.content.startsWith(`${prefix}list`)) {
        message.channel.send(listToDo)
    }
});

const queue = new Map();

//Function to add a song

async function execute(message, url, searchString) {
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

    if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)/)) {
        const playlist = await youtube.getPlaylist(url)
        const videos = await playlist.getVideos()
        message.channel.send(`Playlist: **${playlist.title}** ha sido añadida a la cola :D`)
        for(const video of Object.values(videos)) {
            const video2 = await youtube.getVideoByID(video.id)
            await handleVideo(video2, message, voiceChannel, true)
        }
        return undefined;
    } else {
        try {
            var video = await youtube.getVideo(url);
        } catch (error) {
            try {
                var videos = await youtube.searchVideos(searchString, 1)
                var video = await youtube.getVideoByID(videos[0].id)
            } catch (err) {
                console.log(err);
                return message.channel.send('No he obtenido ningún resultado de busqueda (ﾉ≧ڡ≦) Teehee~!')
            }
        }

        return handleVideo(video, message, voiceChannel);
    }
    return undefined;
    
}

async function handleVideo(video, message, voiceChannel, playlist = false) {
    const serverQueue = queue.get(message.guild.id)
    // const songInfo = await ytdl.getInfo(args[1])
    const song = {
        id: video.id,
        title: video.title,
        url: `https://www.youtube.com/watch?v=${video.id}`
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
        if(playlist) return undefined;
        else message.channel.send(`${song.title} añadida a la lista de reproducción 
(〜￣▽￣)〜	`)
    }
    return undefined;
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

    let queueToView = new MessageEmbed()
    .setColor('#ffd29f')
    .setTitle('Queue')
    .addFields(
        serverQueue.songs.map((element, i)=>{
        if (i == 0) {
            // queueToView.push(`**Now playing:** ${element.title}`)
            return { name: '\u200B', value: `**Now playing:** [${element.title}](${element.url})`}
        } else {
            return { name: '\u200B', value: `**${i}.** [${element.title}](${element.url})`}
        }
    })
    )
    
    return queueToView
}

function randomRec(){
    // const recommendations = ['https://www.youtube.com/watch?v=M7afGQkooYI', 'https://www.youtube.com/watch?v=ySeXuAdt6Kk', 'https://www.youtube.com/watch?v=YiLK0tqhIx0']
    return recommendations[Math.floor(Math.random() * 3)]
}



function ExampleEmbed(message){
    let example = 'coconut'
    // inside a command, event listener, etc.
const exampleEmbed = new MessageEmbed()
.setColor('#0099ff')
.setTitle('Some title')
.setURL('https://discord.js.org/')
.setAuthor({ name: 'Some name', iconURL: 'https://i.imgur.com/AfFp7pu.png', url: 'https://discord.js.org' })
.setDescription('Some description here')
.setThumbnail('https://i.imgur.com/AfFp7pu.png')
.addFields(
    { name: 'Regular field title', value: '\u200B' },
    { name: '\u200B', value: '\u200B' },
    { name: '\u200B', value: `**Now playing:** [${example}](https://i.imgur.com/AfFp7pu.png)`},
    { name: 'Inline field title', value: 'Some value here', inline: true },
)
.addField('Inline field title', 'aaaaaaa', true)
.setImage('https://i.imgur.com/AfFp7pu.png')
.setTimestamp()
.setFooter({ text: 'Some footer text here', iconURL: 'https://i.imgur.com/AfFp7pu.png' });

return message.channel.send(exampleEmbed);
}


function helpEmbed(message){
    console.log();
    const help = new MessageEmbed()
    .setColor('#ffd29f')
    .setTitle('All Commands Available')
    // .setAuthor('Ghosty')
    .setAuthor('Ghosty')
    .setThumbnail('https://i.imgur.com/BnOG8uQ.jpg')
    .addFields(
        { name: `${prefix}help`, value: 'ehh... me imagino que ya sabras lo que hace' },
        { name: `${prefix}play "Song url you want to play"`, value: 'ehh... me imagino que ya sabras lo que hace' },
        { name: `${prefix}stop`, value: 'paro la cancion, limpio la queue y me piro del vc' },
        { name: `${prefix}skip`, value: 'siguiente' },
        { name: `${prefix}rec`, value: 'Recomendacion de la casa :wink:' },
        { name: `${prefix}playrec`, value: 'Reproduzco la recomendacion de la casa' },
        { name: `${prefix}queue`, value: 'queue... ig?' },
        { name: `${prefix}???`, value: '3 secret commands xp' },
        { name: '\u200B', value: '\u200B' },
        {name: 'Commands in beta testing', value: '( DO NOT USE )'},
        { name: '\u200B', value: '\u200B' },
        { name: `${prefix}volume "1 - 7.5"`, value: 'change volume' },
        { name: `${prefix}move`, value: 'move a song from a position to another' }
    )


    return message.channel.send(help)
}




// 


client.login(process.env.DJS_TOKEN);