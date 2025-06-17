require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, entersState, VoiceConnectionStatus } = require('@discordjs/voice');
const play = require('play-dl');

const TOKEN = process.env.TOKEN;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

client.once('ready', () => {
    console.log(`✅ Bot conectado como ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!play')) return;

    const args = message.content.slice(5).trim();
    if (!args) return message.reply('❌ Debes escribir el nombre o URL de la canción.');
    if (!message.member.voice?.channel) return message.reply('🔊 Debes estar en un canal de voz.');

    try {
        let video_url;
        if (play.yt_validate(args) === 'video') {
            video_url = args;
        } else {
            const results = await play.search(args, { limit: 1 });
            if (!results.length) return message.reply('❌ No se encontraron resultados.');
            video_url = results[0].url;
        }

        const stream = await play.stream(video_url);
        const resource = createAudioResource(stream.stream, { inputType: stream.type });

        const connection = joinVoiceChannel({
            channelId: message.member.voice.channel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator
        });

        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
        const player = createAudioPlayer();
        player.play(resource);
        connection.subscribe(player);

        player.on(AudioPlayerStatus.Idle, () => connection.destroy());

        const info = await play.video_info(video_url);
        message.reply(`🎶 Reproduciendo: **${info.video_details.title}**`);
    } catch (err) {
        console.error('❌ Error al reproducir:', err);
        message.reply('⚠️ Ocurrió un error al intentar reproducir la canción.');
    }
});

client.login(TOKEN);
