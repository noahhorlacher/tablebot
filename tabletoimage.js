const csv = require('csv')
const Downloader = require('nodejs-file-downloader')
const fsPromises = require('fs/promises')
const { msgsheet, tmppath } = require('./helpers')
const defs = require('./defaults.json')
const pug = require('pug')
const nodeHtmlToImage = require('node-html-to-image')
const datauri = require('datauri')
const ExcelCSV = require('excelcsv')

let tabletohtml = async (data, options) => {
	if (options.bg == defs.style.bgimage) {
		options.bg = await datauri(options.bg)
	}
	if (options.logo == defs.style.logo)
		options.logo = await datauri(options.logo)

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
			options.bgtype == 'image'
				? `url(${options.bg.replace(/\\\\/gi, '/')})`
				: options.bg
		)
		.replace('%tc', options.tablecolor)
		.replace('%fc', options.fontcolor)
		.replace('%hfc', options.headerfontcolor)
		.replace('%hbc', options.headerbgcolor)
		.replace('%bc', options.bordercolor)
		.replace('%bw', options.borderwidth)
		.replace('%tic', options.titlecolor)
		.replace('%spc', options.specialcolor)

	let thead = data.shift()
	let tdata = []

	let hasspc = false
	let spcindex

	// Has special keyword
	if (
		thead.some((e) => {
			return e == defs.style.specialheader
		})
	) {
		hasspc = true
		spcindex = thead.indexOf(defs.style.specialheader)
		thead = thead.filter((e) => {
			return e != defs.style.specialheader
		})
	}

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

	console.log('highlighting')
	for (let t = 0; t < tdata.length; t++) {
		for (let r = 0; r < tdata[t].length; r++) {
			if (hasspc && spcindex) {
				let isspc = tdata[t][r][spcindex] == 'TRUE' ? true : false
				tdata[t][r] = [isspc, tdata[t][r]]
				tdata[t][r][1].splice(spcindex, 1)
			} else {
				tdata[t][r] = [false, tdata[t][r]]
			}
		}
	}

	let dateobj = new Date(Date.now())
	let datestr = `${dateobj.getDate()}.${
		dateobj.getMonth() + 1
	}.${dateobj.getFullYear()}`

	options.logo = options.logo ? options.logo.replace(/\\\\/gi, '/') : false
	options.title = options.title
		? options.title.replace('%date', datestr)
		: false

	console.log('pugging')
	// pugging
	return pug.renderFile('./template.pug', {
		theader: thead,
		tdata: tdata,
		usrvars: usrvars,
		defstyle: defstyle,
		logo: options.logo,
		title: options.title
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
		bgc: cc.match(/bgc=#[0-9a-f]{6}/gi) || false, // html background color
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
		spl: cc.match(/spl=\d+/gi) || false, // split datarows into multiple tables
		ti: cc.match(/ti='.*?'/gi) || false, // title
		tic: cc.match(/tic=#[0-9a-f]{8}/gi) || false, // title color
		spc: cc.match(/spc=#[0-9a-f]{8}/gi) || false // highlight color
	}

	let bg =
		args.bgi[0]?.replace(/bgi=/i, '') ||
		args.bgc[0]?.replace(/bgc=/i, '') ||
		defs.style.bgimage == ''
			? false
			: defs.style.bgimage || defs.style.bgcolor
	let logo =
		args.logo[0]?.replace(/logo=/i, '') || defs.style.logo == ''
			? false
			: defs.style.logo || false
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
	let title =
		args.ti[0]?.replace(/ti='/i, '').replace(/'$/i, '') ||
		defs.style.defaulttitle
	let titlecolor = args.tic[0]?.replace(/tic=/i, '') || defs.style.titlecolor
	let specialcolor =
		args.spc[0]?.replace(/spc=/i, '') || defs.style.highlightcolor

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
			case 'xlsx':
				let parser = new ExcelCSV(tmppath + '/' + sheet.name)
				let csvstring = parser
					.row(function (row, sheetname) {
						return row.some((e) => {
							return e && e != '' && e.length > 0
						})
							? row
							: false
					})
					.init()
				await csv.parse(csvstring, async (err, _d) => {
					if (err)
						return ['Error: Failed to parse xlsx file', err.message]
					tabledata = [..._d]
				})
				break
			case 'csv':
				csv.parse(
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

		console.log('Parsed file to js obj')

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
				splitevery: splitevery,
				title: title,
				titlecolor: titlecolor,
				specialcolor: specialcolor
			})
		} catch (e) {
			console.log(e)
			return [`Error: Couldn't convert table to html`, e]
		}

		let finalimg

		try {
			finalimg = await nodeHtmlToImage({
				html: html,
				quality: defs.style.quality,
				transparent: defs.style.transparent,
				type: 'png',
				encoding: 'binary',
				puppeteerArgs: {
					args: ['--no-sandbox', '--disable-setuid-sandbox']
				}
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
