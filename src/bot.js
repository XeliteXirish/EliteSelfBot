const Discord = require('discord.js');
const fs = require('fs');
const nodemon = require('nodemon');
const chalk = require('chalk');
const didYouMean = require('didyoumean2');
const AutoUpdater = require('auto-updater');
const simpleGit = require('simple-git')( __dirname + "/../");

const bot = exports.client = new Discord.Client();
const config = bot.config = require('./config.json');
const botSettings = bot.botSettings = require('./botSettings.json');
const utils = require('./utils');

const commands = bot.commands = {};
const needsSetup = bot.setupPlugins = [];

const autoUpdater = new AutoUpdater({
    pathToJson: 'package.json',
    autoupdate: true,
    checkgit: true,
    jsonhost: 'https://raw.githubusercontent.com/XeliteXirish/EliteSelfBot/1.2.1/package.json',
    contenthost: 'http://url.shaunoneill.com/eliteselfbot',
    progressDebounce: 0,
    devmode: false
})

const db = bot.db = require('sqlite');
db.open('./selfbot.sqlite');

bot.on('ready', () => {

    console.log(`EliteSelfBot: Connected to ${bot.guilds.size} servers, for a total of ${bot.channels.size} channels and ${bot.users.size} users.`);

    delete bot.user.email;
    delete bot.user.verified;

    loadPlugins();

    console.log(chalk.green('\u2713') + ' Bot loaded');

    setInterval(function () {
        console.log("Automatically checking for updates!")
        updateBot().catch((err) => {
            console.error("Error while updating bot, please submit an error report, Error: " + err.stack);
        });
    }, 43200000)

    needsSetup.forEach((plugin) => {
        if (typeof plugin.setup === 'function'){
            plugin.setup(bot);
        }
    })
});

bot.on('message', msg => {
    if (msg.isMentioned(bot.user.id)){
        console.log(`[MENTION] ${msg.author.username} (${msg.author.id}) on ${msg.guild.name}/${msg.channel.name}:\n${msg.content}`);
    }

    if (msg.author.id !== bot.user.id) {
        if (msg.isMentioned(bot.user.id) && bot.afk) msg.reply(`${bot.user.username} is \u200bAFK`).then(m => m.delete(5000));
        return;
    }
    if (!msg.content.endsWith('is \u200bAFK') && bot.afk) bot.afk = false;
    if (!msg.content.startsWith(config.prefix)) return;

    let command = msg.content.split(' ')[0].substr(config.prefix.length);
    const args = msg.content.split(' ').splice(1);

    if (commands[command]) {
        msg.editEmbed = (embed) => {
            msg.edit('', {embed});
        };

        try {
            commands[command].run(bot, msg, args);
        } catch (e) {
            msg.edit(msg.author + `Error while executing command\n${e}`).then(m => m.delete(5000));
            console.error(e);
        }

    }else if (command == 'reload') {
        loadPlugins();

        msg.edit('', {
            embed: utils.embed('Reload', `Successfully reloaded all the plugins!`)
        }).then(m => m.delete(10000));

    }else if (command == 'update'){
        msg.edit(":arrows_counterclockwise: Checking for an update..");


        // Start checking
        autoUpdater.fire('check')

            /*.then(() => {
            msg.edit(':white_check_mark: Successfully updated EliteSelfBot!').then(m => m.delete(2000));
        }).catch((err) => {
            msg.edit(':no_entry_sign: Error occurred while trying to update!').then(m => m.delete(2000));
        });;*/

    } else {
        var maybe = didYouMean(command, Object.keys(commands), {
            threshold: 5,
            thresholdType: 'edit-distance'
        });

        if (maybe) {
            msg.edit(`:question: Did you mean \`${config.prefix}${maybe}\`?`).then(m => m.delete(5000));

        } else {
            msg.edit(`:no_entry_sign: No commands were found that were similar to \`${config.prefix}${command}\``).then(m => m.delete(5000));
        }
    }
});

bot.login(config.botToken);

process.on('uncaughtException', (err) => {
    let errorMsg = err.stack.replace(new RegExp(`${__dirname}\/`, 'g'), './');
    console.error("Uncaught Exception" + errorMsg);
});

process.on('unhandledRejection', err => {
    console.error('Uncaught Promise Error: \n' + err.stack);
});

function loadPlugins() {
    fs.readdirSync(__dirname + '/commands/').forEach(file => {
        if (file.startsWith('_') || !file.endsWith('.js')) return;
        var command = require(`./commands/${file}`);
        if (typeof command.run !== 'function' || typeof command.info !== 'object' || typeof command.info.name !== 'string') {
            console.log(`Invalid command file: ${file}`);
            return;
        }
        commands[command.info.name] = command;

        if (typeof command.setup === 'function'){
            needsSetup.push(command);
        }
    });
}

autoUpdater.on('git-clone', function() {
    console.log("You have a clone of the repository. Use 'git pull' to be up-to-date");
});
autoUpdater.on('check.up-to-date', function(v) {
    console.info("You have the latest version: " + v);
});
autoUpdater.on('check.out-dated', function(v_old, v) {
    console.warn("Your version is outdated. " + v_old + " of " + v);
    autoUpdater.fire('download-update');
});
autoUpdater.on('update.downloaded', function() {
    console.log("Update downloaded and ready for install");
});
autoUpdater.on('update.not-installed', function() {
    console.log("The Update was already in your folder! It's read for install");
});
autoUpdater.on('update.extracted', function() {
    console.log("Update extracted successfully!");
    console.warn("RESTART THE APP!");
});
autoUpdater.on('download.error', function(err) {
    console.error("Error when downloading: " + err);
});
autoUpdater.on('end', function() {
    console.log("The app is ready to function");
});
autoUpdater.on('error', function(name, e) {
    console.error(name, e);
});

// Start checking
autoUpdater.fire('check');


