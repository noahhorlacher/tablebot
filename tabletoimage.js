const csv = require('csv')
const Downloader = require('nodejs-file-downloader')
const fsPromises = require('fs/promises')
const { msgimage, msgsheet, tmppath } = require('./helpers')
const defs = require('./defaults.json')
const pug = require('pug')

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

	console.log('dat:', tdata)

	return pug.renderFile('./template.pug', {
		theader: thead,
		tdata: tdata,
		usrvars: usrvars,
		defstyle: defstyle
	})
}

let tabletoimage = async (msg) => {
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
		bgc: cc.match(/c=#[0-9a-f]{6}/i) || false, // html background color
		tbc: cc.match(/tbc=#[0-9a-f]{8}]/i) || false, // table background color
		fc: cc.match(/fc=#[0-9a-f]{8}/i) || false, // font color
		bc: cc.match(/bc=#[0-9a-f]{8}/i) || false, // border color
		hfc: cc.match(/hfc=#[0-9a-f]{8}/i) || false, // header font color
		hbc: cc.match(/hbc=#[0-9a-f]{8}/i) || false, // header background color
		bw: cc.match(/bw=\d+/i) || false, // border width
		spl: cc.match(/spl=\d+/i) || false
	}
	let bg = args.bgc[0]?.replace(/c=/) || mimg || defs.style.bgcolor
	let bgtype = args.bgc ? 'color' : bg == defs.colors.bg ? 'color' : 'image'
	let tablecolor = args.tbc[0]?.replace(/tbc=/) || defs.style.tablecolor
	let fontcolor = args.fc[0]?.replace(/fc=/) || defs.style.fontcolor
	let headerfontcolor =
		args.hfc[0]?.replace(/hfc=/) || defs.style.headerfontcolor
	let headerbgcolor = args.hbc[0]?.replace(/hbc=/) || defs.style.headerbgcolor
	let bordercolor = args.bc[0]?.replace(/bc=/) || defs.style.bordercolor
	let borderwidth =
		(parseInt(args.bw[0]?.replace(/bw=/)) || defs.style.borderwidth) + 'px'
	let splitevery =
		parseInt(args.bw[0]?.replace(/spl=/)) || defs.style.splitevery // -1 = don't split

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
						if (err) throw 'Csv parse error'
						tabledata = [..._d]
					}
				)
				break
			default:
				msg.reply(`File type \`${sheetext}\`not supported.`)
				return
		}

		// success
		await fsPromises.unlink(tmppath + '/' + sheet.name) // Delete tempfile

		// Parse into html
		let html = await tabletohtml(tabledata, {
			bg: bg,
			bgtype: bgtype,
			tablecolor: tablecolor,
			headerfontcolor: headerfontcolor,
			headerbgcolor: headerbgcolor,
			fontcolor: fontcolor,
			bordercolor: bordercolor,
			borderwidth: borderwidth,
			splitevery: splitevery
		})

		await fsPromises.writeFile('./pugout.html', html)
		console.log('Saved html')
	} catch (e) {
		console.log('error: ', e)
		return
	}
}

module.exports = {
	tabletoimage: tabletoimage
}
