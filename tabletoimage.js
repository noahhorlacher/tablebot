const csv = require('csv')
const Downloader = require('nodejs-file-downloader')
const fsPromises = require('fs/promises')
const { msgsheet, tmppath } = require('./helpers')
const defs = require('./defaults.json')
const pug = require('pug')
const { MessageAttachment } = require('discord.js')
const nodeHtmlToImage = require('node-html-to-image')

let tabletohtml = async (data, options) => {
	console.log('opts: ', options)

	let usrvars = await fsPromises.readFile('./default.css', {
		encoding: defs.cssencoding
	})
	let defstyle = (
		await fsPromises.readFile('./vars.css', {
			encoding: defs.cssencoding
		})
	)
		.replace(
			'%bg',
			options.bgtype == 'image' ? `url(${options.bg})` : options.bg
		)
		.replace('%tc', options.tablecolor)
		.replace('%fc', options.fontcolor)
		.replace('%hfc', options.headerfontcolor)
		.replace('%hbc', options.headerbgcolor)
		.replace('%bc', options.bordercolor)
		.replace('%bw', options.borderwidth)

	let thead = data.shift()
	let tdata = []

	if (options.splitevery > parseInt(0)) {
		let tempdat = [...data]
		while (tempdat.length > options.splitevery) {
			tdata.push(tempdat.splice(0, options.splitevery))
		}
		if (tempdat.length > 0) {
			tdata.push(tempdat)
		}
	} else {
		tdata = [data]
	}

	return pug.renderFile('./template.pug', {
		theader: thead,
		tdata: tdata,
		usrvars: usrvars,
		defstyle: defstyle,
		logo: options.logo
	})
}

let tabletoimage = async (msg) => {
	if (msg.attachments <= 0) {
		return [false, 'No attachment found!']
	}

	let sheet = msgsheet(msg)
	if (!sheet)
		return [
			'No valid sheet found. Supported sheets are:',
			`\`${defs.filetypes.sheet.join(',')}\``
		]

	let cc = msg.cleanContent

	// Parse args
	let args = {
		bgc: cc.match(/c=#[0-9a-f]{6}/gi) || false, // html background color
		bgi:
			cc.match(
				/bgi=(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi
			) || false,
		logo:
			cc.match(
				/logo=(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi
			) || false,
		tbc: cc.match(/tbc=#[0-9a-f]{8}]/gi) || false, // table background color
		fc: cc.match(/fc=#[0-9a-f]{8}/gi) || false, // font color
		bc: cc.match(/bc=#[0-9a-f]{8}/gi) || false, // border color
		hfc: cc.match(/hfc=#[0-9a-f]{8}/gi) || false, // header font color
		hbc: cc.match(/hbc=#[0-9a-f]{8}/gi) || false, // header background color
		bw: cc.match(/bw=\d+/gi) || false, // border width
		spl: cc.match(/spl=\d+/gi) || false
	}

	let bg =
		args.bgi[0]?.replace(/bgi=/i, '') ||
		args.bgc[0]?.replace(/c=/i, '') ||
		defs.style.bgimage ||
		defs.style.bgcolor
	let logo = args.logo[0]?.replace(/logo=/i, '') || defs.style.logo || false
	let bgtype = args.bgc ? 'color' : bg == defs.colors.bg ? 'color' : 'image'
	let tablecolor = args.tbc[0]?.replace(/tbc=/i, '') || defs.style.tablecolor
	let fontcolor = args.fc[0]?.replace(/fc=/i, '') || defs.style.fontcolor
	let headerfontcolor =
		args.hfc[0]?.replace(/hfc=/i, '') || defs.style.headerfontcolor
	let headerbgcolor =
		args.hbc[0]?.replace(/hbc=/i, '') || defs.style.headerbgcolor
	let bordercolor = args.bc[0]?.replace(/bc=/i, '') || defs.style.bordercolor
	let borderwidth =
		(parseInt(args.bw[0]?.replace(/bw=/i, '')) || defs.style.borderwidth) +
		'px'
	let splitevery =
		parseInt(args.bw[0]?.replace(/spl=/i, '')) || defs.style.splitevery // -1 = don't split

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

		let tabledata

		// Parse sheet
		switch (sheetext) {
			case 'csv':
				await csv.parse(
					await fsPromises.readFile(tmppath + '/' + sheet.name),
					async (err, _d) => {
						if (err)
							return [
								'Error: Failed to parse csv file',
								err.message
							]
						tabledata = [..._d]
					}
				)
				break
			default:
				return [
					'Error: No valid sheet found.',
					'Supported sheets are:\n`' +
						defs.filetypes.sheet.join(',') +
						'`'
				]
		}

		// success
		try {
			await fsPromises.unlink(tmppath + '/' + sheet.name) // Delete tempfile
		} catch {
			console.log(
				`Error: Failed to delete temp file: ${
					tmppath + '/' + sheet.name
				}`
			)
		}

		let html = ''

		// Parse into html
		try {
			html = await tabletohtml(tabledata, {
				bg: bg,
				logo: logo,
				bgtype: bgtype,
				tablecolor: tablecolor,
				headerfontcolor: headerfontcolor,
				headerbgcolor: headerbgcolor,
				fontcolor: fontcolor,
				bordercolor: bordercolor,
				borderwidth: borderwidth,
				splitevery: splitevery
			})
		} catch (e) {
			return [`Error: Couldn't convert table to html`, e]
		}

		let finalimg

		try {
			finalimg = await nodeHtmlToImage({
				html: html,
				quality: 80,
				type: 'png',
				transparent: true,
				encoding: 'binary'
			})
		} catch (e) {
			return [`Error: Couldn't convert html to image`, e]
		}

		return [false, finalimg, sheet.name.split('.').shift() + '.png']
	} catch (e) {
		return ['Unknown Error:', e]
	}
}

module.exports = {
	tabletoimage: tabletoimage
}
