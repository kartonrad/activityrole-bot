const config = require("./config.json");

const discord = require("discord.js");
const bot = new discord.Client();

bot.on("ready", () => {
    console.log("Listening for Presence Changes...")
});
bot.on("presenceUpdate", async (prev, now) => {
    console.log(`${now.user.username+"#"+now.user.discriminator} is now playing ${now.activities.map((activity) => activity.name)} (${now.activities.length})`)

    if(now.member.manageable) {
        if(prev) {
            var prevAct = prev.activities.filter(act => act.applicationID != null)
            var prevName= prevAct.map(act => act.name);
        } else {
            var prevAct = [];
            var prevName = [];
        }
        

        var nowAct = now.activities.filter(act => act.applicationID != null)
        var nowName= nowAct.map(act => act.name);

        //add roles for new activities
        for (var i = 0; i < nowName.length; i++) {
            var a = nowName[i];
            var role = await pickRole(now.member.guild, a);
            now.member.roles.add(role , "Started Playing Game"); 
        }

        //remove roles for ended activities
        for (var i = 0; i < prevName.length; i++) {
            var a = prevName[i];
            if(!nowName.includes(a)) {
                var role = await pickRole(now.member.guild, a);
                now.member.roles.remove(role , "Stopped Playing Game"); 
            }
        }
    }
});

bot.login(config.token); //config.token


//FUNCTIONS
async function pickRole(guild, name) {
    //role to be created 
    var desiredRolename = config.alias[name] || name;

    await guild.roles.fetch();
    var role = guild.roles.cache.find(x => {
        return x.name === desiredRolename && x.editable; //find role by name
    });

    if (role == null) { // create role
        console.log(`creating role ${desiredRolename}`);
        role = await guild.roles.create({
            data: {
              name: desiredRolename,
              color: 'DEFAULT',
              
            },
            reason: "Game Activity Detected"
        });
    }

    return role;
}

//bot invite
//permissions :285215744
//https://discordapp.com/oauth2/authorize?client_id=698215134438621206&scope=bot&permissions=285215744