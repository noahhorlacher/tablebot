const Discord = require('discord.js')
const client = new Discord.Client()
const csv = require('csv')
const Downloader = require('nodejs-file-downloader')
const fsPromises = require('fs/promises')
const path = require('path')
const { msToTime, cleantemp, msgsheet, msgimage } = require('./helpers')
require('dotenv').config() // get token etc.

const tmppath = path.normalize(__dirname + '/temp') // path for downloaded files
cleantemp(tmppath) // empty temp dir

// Set bot defaults
let defs = require('./defaults.json')
let ctk = defs.commandtoken

const commands = {
	help: {
		descr: 'General help',
		action: (msg) => {
			msg.reply({
				embed: {
					color: defs.msgcolor,
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
					color: defs.msgcolor,
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
								defs.filetypes.sheet.join(', ') +
								'`'
						},
						{
							name:
								'3. Attach background image ' +
								defs.filetypes.image.join(', ') +
								' or append background color hexcode to command',
							value: `\`${ctk} make c=${defs.colors.bg}\``
						},
						{
							name: '4. Optionally, also set table & font color',
							value: `\`${ctk} make c=${defs.colors.bg} t=${defs.colors.table} f=${defs.colors.font}\``
						}
					]
				}
			})
		}
	},
	list: {
		descr: 'List all commands',
		action: (msg) => {
			msg.reply({ embed: helptable })
		}
	},
	make: {
		descr: 'Make the image',
		action: async (msg) => {
			if (msg.attachments <= 0) {
				msg.reply('No attachment found!')
				return
			}

			let sheet = msgsheet(msg)
			if (!sheet) {
				msg.reply(
					'No valid sheet found. Supported sheets are:\n`' +
						defs.filetypes.sheet.join(',') +
						'`'
				)
				return
			}

			let cc = msg.cleanContent
			let mimg = await msgimage(msg)

			// Parse args
			let args = {
				bgc: cc.match(/c=#[0-9a-f]{6}/gi) || false,
				tc: cc.match(/t=#[0-9a-f]{6}/gi) || false,
				fc: cc.match(/f=#[0-9a-f]{6}/gi) || false
			}

			let bg =
				args.bgc[0]?.replace('c=(?=#)', '') || mimg || defs.colors.bg
			let bgtype = args.bgc
				? 'customcolor'
				: bg == defs.colors.bg
				? 'defaultcolor'
				: 'image'
			let tablecolor = args.tc[0]?.replace('t=(?=#)') || defs.colors.table
			let fontcolor = args.fc[0]?.replace('f=(?=#)') || defs.colors.font

			console.log(
				`Making table image with following params:\nBackground\n\ttype:\t${bgtype}\n\tbgvalue:\t${bg}\nTablecolor:\t${tablecolor}\nFontcolor:\t${fontcolor}`
			)

			let sheetext = sheet.name.split('.').pop() // Sheet file extension

			// Initialize Downloader
			const downloader = new Downloader({
				url: sheet.url,
				directory: tmppath,
				fileName: sheet.name
			})
			try {
				// Download attachment
				await downloader.download()

				// Parse sheet
				switch (sheetext) {
					case 'csv':
						await csv.parse(
							await fsPromises.readFile(
								tmppath + '/' + sheet.name
							),
							async (err, _d) => {
								if (err) throw 'Csv parse error'

								await fsPromises.unlink(
									tmppath + '/' + sheet.name
								)

								let data = [..._d]
								let header = data.shift()
								let body = []

								for (let i in header) {
									if (!header[i] || header[i] == '')
										header[i] = '—'
								}

								console.log(
									'before: header',
									header,
									'data',
									data
								)

								for (let x = 0; x < header.length; x++) {
									let col = []
									for (let y = 0; y < data.length; y++) {
										col.push(data[y][x] || '—')
									}
									body.push(col.join('\n'))
								}

								let K = 5 // limit array msg to K rows
								let arrtruncate = (arr) => {
									let ln = arr.split('\n').splice(0, 5)
									ln.push(
										'... ' +
											(arr.split('\n').length - K) +
											' more rows'
									)
									return ln
										.reduce((a, e) => {
											return [...a, `\`${e}\``]
										}, [])
										.join('\n')
								}

								let fields = []
								for (let i = 0; i < header.length; i++) {
									fields.push({
										name: header[i],
										value: arrtruncate(body[i]),
										inline: true
									})
								}

								console.log(
									'after: header',
									header,
									'data',
									fields
								)

								msg.reply({
									embed: {
										color: defs.msgcolor,
										title: 'Data',
										description: 'Data read successfully',
										fields: fields
									}
								})
							}
						)
						break
					default:
						msg.reply(`File type \`${sheetext}\`not supported.`)
						break
				}
			} catch (e) {
				console.log('error: ', e)
				return
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
			msg.reply(defs.teststring)
		}
	}
}
const helptable = {
	color: defs.msgcolor,
	title: `Tablebot Help: Command List`,
	description: `Here's a list of all available commands:`,
	fields: Object.entries(commands).reduce((a, e) => {
		return !e[1].hidden
			? [
					...a,
					{
						name: `\`${(e[1].example
							? e[1].example
							: defs.defaultexample
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
		cur_command[1].action(msg)
		return true
	}

	// No matching command
	msg.reply(`You need something? try \`${ctk} help\``)
})

// login
client.login(process.env.BOTTOKEN)
