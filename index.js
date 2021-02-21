const Discord = require('discord.js')
const client = new Discord.Client()
const { cleantemp } = require('./helpers')
const { commands } = require('./commands')

require('dotenv').config() // get .env config (for token etc.)
cleantemp() // empty temp dir

// Set bot defaults
let defs = require('./defaults.json')
let ctk = defs.commandtoken

// Log on ready
client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}.`)
})

// Handle message
client.on('message', async (msg) => {
	// Stop if bot, mentioned non-personally or msg author an impersonator of me
	if (msg.author.bot || !msg.cleanContent.includes(ctk)) return false

	// Check if command and execute if true
	let token = msg.cleanContent.replace(new RegExp(`(.*)?${ctk}`, 'gi'), '')
	let cur_command = Object.entries(commands).find((e) =>
		token.includes(e[0].toString())
	)
	if (cur_command && cur_command[1].action) {
		await cur_command[1].action(msg)
		return true
	}

	// No matching command
	await msg.channel.send(
		`<@${msg.author.id}> You need something? try \`${ctk} help\``
	)
	return true
})

// Login
client.login(process.env.BOT_TOKEN)
