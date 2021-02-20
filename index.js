// Import discord.js and create the client
const Discord = require('discord.js')
const client = new Discord.Client()

// Import dotenv for getting the commandtoken
require('dotenv').config()

// Import user config from json
const config = require('./tablebot-config.json')

if (!Array.prototype.last) {
	Array.prototype.last = function () {
		return this[this.length - 1]
	}
}

let bot = {
	filetypes: {
		sheet: ['.xlsx', '.xls', '.otd', '.csv'],
		image: ['.png', '.jpg', '.jpeg']
	}
}

const ctk = config.commandtoken
const tagstring = `@Tablebot`

bot.commands = {
	help: {
		token: 'help',
		descr: 'General help',
		example: `${tagstring} ${ctk}help`,
		action: (msg) => {
			msg.reply({
				embed: {
					color: config.msgcolor,
					title: 'Tablebot Help: General',
					description: 'Try one of the following commands for help:',
					fields: [
						{
							name: 'How to get started using the bot',
							value: `${tagstring} ${ctk}usage`
						},
						{
							name: 'List all commands',
							value: `${tagstring} ${ctk}commands`
						}
					]
				}
			})
		}
	},
	usage: {
		token: 'usage',
		descr: 'Help with usage of the generator',
		example: `${tagstring} ${ctk}usage`,
		action: (msg) => {
			msg.reply({
				embed: {
					color: config.msgcolor,
					title: `Tablebot Help: Usage`,
					description: `Here's how to generate a table image from some sheet file:`,
					fields: [
						{
							name:
								'1. Set a default background by attaching some image file to a message containing the following command',
							value: `${tagstring} ${ctk}set defaultbg`
						},
						{
							name:
								'3. Attach your sheet/table file to the message',
							value:
								'Supported file types: ' +
								bot.filetypes.sheet.join(', ')
						},
						{
							name: '4. Send and wait for the bot to reply',
							value: "That's all."
						}
					]
				}
			})
		}
	},
	commands: {
		token: 'commands',
		descr: 'List all commands',
		example: `${tagstring} ${ctk}commands`,
		action: (msg) => {
			msg.reply({ embed: bot.helptable })
		}
	},
	setbgimage: {
		token: 'setbgimage',
		descr: 'Set the default background image',
		example: `${tagstring} ${ctk}setbgimage`,
		action: (msg) => {
			console.log('atc', msg.attachments)
			if (
				msg.attachments.size > 0 &&
				bot.filetypes.image.some((e) =>
					e.includes(msg.attachments.first().name.split('.').last())
				)
			) {
				config.defaultbgimage = {
					proxyURL: msg.attachments.first().proxyURL,
					url: msg.attachments.first().url
				}
				msg.reply(
					`Updated the default background image to: ${config.defaultbgimage}`
				)
			} else {
				msg.reply('No attachment found!')
			}
		}
	},
	getbgimage: {
		token: 'getbgimage',
		descr: 'Show the default background image',
		example: `${tagstring} ${ctk}getbgimage`,
		action: (msg) => {
			if (config.defaultbgimage !== 'undefined') {
				msg.reply({
					embed: {
						title: 'Default Background Image',
						description: `This is your default background image. It will be used as a fallback if you don't specify a different one in your command.`,
						thumbnail: config.useproxy
							? config.defaultbgimage.proxyUrl
							: config.defaultbgimage.url
					}
				})
			} else {
				msg.reply('No default background image set yet.')
			}
		}
	},
	setcolor: {
		token: 'setcolor',
		descr: 'Set the table stroke and font color from hexcode',
		example: `${tagstring} ${ctk}setcolor #ff0A84`,
		action: (msg) => {
			if (msg.match(/^#[0-9a-f]{6}/i).success) {
				config.defaultcolor = msg.match(/^[(#)(0x)][0-9a-f]{6}/i).value
			} else {
				msg.reply('Invalid color. Try: #Babe69')
			}
		}
	},
	toggleproxy: {
		token: 'toggleproxy',
		descr:
			'Switch to/from proxy server from/to regular server for image downloads.',
		example: `${tagstring} ${ctk}toggleproxy`,
		action: (msg) => {
			msg.reply(
				`Proxy mode is now ${
					['off', 'on'][(config.useproxy = !config.useproxy)]
				}`
			)
		}
	}
}

bot.helptable = {
	color: config.msgcolor,
	title: `Tablebot Help: Commands`,
	description: `Here's a list of all available commands:`,
	fields: Object.values(bot.commands).reduce(
		(a, v) => {
			return (a = [
				...a,
				{
					name: v.descr,
					value: `Command: ${v.token}\nExample: ${v.example}`,
					inline: true
				}
			])
		},
		[
			{
				name: 'Generate image',
				value: `Command: No command\nExample: ${tagstring} [Sheet_File.xlsx](#)`
			}
		]
	)
}

// Register an event so that when the bot is ready, it will log a messsage to the terminal
client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}!`)
})

// Handle message
client.on('message', async (msg) => {
	// Stop if bot, mentioned non-personally or msg author an impersonator of me
	if (
		msg.author.bot ||
		msg.author.id !== process.env.OWNERID ||
		['@everyone', '@here'].some((e) => msg.content.includes(e))
	)
		return false

	// On personal mention
	if (msg.mentions.has(process.env.CLIENTID)) {
		// Check if command and execute if true
		let token = msg.cleanContent.replace(
			new RegExp(`(s*?)?${tagstring}(s*?)?`, 'gi'),
			''
		)

		let cur_command = Object.values(bot.commands).find((e) =>
			token.includes(ctk + e.token)
		)
		if (cur_command && cur_command.action) {
			cur_command.action(msg)
			return true
		}

		// No command, defaulting to generate image
		if (
			msg.attachments.size > 0 &&
			bot.filetypes.sheet.some((e) =>
				e.includes(msg.attachments.first().name.split('.').last())
			)
		) {
			// The resulting image or an error message
			let response
			let sheetfile = msg.attachments.first().attachment
			let data
			/*switch (typeof(sheetfile)){
                case Buffer: // Parse from buffer
                    data = 
                    break;
                case String: // Parse from path
                    break;
                default:
                    break;
            }*/

			console.log(sheetfile)

			msg.reply({
				content: `Done! Here's your image:`,
				attachment: response
			}) // final answer
		} else {
			msg.reply('Try to attach a sheet file. ')
		}
	}
})

// login
client.login(process.env.BOTTOKEN)
