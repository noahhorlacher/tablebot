// Import discord.js and create the client
const Discord = require('discord.js')
const client = new Discord.Client()
const mime = require('mime-types')

// Import dotenv for getting the commandtoken
require('dotenv').config()

// Helper functions
if (!Array.prototype.last) {
	Array.prototype.last = function () {
		return this[this.length - 1]
	}
}
function msToTime(s) {
	var ms = s % 1000
	s = (s - ms) / 1000
	var secs = s % 60
	s = (s - secs) / 60
	var mins = s % 60
	var hrs = (s - mins) / 60

	return `\`${hrs}h ${mins}m ${secs}s\``
}

// Define bot filetypes
let bot = {
	filetypes: {
		sheet: ['.xlsx', '.xls', '.otd', '.csv'],
		image: ['.png', '.jpg', '.jpeg']
	}
}

// return msg file urls or false
let msgUrls = (s) => {
	return (
		s.match(
			/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi
		) || false
	)
}

let urlFileType = (s) => {
	let l = s.split('/').pop()
	return l == l.split('.') ? undefined : '.' + l.split('.').pop()
}

// return msg image or false
let msgImage = (msg) => {
	console.log('msgurls:', msgUrls(msg.cleanContent))
	return msgUrls(msg.cleanContent).find((e) =>
		bot.filetypes.sheet.includes(urlFileType(e))
	)
}
// return msg sheet or false
let msgSheet = (msg) => {
	return msg.attachments.find((e) =>
		bot.filetypes.sheet.includes('.' + e.name.split('.').last())
	)
}

// Set bot defaults
let cfg = (bot.defaults = require('./defaults.json'))
let ctk = cfg.commandtoken

bot.commands = {
	help: {
		descr: 'General help',
		action: (msg) => {
			msg.reply({
				embed: {
					color: cfg.msgcolor,
					title: 'Tablebot Help: General',
					description: 'Try one of the following commands for help:',
					fields: [
						{
							name: `\`${ctk} usage\``,
							value: 'Get started'
						},
						{
							name: `\`${ctk} commands\``,
							value: 'List all commands'
						}
					]
				}
			})
		}
	},
	usage: {
		descr: 'Get started',
		action: (msg) => {
			msg.reply({
				embed: {
					color: cfg.msgcolor,
					title: `Tablebot Help: Usage`,
					description: `Here's how to generate a table image from some sheet file:`,
					fields: [
						{
							name: '1. Type the make command',
							value: `\`${ctk} make\``
						},
						{
							name:
								'2. Attach your sheet/table file to the message',
							value:
								'Supported file types: `' +
								bot.filetypes.sheet.join(', ') +
								'`'
						},
						{
							name:
								'3. Attach background image ' +
								bot.filetypes.image.join(', ') +
								' or append background color hexcode to command',
							value: `\`${ctk} make c=${cfg.colors.bg}\``
						},
						{
							name: '4. Optionally, also set table & font color',
							value: `\`${ctk} make c=${cfg.colors.bg} t=${cfg.colors.table} f=${cfg.colors.font}\``
						}
					]
				}
			})
		}
	},
	list: {
		descr: 'List all commands',
		action: (msg) => {
			msg.reply({ embed: bot.helptable })
		}
	},
	make: {
		descr: 'Make the image',
		action: (msg) => {
			let sheet = msgSheet(msg)
			if (msg.attachments.size > 0 && sheet) {
				let cc = msg.cleanContent
				let bg =
					cc.match(/c=#[0-9a-f]{6}/gi)?.replace('c=#', '') ||
					msgImage(msg) ||
					cfg.colors.bg
				let bgtype =
					bg == cfg.colors.bg
						? 'defaultcolor'
						: ['customcolor', 'image'][msgImage(msg)]
				let tablecolor =
					cc.match(/t=#[0-9a-f]{6}/gi)?.replace('t=#') ||
					cfg.colors.table
				let fontcolor =
					cc.match(/f=#[0-9a-f]{6}/gi)?.replace('f=#') ||
					cfg.colors.font
				msg.reply(
					`Making table image with following params:
						Background
							type:			${bgtype},
							bg:				${bg}
						Tablecolor:		${tablecolor}
						Fontcolor:		${fontcolor}`
				)
			} else {
				msg.reply('No attachment found!')
			}
		}
	},
	uptime: {
		descr: 'Check bot uptime',
		action: (msg) => {
			msg.reply(`Dude man I'm up since like ${msToTime(client.uptime)}.`)
		}
	},
	yo: {
		descr: 'Simple I/O testing command.',
		action: (msg) => {
			msg.reply(cfg.teststring)
		}
	}
}

bot.helptable = {
	color: cfg.msgcolor,
	title: `Tablebot Help: Command List`,
	description: `Here's a list of all available commands:`,
	fields: Object.entries(bot.commands).reduce((a, e) => {
		return !e[1].hidden
			? [
					...a,
					{
						name: `\`${(e[1].example
							? e[1].example
							: cfg.defaultexample
						)
							.replace(/(%t)/gi, e[0])
							.replace(/(%ctk)/, ctk)}\``,
						value:
							e[1].descr +
							(e[1].options ? '\nOptions: ' + e[1].options : ''),
						inline: true
					}
			  ]
			: a
	}, [])
}

// Register an event so that when the bot is ready, it will log a messsage to the terminal
client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}!`)
})

// Handle message
client.on('message', async (msg) => {
	// Stop if bot, mentioned non-personally or msg author an impersonator of me
	if (msg.author.bot || !msg.cleanContent.includes(ctk)) return false

	// Check if command and execute if true
	let token = msg.cleanContent.replace(new RegExp(`(.*)?${ctk}`, 'gi'), '')
	let cur_command = Object.entries(bot.commands).find((e) =>
		token.includes(e[0].toString())
	)
	if (cur_command && cur_command[1].action) {
		cur_command[1].action(msg)
		return true
	}

	// No matching command
	msg.reply(`You need something? try \`${ctk} help\``)
})

// login
client.login(process.env.BOTTOKEN)
