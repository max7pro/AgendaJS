class AgendaJS {

	#options = {
		firstIsSunday: false
	}

	constructor (rootSelector, opts = {}) {
		this.#loadJSLibs( () => 
			this.#initializeApp(rootSelector, opts)
		)
	}

	#loadJSLibs = async (callback) => {

		const
			plugins = [
				'weekOfYear', 'utc', 'timezone', 'localeData', 'updateLocale'
			],
			imports = [
				'https://cdn.jsdelivr.net/npm/dayjs@1/dayjs.min.js',
				...plugins.map(p => `https://cdn.jsdelivr.net/npm/dayjs@1/plugin/${ p }.js`)
			]
		
		for (const url of imports) await import(url)
		plugins.forEach(p => dayjs.extend(window[`dayjs_plugin_${ p }`]))
			
		this.log(['Timezone:', dayjs.tz.guess()], 'Initialize dayJS')

		callback()
	}

	#initializeApp = (rootSelector, opts) => {

		this.#options = {
			...this.#options,
			...opts
		}

		dayjs.updateLocale('en', {
			weekStart: this.#options.firstIsSunday ? 0 : 1
		})

		this.agendaRoot = this._r('div', ['_a-canvas', '_a-m3'], document.querySelector(rootSelector))
		this.#initializeToolbar()
		this.aGrid = this._r('div', ['_a-grid', '_a-grid-view-month'], this.agendaRoot)

		this.log([this.agendaRoot, this.#options], 'Initialize AgendaJS')
		
		// this.monthView()
		document.querySelector('[data-view="month"]').click()
	}
	
	#initializeToolbar = () => {
		const toolbar = this._r('div', ['_a-toolbar', '_a-flex', '_a-justify-between', '_a-mb3'], this.agendaRoot)
		toolbar.innerHTML = `
			<div>
				<span class="_a-btn _a-btn-prev"><</span>
				<span class="_a-btn _a-btn-next">></span>
				<span class="_a-btn _a-btn-now">Today</span>
			</div>
			<div class="_a-heading"></div>
			<div class="_a-view-switch">
				<span data-view="month" class="_a-btn _a-btn-primary _a-btn-slctd">Month</span>
				<span data-view="week" class="_a-btn _a-btn-primary">Week</span>
				<span data-view="day" class="_a-btn _a-btn-primary">Day</span>
			</div>
		`
		toolbar.querySelector('._a-view-switch').onclick = ({target}) => {

			toolbar.querySelectorAll('._a-view-switch ._a-btn').forEach( btn => btn.classList.remove('_a-btn-slctd') )
			target.classList.add('_a-btn-slctd')

			this.agendaRoot.dataset.view = target.dataset.view
			
			this[`${ target.dataset.view }View`]()
		}

		document.querySelector('._a-btn-now').onclick = () => this[`${ this.agendaRoot.dataset.view }View`]()

		// document.querySelector('._a-btn-prev').onclick = () =>
		// 	this[`${ this.agendaRoot.dataset.view }View`]( time.subtract(1, this.agendaRoot.dataset.view) )
		// document.querySelector('._a-btn-next').onclick = () =>
		// 	this[`${ this.agendaRoot.dataset.view }View`]( time.add(1, this.agendaRoot.dataset.view) )
		
	}

	setTlbrHeading = (str) => document.querySelector('._a-heading').innerText = str

	monthView = (time = dayjs()) => {
		
		this.setTlbrHeading(time.format('MMMM YYYY'))
		
		while (this.aGrid.firstChild) this.aGrid.firstChild.remove()

		let lastDateCM = time.daysInMonth(),
			pMDaysTotal = time.startOf('month').startOf('week').diff(time.startOf('month'), 'day'),
			nMDaysTotal = time.endOf('month').endOf('week').diff(time.endOf('month'), 'day')
						
		let dates = []

		if (pMDaysTotal) {
			
			let firstDatePM = time.startOf('month').startOf('week').get('date'),
				lastDatePM = time.startOf('month').startOf('week').daysInMonth()

			dates = dates.concat( this._range(firstDatePM, lastDatePM) )
			
		}
		
		dates = dates.concat( this._range(1, lastDateCM) )
		
		if (nMDaysTotal) {
			let lastDateNM = time.endOf('month').endOf('week').get('date')
			dates = dates.concat( this._range(1, lastDateNM) )
		}
		
		let days = this.#options.firstIsSunday ?
				dayjs.weekdaysShort() : dayjs.weekdaysShort().slice(-6).concat( dayjs.weekdaysShort().shift() )

		this.log([days, dates], 'Month grid')

		days.forEach(d => {
			this._r('div', ['_a-cell', '_a-cell-day'], this.aGrid).innerText = d
		})

		dates.forEach(d => {
			this._r('div', ['_a-cell', '_a-cell-date'], this.aGrid).innerText = d
		})

		document.querySelector('._a-btn-prev').onclick = () => this.monthView( time.subtract(1, 'month') )
		document.querySelector('._a-btn-next').onclick = () => this.monthView( time.add(1, 'month') )

	}

	weekView = (time = dayjs()) => {

		this.setTlbrHeading(time.format('d') )
		while (this.aGrid.firstChild) this.aGrid.firstChild.remove()

		let week = time.week()
			// weekStart = week.startOf('week'),
			// weekEnd = week.endOff('week')

		console.log('wwe', week);
	}

	dayView = (time = dayjs()) => {
		this.setTlbrHeading( time.format('MMMM D, YYYY') )
		while (this.aGrid.firstChild) this.aGrid.firstChild.remove()
	}

	_range = (from, to) => Array.from(
			{ length: (to - from) + 1 },
			(_, i) => from + i
		)
	_r = (tag, classes, parent) => {
		const el = document.createElement(tag)
		Array.isArray(classes) ? el.classList.add(...classes) : el.classList = classes
		return parent.appendChild(el)
	}
	log = (c, h = 'Log') => {
		console.group(`${ h }:`)
		Array.isArray(c) ? console.log(...c) : console.log(c)
		console.groupEnd()
	}
	
}