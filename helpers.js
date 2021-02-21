const fs = require('fs')
const FileType = require('file-type')
const got = require('got')
const defs = require('./defaults.json')

// Helper functions
if (!Array.prototype.last) {
	Array.prototype.last = function () {
		return this[this.length - 1]
	}
}

let ms_to_time = (s) => {
	let ms = s % 1000
	s = (s - ms) / 1000
	let secs = s % 60
	s = (s - secs) / 60
	let mins = s % 60
	let hrs = (s - mins) / 60

	return `\`${hrs}h ${mins}m ${secs}s\``
}

let cleantemp = (tmppath) => {
	if (fs.existsSync(tmppath)) fs.rmdirSync(tmppath, { recursive: true })
	fs.mkdirSync(tmppath)
	console.log('Emptied temp folder.')
}

// Get file extension based on url
let urlfileext = async (url) => {
	return await FileType.fromStream(got.stream(url))
}

// return msg file urls or false
let msgurls = (url) => {
	return [
		...url.matchAll(
			/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi
		)
	]
}

// return msg image or false
let msgimage = async (msg) => {
	let urls = await msgurls(msg.cleanContent).find(async (e) => {
		e = e[0]
		let xt = await urlfileext(e)
		return typeof e == 'string'
			? defs.filetypes.image.includes('.' + xt.ext)
			: false
	})
	return urls ? urls[0] : false
}
// return msg sheet or false
let msgsheet = (msg) => {
	return msg.attachments.find((e) =>
		defs.filetypes.sheet.includes('.' + e.name.split('.').last())
	)
}

module.exports = {
	ms_to_time: ms_to_time,
	cleantemp: cleantemp,
	msgimage: msgimage,
	msgsheet: msgsheet
}
