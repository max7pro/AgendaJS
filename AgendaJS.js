class AgendaJS {
	#options = {
		defaultView: 'week',  // month, week, day
		firstIsSunday: false, // true, false
		dayStartAM: 6,
		dayEndPM: 9,
		logToConsole: true,	// true, false
	}
	#view
	#dateTimePos

	constructor (rootSelector, opts = {}) {
		this.#loadJSLibs( () => 
			this.#initializeApp(rootSelector, opts)
		)
	}

	#loadJSLibs = async (callback) => {

		const
			plugins = [
				'timezone', 'localeData', 'updateLocale', 'advancedFormat' 
			],
			imports = [
				'https://cdn.jsdelivr.net/npm/dayjs@1/dayjs.min.js',
				...plugins.map(p => `https://cdn.jsdelivr.net/npm/dayjs@1/plugin/${ p }.js`)
			]
		
		for (const url of imports) await import(url)
		plugins.forEach( p => dayjs.extend( window[`dayjs_plugin_${ p }`] ) )

		this.log(['Timezone: ' + dayjs.tz.guess(), 'Locale: ' + dayjs.locale()], 'Initialize dayJS')

		callback()
	}

	#initializeApp = (rootSelector, opts) => {

		this.#options = {
			...this.#options,
			...opts
		}

		dayjs.updateLocale( dayjs.locale(), {
			weekStart: this.#options.firstIsSunday ? 0 : 1
		})
		this.#view = this.#options.defaultView
		this.#dateTimePos = dayjs().startOf('D')

		this.agendaRoot = this._r('div', ['_a-canvas', '_a-m3'], document.querySelector(rootSelector))
		this.#initializeToolbar()
		this.aGrid = this._r('div', ['_a-grid'], this.agendaRoot)

		this.log([[this.agendaRoot], this.#options, this.#dateTimePos], 'Initialize AgendaJS')
		
		this.#preRender()
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
			<div class="_a-view-switch _a-flex">
				<span data-view="month" class="_a-btn _a-btn-primary">Month</span>
				<span data-view="week" class="_a-btn _a-btn-primary">Week</span>
				<span data-view="day" class="_a-btn _a-btn-primary">Day</span>
			</div>
		`
		toolbar.querySelector(`[data-view="${ this.#options.defaultView }"]`).classList.add('_a-btn-slctd')
		toolbar.querySelector('._a-view-switch').onclick = ({target}) => {
			toolbar.querySelectorAll('._a-view-switch ._a-btn').forEach( btn => btn.classList.remove('_a-btn-slctd') )
			target.classList.add('_a-btn-slctd')
			this.#preRender({ view: target.dataset.view })
		}
		document.querySelector('._a-btn-now').onclick = () => this.#preRender({ time: dayjs() }) 
		document.querySelector('._a-btn-prev').onclick = () => this.#preRender({ time: this.#dateTimePos.subtract(1, this.#view) })
		document.querySelector('._a-btn-next').onclick = () => this.#preRender({ time: this.#dateTimePos.add(1, this.#view) })
	}

	#preRender = ({view, time} = {}) => {

		this.#view = view ?? this.#view
		this.#dateTimePos = time ?? this.#dateTimePos

		while (this.aGrid.firstChild) this.aGrid.firstChild.remove()

		this.aGrid.className = `_a-grid _a-grid-${ this.#view }`

		this.log([this.#view, this.#dateTimePos.format('ddd, MMMM D, YYYY HH:mm A')], 'Prerender')

		this[`${ this.#view }View`](this.#dateTimePos)
	}

	setHeading = (str) => this.agendaRoot.querySelector('._a-heading').innerText = str
	
	monthView = (time) => {
		
		this.setHeading( time.format('MMMM YYYY') )
				
		let start = time.startOf('month').startOf('week'),
			end = time.endOf('month').endOf('week'),
			diff = end.diff(start, 'day'),
			cells = [],
			hCells = this.#options.firstIsSunday ?
				dayjs.weekdaysShort() :
				dayjs.weekdaysShort().slice(-6).concat( dayjs.weekdaysShort().shift() )

		while (cells.length <= diff) 
			cells.push( start.add(cells.length, 'day') )
				
		hCells.forEach(d => this._r('div', ['_a-cell', '_a-cell-label'], this.aGrid).innerText = d)
		cells.forEach(d => this._r('div', ['_a-cell'], this.aGrid).innerText = d.date())
	
		this.log([hCells, cells], 'Month grid')

	}

	weekView = (time) => {
				
		let start = time.startOf('week'),
			end = time.endOf('week'),
			diff = end.diff(start, 'day'),
			hCells = [],

			listStart = dayjs(`1/1/1 ${ this.#options.dayStartAM }:00 AM`),
			listEnd = dayjs(`1/1/1 ${ this.#options.dayEndPM }:00 PM`),
			cells = [],

			heading = start.format('MMMM D, YYYY') + ' - ' + end.format('MMMM D, YYYY')
		
		this.setHeading(heading)

		while (hCells.length <= diff)
			hCells.push( start.add(hCells.length, 'day') )
		
		let h = listStart
		cells.push(h)
		while ( h.hour() < listEnd.hour() ) {
			h = h.add(30, 'minute')
			cells.push(h)
		}

		this._r('div', ['_a-cell'], this.aGrid)
		hCells.forEach(d => this._r('div', ['_a-cell', '_a-cell-label-horizontal'], this.aGrid).innerText = d.format('ddd M/D'))

		this._r('div', ['_a-cell', '_a-cell-label-vertical'], this.aGrid).innerText = 'all-day'
		for (let cell = 1; cell <= hCells.length; cell++) {
			this._r('div', ['_a-cell'], this.aGrid)
		}

		cells.forEach(t => {
			
			let halfHour = t.minute() ? true : false
			console.log(t.minute(), halfHour);
			this._r(
				'div',
				'_a-cell _a-cell-label-vertical' + (halfHour ? ' _a-cell-half-hour' : ''),
				this.aGrid
			).innerText = t.format('h:mm a')
			for (let cell = 1; cell <= hCells.length; cell++) {
				this._r('div', '_a-cell' + (halfHour ? ' _a-cell-half-hour' : ''), this.aGrid)
			}
		})

		this.log([hCells, cells], 'Week grid')

	}

	dayView = (time = dayjs()) => {
		this.setHeading( time.format('MMMM D, YYYY') )
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
		if (!this.#options.logToConsole) return
		console.group(`${ h }:`)
		Array.isArray(c) ? console.log(...c) : console.log(c)
		console.groupEnd()
	}
	
}