class AgendaJS {

	constructor (element) {
		this.clndr = document.querySelector(element)

		this.log(this.clndr, 'Init')

		this.render()

	}

	render = () => {
		let today = new Date()
		this.log(today, 'Today');
	}

	log = (c, h = 'Log:') => {
		console.group(`${ h }:`)
		Array.isArray(c) ?
			console.log(...c) :
			console.log(c) 
		console.groupEnd()
	}
}