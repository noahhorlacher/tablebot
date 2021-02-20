// Import discord.js and create the client
const Discord = require('discord.js')
const client = new Discord.Client()

// Import dotenv for getting the commandtoken
require('dotenv').config()

// Helper function for getting the last array element
if (!Array.prototype.last) {
	Array.prototype.last = function () {
		return this[this.length - 1]
	}
}

// Define bot filetypes
let bot = {
	filetypes: {
		sheet: ['.xlsx', '.xls', '.otd', '.csv'],
		image: ['.png', '.jpg', '.jpeg']
	}
}

// return first valid image or false if none
let msgImage = (msg) => {
	return msg.attachments.find((e) =>
		bot.filetypes.image.includes(e.name.split('.').last())
	)
}

let msgSheet = (msg) => {
	return msg.attachments.find((e) =>
		bot.filetypes.sheet.includes(e.name.split('.').last())
	)
}

// Set bot defaults
let cfg = (bot.defaults = require('./defaults.json'))
let ctk = cfg.commandtoken

bot.commands = {
	help: {
		token: 'help',
		descr: 'General help',
		example: `${ctk} help`,
		action: (msg) => {
			msg.reply({
				embed: {
					color: cfg.msgcolor,
					title: 'Tablebot Help: General',
					description: 'Try one of the following commands for help:',
					fields: [
						{
							name: 'How to get started using the bot',
							value: `${ctk} usage`
						},
						{
							name: 'List all commands',
							value: `${ctk} commands`
						}
					]
				}
			})
		}
	},
	usage: {
		token: 'usage',
		descr: 'Help with usage of the generator',
		example: `${ctk} usage`,
		action: (msg) => {
			msg.reply({
				embed: {
					color: cfg.msgcolor,
					title: `Tablebot Help: Usage`,
					description: `Here's how to generate a table image from some sheet file:`,
					fields: [
						{
							name: '1. Type the make command',
							value: `${ctk} make`
						},
						{
							name:
								'2. Attach your sheet/table file to the message',
							value:
								'Supported file types: ' +
								bot.filetypes.sheet.join(', ')
						},
						{
							name:
								'3. Attach background image ' +
								bot.filetypes.image.join(', ') +
								' or set background color via command',
							value: `${ctk} make c=${cfg.colors.bg}`
						},
						{
							name: '4. Optionally, also set table & font color',
							value: `${ctk} make c=${cfg.colors.bg} t=${cfg.colors.table} f=${cfg.colors.font}`
						}
					]
				}
			})
		}
	},
	commands: {
		token: 'commands',
		descr: 'List all commands',
		example: `${ctk} commands`,
		action: (msg) => {
			msg.reply({ embed: bot.helptable })
		}
	},
	make: {
		token: 'make',
		descr: 'Make the image',
		example: `${ctk} make`,
		action: (msg) => {
			let sheet = msgSheet(msg)
			if (msg.attachments.size > 0 && sheet) {
				let bgtype = 'customcolor'
				let bg =
					msg.match(/c=#[0-9a-f]{6}/gi).replace('c=#', '') ||
					(msgImage(msg) && (bgtype = 'image')) ||
					(cfg.colors.bg && (bgtype = 'defaultcolor'))
				let tablecolor =
					msg.match(/t=#[0-9a-f]{6}/gi).replace('t=#') ||
					cfg.colors.table
				let fontcolor =
					msg.match(/f=#[0-9a-f]{6}/gi).replace('f=#') ||
					cfg.colors.font
				msg.reply(`Making table image with following params:\n
							\t	Background\n
							\t\t	type:\t${bgtype},\n
							\t\t	bg:\t${bg}\n
							\t	Tablecolor:\t\t${tablecolor}\n
							\t	Fontcolor:\t\t${fontcolor}`)
			} else {
				msg.reply('No attachment found!')
			}
		}
	}
}

bot.helptable = {
	color: cfg.msgcolor,
	title: `Tablebot Help: Commands`,
	description: `Here's a list of all available commands:`,
	fields: Object.values(bot.commands).reduce((a, v) => {
		return [
			...a,
			{
				name: `\`${v.example}\``,
				value:
					v.descr +
					'\n' +
					'Options: ' +
					(v.options ? v.options : 'None'),
				inline: true
			}
		]
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

	let cur_command = Object.values(bot.commands).find((e) =>
		token.includes(e.token)
	)
	if (cur_command && cur_command.action) {
		cur_command.action(msg)
		return true
	}

	msg.reply(`You need something? try \`${ctk} ${bot.commands.help.token}\``)
})

// login
client.login(process.env.BOTTOKEN)
