"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config = require("./.config/default.json");
const package_information = require("./package.json");
const chalk_1 = __importDefault(require("chalk"));
const discord_js_1 = require("discord.js");
// Constants
const token = process.env.ACCESS_TOKEN || config.token || '';
const bot = new discord_js_1.Client({ intents: [discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.GuildPresences] });
const commands = [{
        name: 'version',
        description: 'Outputs the current bot version'
    }];
const rest = new discord_js_1.REST({ version: '9' }).setToken(token);
bot.on("clientReady", async () => {
    if (!bot.isReady())
        return;
    try {
        //console.log('Started refreshing application (/) commands.');
        await rest.put(discord_js_1.Routes.applicationCommands(bot.user.id), { body: commands });
        //console.log('Successfully reloaded application (/) commands.');
    }
    catch (error) {
        console.error(error);
    }
    console.log("Bot ONLINE!");
    console.log("Listening for Presence Changes...");
    console.log("----------");
    console.log((0, chalk_1.default) `REVIEW your Security Settings::
* The bot will {redBright.bold ${!config.createRoles ? "NOT " : ""}}create Game-Roles, if they don't exist already.`);
    if (config.ignoreUnverifiedActivities)
        console.log((0, chalk_1.default) `* The bot will ignore all activities that are not {blueBright.bold verified}.`);
    else
        console.log((0, chalk_1.default) `* The bot will process all activities, regardless of wether they're {blueBright.bold verified}.
{red [WARNING]} this might allow members to get/create {redBright infinite/arbritrary} roles using the {yellow.bold "ACTIVITY SETTINGS > ACTIVITY STATUS"} Options in the discord settings`);
    if (config.ignoreUnverifiedActivities && config.createRoles)
        console.log((0, chalk_1.default) `* These are the {green recommended} settings.`);
    console.log("----------\n Make sure critical roles that can grant access to sensitive content/moderator power are above the bot" + (config.ignoreUnverifiedActivities ? " or have a name that doesnt match any verified game (e.g. random suffix)" : "."));
    console.log("----------");
});
bot.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand())
        return;
    if (interaction.commandName === 'version') {
        try {
            await interaction.reply(`${package_information.name}@*${package_information.version}* written by <@498449812316880910>`);
        }
        catch (err) {
            console.error("Error replying to /version command: ", err);
        }
    }
});
bot.on("presenceUpdate", async (prev, now) => {
    try {
        await handlePresenceUpdate(prev, now);
    }
    catch (err) {
        console.error("Error handling presenceUpdate:", err);
    }
});
bot.login(token).catch((reason) => {
    console.log((0, chalk_1.default) `{redBright [LOGIN-ERROR]} Code: {grey ${reason.code}}`);
    if (reason.code == "DISALLOWED_INTENTS") {
        console.log((0, chalk_1.default) `--------------------
Please go to {blueBright https://discord.com/developers/applications/},
click your app, click {bold.yellow 'Bot'} and make sure that {bold.yellow 'Presence Intent'} is enabled
You can find it under the Section {bold.yellow 'Privileged Gateway Intents'}  

You'll have to apply for bot verification if you plan to serve more than 100 servers.`);
    }
    if (reason.code == "TOKEN_INVALID") {
        console.log((0, chalk_1.default) `--------------------
Please provide a {bold login-token} for your bot.

To obtain one, go to {blueBright https://discord.com/developers/applications/},
Click {bold.bgBlue.white 'New Application'}, give it a name and hit {bold.bgGreen.white 'Create'}.
Navigate to {bold "Bot"} in the siedebar, than click {bold.bgBlue.white 'Add Bot'} and confirm.
Then find the section {bold 'Token'} and click {bold.bgBlue.white 'Copy'}.

Finally, paste it into {blueBright ./config.json} or set it as Enviroment Variable "{bold ACCESS_TOKEN}"`);
    }
}); //config.token
async function handlePresenceUpdate(previous_presence, current_presence) {
    let username;
    let nickname;
    let guildname;
    if (current_presence.member) {
        username = current_presence.member.user.username;
        nickname = current_presence.member.displayName;
        guildname = current_presence.member.guild.name;
    }
    else {
        return; // Bot is only interested in presenceUpdates originating within guilds
    }
    console.log((0, chalk_1.default) `{blueBright ${nickname}} (@${username}) is now playing {yellow ${current_presence.activities.map((activity) => activity.name)}} {grey (${current_presence.activities.length})} {grey [${guildname}]} `);
    var prev_activities = [];
    var prev_activity_names = [];
    if (previous_presence) {
        var prev_activities = config.ignoreUnverifiedActivities ? previous_presence.activities.filter(act => act.applicationId != null) : previous_presence.activities;
        var prev_activity_names = prev_activities.map(act => act.name);
    }
    var current_activities = config.ignoreUnverifiedActivities ? // Filter for verified activities, if desired.
        current_presence.activities.filter(act => act.applicationId != null)
        : current_presence.activities;
    var current_activity_names = current_activities.map(act => act.name);
    // Add roles for new activities
    for (var i = 0; i < current_activity_names.length; i++) {
        var a = current_activity_names[i];
        try {
            var role = await pickRole(current_presence.member.guild, a);
        }
        catch (err) {
            console.error(`Failed to determine role for activityname ${a}, due to error:`, err);
            continue;
        }
        if (role == null)
            continue;
        try {
            current_presence.member.roles.add(role, "Started Playing Game");
        }
        catch (err) {
            console.error(`Failed to assign role ${role.guild.name}/${role.name} (${role.id}) to ${nickname} @${username}:`, err);
        }
    }
    //remove roles for ended activities
    for (var i = 0; i < prev_activity_names.length; i++) {
        var a = prev_activity_names[i];
        if (!current_activity_names.includes(a)) {
            try {
                var role = await pickRole(current_presence.member.guild, a, false);
            }
            catch (err) {
                console.error(`Failed to determine role for activityname ${a}, due to error:`, err);
                continue;
            }
            if (role == null)
                continue;
            try {
                current_presence.member.roles.remove(role, "Stopped Playing Game");
            }
            catch (err) {
                console.error(`Failed to remove role ${role.guild.name}/${role.name} (${role.id}) from ${nickname} @${username}:`, err);
            }
        }
    }
    //console.log(chalk.red("   -> member is more priviledged than bot -> cant assign role"))
}
//FUNCTIONS
/**
 *
 * @param {discord.Guild} guild
 * @param {*} name
 * @returns
 */
async function pickRole(guild, name, is_assigning = true) {
    //console.log("pick role for "+name)
    //role to be created 
    var desiredRolename = config.alias[name] || name;
    await guild.roles.fetch();
    var role = guild.roles.cache.find(x => {
        return x.name === desiredRolename && x.editable; //find role by name
    });
    if (role == null) { // create role
        if (!config.createRoles) {
            console.log((0, chalk_1.default) `  {yellow / role} "${desiredRolename}" {grey (Moderator must create this role first - security setting)}`);
            return null;
        }
        ;
        console.log(chalk_1.default.grey(`   -> creating role "${desiredRolename}"`));
        role = await guild.roles.create({
            name: desiredRolename,
            colors: { primaryColor: 'Random' },
            reason: "Game Activity Detected"
        });
    }
    else {
        if (is_assigning)
            console.log((0, chalk_1.default) `   {greenBright + role} {grey "${desiredRolename}"}`);
        else
            console.log((0, chalk_1.default) `   {red - role} {grey "${desiredRolename}"}`);
    }
    return role;
}
//bot invite
//permissions :285215744
//https://discordapp.com/oauth2/authorize?client_id=698215134438621206&scope=bot&permissions=285215744
