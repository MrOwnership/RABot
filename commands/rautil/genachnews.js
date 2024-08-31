const ytSearch = require('youtube-search');
const fetch = require('node-fetch');

const Command = require('../../structures/Command');

const { YOUTUBE_API_KEY, RA_USER, RA_WEB_API_KEY } = process.env;
const opts = {
  maxResults: 1,
  key: YOUTUBE_API_KEY,
};

module.exports = class GenerateAchievementNewsCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'genachnews',
      aliases: ['gan'],
      group: 'rautil',
      memberName: 'genachnews',
      description: 'Generate an achievement-news post template for the given game ID',
      examples: ['`achnews 4650`'],
      throttling: {
        usages: 3,
        duration: 60,
      },
      args: [
        {
          key: 'gameId',
          prompt: '',
          type: 'string',
          validate: (arg) => {
            if (Number.parseInt(arg, 10) > 0) {
              return true;
            }
            return /^https?:\/\/retroachievements\.org\/game\/[0-9]+$/i.test(arg);
          },
        },
      ],
    });
  }

  async getLongplayLink(terms) {
    const searchTerms = `longplay ${terms}`;

    const { results } = await ytSearch(searchTerms, opts);

    return results[0] ? results[0].link : null;
  }

  async getGameInfo(gameId) {
    const endpoint = `https://retroachievements.org/API/API_GetGameExtended.php?z=${RA_USER}&y=${RA_WEB_API_KEY}&i=${gameId}`;

    let gameInfo = null;

    try {
      const res = await fetch(endpoint);
      const json = await res.json();

      const dates = new Set();

      const achievements = Object.keys(json.Achievements);
      achievements.forEach((cheevo) => dates.add(
        json.Achievements[cheevo].DateModified.replace(/ ..:..:..$/, ''),
      ));

      const achievementSetDate = [...dates].reduce((d1, d2) => {
        const date1 = new Date(d1);
        const date2 = new Date(d2);
        return date1 >= date2 ? d1 : d2;
      });

      // Convert date to a human readable string based on the granularity
      const [year, month, day] = json.Released.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      let releaseDate = null;
      switch (json.ReleasedAtGranularity)
      {
        case "day":
          releaseDate = `${date.toLocaleString('en-us', { month: 'long' })} ${day}, ${year}`;
          break;
        case "month":
          releaseDate = `${date.toLocaleString('en-us', { month: 'long' })} ${year}`;
          break;
        case "year":
          releaseDate = `${year}`;
          break;
        default:
          releaseDate = json.Released;
      }

      gameInfo = {
        id: gameId,
        title: json.Title,
        consoleName: json.ConsoleName,
        genre: json.Genre,
        developer: json.Developer,
        releaseDate,
        achievementSetDate,
      };
    } catch (error) {
      return null;
    }

    return gameInfo;
  }

  async run(msg, { gameId }) {
    let id = Number.parseInt(gameId, 10);
    if (Number.isNaN(id)) {
      id = /[0-9]+$/.exec(gameId);
    }

    const sentMsg = await msg.say(
      `:hourglass: Getting info for game ID \`${id}\`, please wait...`,
    );

    const gameInfo = await this.getGameInfo(id);
    if (!gameInfo) {
      return sentMsg.edit(`Unable to get info from the game ID \`${id}\`... :frowning:. This command only works if the set has published achievements.`);
    }

    const youtubeLink = await this.getLongplayLink(
      `${gameInfo.title.replace(/~/g, '')} ${gameInfo.consoleName}`,
    );

    const template = `
\\\`\\\`\\\`ansi
\`\`\`ansi
Title:       [1;31m${gameInfo.title}[0m
Console:     [0;34m${gameInfo.consoleName}[0m
Developer:   [0;32m${gameInfo.developer}[0m
Genre:       [0;35m${gameInfo.genre}[0m
Released:    [0;33m${gameInfo.releaseDate}[0m
\`\`\`\\\`\\\`\\\`
A new set was published by @{AUTHOR_NAME} on ${gameInfo.achievementSetDate}
${youtubeLink || '{LONGPLAY-LINK}'}
<https://retroachievements.org/game/${id}>
`;

    return sentMsg.edit(`${msg.author}, here's your achievement-news post template:\n${template}`);
  }
};
