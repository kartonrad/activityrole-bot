const config = require("./config.json");

const discord = require("discord.js");
const bot = new discord.Client({ intents: [discord.Intents.FLAGS.GUILDS, discord.Intents.FLAGS.GUILD_BANS, discord.Intents.FLAGS.GUILD_MEMBERS, discord.Intents.FLAGS.GUILD_PRESENCES]});

bot.on("ready", () => {
    console.log("Listening for Presence Changes...")
});
bot.on("presenceUpdate", async (prev, now) => {
    console.log(`${now.user.username+"#"+now.user.discriminator} (on ${now.member.guild.name}) is now playing ${now.activities.map((activity) => activity.name)} (${now.activities.length})`)

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
        console.log(nowName);

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
                var role = await pickRole(now.member.guild, a);
                if (role == null) continue;
                now.member.roles.remove(role , "Stopped Playing Game"); 
            }
        }
    } else {
        console.log("=> member is more priviledged than bot -> cant assign role")
    }
});

bot.login(process.env.ACCESS_TOKEN || config.token); //config.token


//FUNCTIONS
/**
 * 
 * @param {discord.Guild} guild 
 * @param {*} name 
 * @returns 
 */
async function pickRole(guild, name) {
    console.log("pick role for "+name)
    //role to be created 
    var desiredRolename = config.alias[name] || name;

    await guild.roles.fetch();
    var role = guild.roles.cache.find(x => {
        return x.name === desiredRolename && x.editable; //find role by name
    });

    if (role == null) { // create role
        if(!config.createRoles) return null;
        console.log(`creating role ${desiredRolename}`);
        role = await guild.roles.create({
            name: desiredRolename,
            color: 'DEFAULT',
            reason: "Game Activity Detected"
        });
    } else {
        console.log("found role");
    }

    return role;
}

//bot invite
//permissions :285215744
//https://discordapp.com/oauth2/authorize?client_id=698215134438621206&scope=bot&permissions=285215744