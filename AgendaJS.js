class AgendaJS {

	#options = {
		firstIsSunday: false
	}

	constructor (rootSelector, opts = {}) {
		this.#loadJSLibs( () => 
			this.#initialize(rootSelector, opts)
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

	#initialize = (rootSelector, opts) => {

		this.#options = {
			...this.#options,
			...opts
		}

		dayjs.updateLocale('en', {
			weekStart: this.#options.firstIsSunday ? 0 : 1
		})

		this.agendaRoot = this._r( 'div', ['_a-canvas', '_a-m3'], document.querySelector(rootSelector) )

		this.log([this.agendaRoot, this.#options], 'Initialize AgendaJS')
		
		this.rndrMonthView( dayjs() )
	}
	
	rndrToolbar = (cntnt) => {
		const agendaToolbar = this._r('div', ['_a-toolbar', '_a-flex', '_a-justify-between', '_a-mb3'], this.agendaRoot)

		const template = `
			<div>
				<span class="_a-btn _a-btn-prev"><</span>
				<span class="_a-btn _a-btn-next">></span>
				<span class="_a-btn _a-btn-now">Today</span>
			</div>
			<div>${cntnt}</div>
			<div>
				<span class="_a-btn _a-btn-primary _a-btn-slctd">Month</span>
				<span class="_a-btn _a-btn-primary">Week</span>
				<span class="_a-btn _a-btn-primary">Day</span>
			</div>
		`

		agendaToolbar.innerHTML = template
	}

	rndrMonthView = (time) => {

		this.agendaRoot.innerHTML = null

		this.rndrToolbar(time.format('MMMM YYYY'))
		const aGrid = this._r('div', ['_a-grid', '_a-grid-view-month'], this.agendaRoot)

		let lastDateCM = time.daysInMonth(),
			pMDaysTotal = time.startOf('month').startOf('week').diff(time.startOf('month'), 'day'),
			nMDaysTotal = time.endOf('month').endOf('week').diff(time.endOf('month'), 'day')
						
		let dates = []

		if (pMDaysTotal) {
			
			let firstDatePM = time.startOf('month').startOf('week').get('date'),
				lastDatePM = time.startOf('month').startOf('week').daysInMonth()

			dates = dates.concat( this._range(firstDatePM, lastDatePM) )
			
		}
		
		dates = dates.concat(this._range(1, lastDateCM))
		
		if (nMDaysTotal) {
			let lastDateNM = time.endOf('month').endOf('week').get('date')
			dates = dates.concat( this._range(1, lastDateNM) )
		}
		
		let days = this.#options.firstIsSunday ?
				dayjs.weekdaysShort() : dayjs.weekdaysShort().slice(-6).concat( dayjs.weekdaysShort().shift() )

		this.log([days, dates], 'Month grid')

		days.forEach(d => {
			let cell = this._r('div', ['_a-cell', '_a-cell-day'], aGrid)
			cell.innerText = d
		})

		dates.forEach(d => {
			let cell = this._r('div', ['_a-cell', '_a-cell-date'], aGrid)
			cell.innerText = d
		})

		document.querySelector('._a-btn-prev').onclick = () => this.rndrMonthView( time.subtract(1, 'month') )
		document.querySelector('._a-btn-next').onclick = () => this.rndrMonthView( time.add(1, 'month') )
		document.querySelector('._a-btn-now').onclick = () => this.rndrMonthView( dayjs() )

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