const { tabletoimage } = require('./tabletoimage')
let defs = require('./defaults.json')
const Discord = require('discord.js')
let ctk = defs.commandtoken

const commands = {
	help: {
		descr: 'General help',
		action: async (msg) => {
			await msg.channel.send({
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
							name: `\`${ctk} list\``,
							value: 'List all commands'
						}
					]
				}
			})
		}
	},
	usage: {
		descr: 'Get started',
		action: async (msg) => {
			await msg.channel.send({
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
								'3. Attach background image (Optional) ' +
								defs.filetypes.image.join(', ') +
								' or append background color hexcode to command (Optional)',
							value: `\`${ctk} make c=${defs.colors.bg}\``
						},
						{
							name: '4. For more styling options:',
							value: `\`${ctk} list\` under 'make'`
						}
					]
				}
			})
		}
	},
	list: {
		descr: 'List all commands',
		action: async (msg) => {
			await msg.channel.send({
				embed: {
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
											(e[1].options
												? '\nOptions: ' + e[1].options
												: ''),
										inline: true
									}
							  ]
							: a
					}, [])
				}
			})
		}
	},
	make: {
		descr:
			'Make the image\n\nArg examples:\nbackground color (hex): `c=#00ff44`\n\ntable background color (hex+alpha): `tbc=#00000088`\n\nfont color (hex+alpha): `fc=#ffffffee`\n\nborder color (hex+alpha): `bc=#ffffffbb`\n\nborder width (pixels): `bw=1`\n\nsplit table (number of rows): `spl=10`',
		action: async (_msg) => {
			/**
			 * @type {Discord.Message}
			 */

			let newembed = new Discord.MessageEmbed()
				.setTitle(`Generating your image...`)
				.setDescription('This can take a few seconds')
				.setColor(defs.colors.msg)
			_msg.channel
				.send(`I'll @ you when I'm done.`, newembed)
				.then(async (newmsg) => {
					console.log('Generating')
					let res = await tabletoimage(_msg).catch((err) => {
						console.log('Failed')
						newembed
							.setColor('#ff0000')
							.setTitle('Error')
							.setDescription(
								err && err.toString().length > 500
									? err.toString().substr(0, 100) + '...'
									: err.toString()
							)
						newmsg.edit(`<@${_msg.author.id}> I'm sorry.`, newembed)
						return
					})
					let err, img, fname
					;[err, img, fname] = [...res]

					if (err) {
						console.log('Failed: ', err, img)
						newembed
							.setColor('#ff0000')
							.setTitle(err)
							.setDescription('I encountered some error.')
						newmsg.edit(`<@${_msg.author.id}> I'm sorry`, newembed)
						return false
					} else {
						console.log('Success')
						let resultattachment = new Discord.MessageAttachment(
							img,
							fname
						)

						_msg.channel
							.send(resultattachment)
							.then((___msg) => {
								newembed
									.setColor('#00ff00')
									.setTitle('✅ Generated Image')
									.setDescription(`Here's your image`)
								newmsg.edit(`<@${_msg.author.id}>`, newembed)
							})
							.catch((e) => {
								console.log('couldnt send msg: ', e)
							})
							.finally(() => {
								return true
							})
					}
				})
				.catch((e) => {
					console.log('couldnt send msg: ', e)
				})
		}
	},
	uptime: {
		descr: 'Check bot uptime',
		action: async (msg) => {
			await msg.channel.send(
				`Dude man I'm up since like ${msToTime(client.uptime)}.`
			)
		}
	},
	yo: {
		descr: 'Simple I/O testing command.',
		action: async (msg) => {
			await msg.channel.send(defs.teststring)
		}
	}
}

module.exports = {
	commands: commands
}
