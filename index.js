const config = require("./config.json");
const package = require("./package.json");

const discord = require("discord.js");  // , discord.Intents.FLAGS.GUILD_BANS, discord.Intents.FLAGS.GUILD_MEMBERS, 
const chalk = require("chalk");
const bot = new discord.Client({ intents: [discord.Intents.FLAGS.GUILDS, discord.Intents.FLAGS.GUILD_PRESENCES]});

const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const token = process.env.ACCESS_TOKEN || config.token;

const commands = [{
  name: 'version',
  description: 'Outputs the current bot version'
}]; 

const rest = new REST({ version: '9' }).setToken(token);



bot.on("ready", async () => {
    try {
        //console.log('Started refreshing application (/) commands.');
    
        await rest.put(
        Routes.applicationCommands(bot.user.id),
        { body: commands },
        );
    
        //console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }

    console.log("Bot ONLINE!");
    console.log("Listening for Presence Changes...")
    console.log("----------")
    console.log(
chalk`REVIEW your Security Settings::
* The bot will {redBright.bold ${!config.createRoles?"NOT":""}} create Game-Roles, if they don't exist already.`);
if (config.ignoreUnverifiedActivities)
console.log(
chalk`* The bot will ignore all activities that are not {blueBright.bold verified}.`);
else 
console.log(
chalk`* The bot will process all activities, regardless of wether they're {blueBright.bold verified}.
{red [WARNING]} this might allow members to get/create {redBright infinite/arbritrary} roles using the {yellow.bold "ACTIVITY SETTINGS > ACTIVITY STATUS"} Options in the discord settings`);
if(config.ignoreUnverifiedActivities && config.createRoles)
console.log(chalk`* These are the {green recommended} settings.`)
console.log("----------\n Make sure critical roles that can grant access to sensitive content/moderator power are above the bot"+(config.ignoreUnverifiedActivities?" or have a name that doesnt match any verified game (e.g. random suffix)":"."));
console.log("----------")
});

bot.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'version') {
        await interaction.reply(`${package.name}@*${package.version}* written by <@498449812316880910>`);
    }
})

bot.on("presenceUpdate", async (prev, now) => {
    console.log(chalk`{blueBright ${now.user.username+"#"+now.user.discriminator}} is now playing {yellow ${now.activities.map((activity) => activity.name)}} {grey (${now.activities.length})} {grey [${now.member.guild.name}]} `)

    if(now.member.manageable) {
        if(prev) {
            var prevAct = config.ignoreUnverifiedActivities ? prev.activities.filter(act => act.applicationId != null) : prev.activities;
            var prevName= prevAct.map(act => act.name);
        } else {
            var prevAct = [];
            var prevName = [];
        }
        

        var nowAct = config.ignoreUnverifiedActivities ? now.activities.filter(act => act.applicationId != null) : now.activities;
        var nowName= nowAct.map(act => act.name);

        //add roles for new activities
        for (var i = 0; i < nowName.length; i++) {
            var a = nowName[i];
            var role = await pickRole(now.member.guild, a);
            if (role == null) continue;
            now.member.roles.add(role , "Started Playing Game"); 
        }

        //remove roles for ended activities
        for (var i = 0; i < prevName.length; i++) {
            var a = prevName[i];
            if(!nowName.includes(a)) {
                var role = await pickRole(now.member.guild, a, false);
                if (role == null) continue;
                now.member.roles.remove(role , "Stopped Playing Game"); 
            }
        }
    } else {
        console.log(chalk.red("   -> member is more priviledged than bot -> cant assign role"))
    }
});


bot.login(token).catch((reason) => {
    console.log(chalk`{redBright [LOGIN-ERROR]} Code: {grey ${reason.code}}`)
    if (reason.code == "DISALLOWED_INTENTS") {
        console.log(
chalk`--------------------
Please go to {blueBright https://discord.com/developers/applications/},
click your app, click {bold.yellow 'Bot'} and make sure that {bold.yellow 'Presence Intent'} is enabled
You can find it under the Section {bold.yellow 'Privileged Gateway Intents'}  

You'll have to apply for bot verification if you plan to serve more than 100 servers.`);
    }

    if (reason.code == "TOKEN_INVALID") {
        console.log(
chalk`--------------------
Please provide a {bold login-token} for your bot.

To obtain one, go to {blueBright https://discord.com/developers/applications/},
Click {bold.bgBlue.white 'New Application'}, give it a name and hit {bold.bgGreen.white 'Create'}.
Navigate to {bold "Bot"} in the siedebar, than click {bold.bgBlue.white 'Add Bot'} and confirm.
Then find the section {bold 'Token'} and click {bold.bgBlue.white 'Copy'}.

Finally, paste it into {blueBright ./config.json} or set it as Enviroment Variable "{bold ACCESS_TOKEN}"`);
    }
}); //config.token

//FUNCTIONS
/**
 * 
 * @param {discord.Guild} guild 
 * @param {*} name 
 * @returns 
 */
async function pickRole(guild, name, ass=true) {
    //console.log("pick role for "+name)
    //role to be created 
    var desiredRolename = config.alias[name] || name;

    await guild.roles.fetch();
    var role = guild.roles.cache.find(x => {
        return x.name === desiredRolename && x.editable; //find role by name
    });

    if (role == null) { // create role
        if(!config.createRoles) { 
            console.log(chalk`  {yellow / role} "${desiredRolename}" {grey (Moderator must create this role first - security setting)}`)
            return null
        };
        console.log(chalk.grey(`   -> creating role "${desiredRolename}"`));
        role = await guild.roles.create({
            name: desiredRolename,
            color: 'DEFAULT',
            reason: "Game Activity Detected"
        });
    } else {
        if (ass) console.log(chalk`   {greenBright + role} {grey "${desiredRolename}"}`);
        else console.log(chalk`   {red - role} {grey "${desiredRolename}"}`);
    }

    return role;
}

//bot invite
//permissions :285215744
//https://discordapp.com/oauth2/authorize?client_id=698215134438621206&scope=bot&permissions=285215744