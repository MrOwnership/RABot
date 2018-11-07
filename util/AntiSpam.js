require('dotenv').config({path: __dirname + '/.env'});
const { SPAM_TIME_LIMIT, MUTE_ROLE } = process.env; 

const slowModeMentionsMap = new Map();
const slowModeMap = new Map();

const spamLevel = {
    'warn': 7,
    'mute': 10
};

module.exports = (message) => {
    if( message.author.bot
        || !message.guild
        || !message.member
        || !message.guild.member(client.user).hasPermission("BAN_MEMBERS")
        || message.member.hasPermission("MANAGE_MESSAGES")
      )
        return;

    // Ignore if 1 mention and it's a bot (bot interaction)
    if( message.mentions.users.size == 1 && message.mentions.users.first().bot )
        return;

    // If there is no trace of the author in the slowmode map, add them.
    let entryMentions = slowModeMentionsMap.get(message.author.id);
    if (!entryMentions) {
        entryMentions = 0;
        slowModeMentionsMap.set(message.author.id, entryMentions);
    }

    let entryMessages = slowModeMap.get(message.author.id);
    if (!entryMessages) {
        entryMessages = 0;
        slowModeMap.set(message.author.id, entryMessages);
    }

    // Count the unique user and roles mentions, and messages
    entryMentions += message.mentions.users.size + message.mentions.roles.size;
    entryMessages++;

    // Set all the amounts in the slowmode maps
    slowModeMentionsMap.set(message.author.id, entryMentions);
    slowModeMap.set(message.author.id, entryMessages);

    // checking the total number of mentions and taking actions if needed
    if(entryMentions >= spamLevel.warn) {
        if(entryMentions >= spamLevel.mute) {
            // TODO: mute user adding the MUTE_ROLE to them
            msg.reply("Ouch! You went too far mentioning people and now you're muted.\nA @mod will check this soon. If you're just violating the `!rule 1` you will most likely be banned.\nBut don't panic! I'm sure you'll find some interesting thing to do out of this server.");
            slowModeMentionsMap.delete(message.author.id);
        }

        msg.reply('Hey mate! Take it easy with mentioning people or you can be muted.');
    } else {
        setTimeout( () => {
            entryMentions -= message.mentions.users.size + message.mentions.roles.size;
            if( entryMentions <= 0 )
                slowModeMentionsMap.delete(message.author.id);
        }, SPAM_TIME_LIMIT);
    }

    // checking the total number of messages and taking actions if needed
    if( entryMessages > spamLevel.warn ) {
        if( entryMessages > spamLevel.mute ) {
            // TODO: mute user adding the MUTE_ROLE to them
            msg.reply("Ouch! You went too far with all those messages and now you're muted.\nA @mod will check this soon. If you're just violating the `!rule 1` you will most likely be banned.\nBut don't panic! I'm sure you'll find some interesting thing to do out of this server.");
            slowModeMap.delete(message.author.id);
        }

        msg.reply('Hey mate! Take it easy with all those messages or you can be muted.');
    } else {
        setTimeout( () => {
            entryMessages--;
            if( entryMessages <= 0 )
                slowModeMap.delete(message.author.id);
        }, SPAM_TIME_LIMIT);
    }
}
