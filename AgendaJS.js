class AgendaJS {
	#options = {
		firstIsSunday: false, // true, false
		defaultView: 'month',  // month, week, day
		logToConsole: true	// true, false
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
				'timezone', 'localeData', 'updateLocale'
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
		this.#dateTimePos = dayjs()

		this.agendaRoot = this._r('div', ['_a-canvas', '_a-m3'], document.querySelector(rootSelector))
		this.#initializeToolbar()
		this.aGrid = this._r('div', ['_a-grid'], this.agendaRoot)
		
		this.#preRender()

		this.log([[this.agendaRoot], this.#options], 'Initialize AgendaJS')
	}

	#preRender = ({view, time} = {}) => {

		this.#view = view ?? this.#view
		this.#dateTimePos = time ?? this.#dateTimePos

		while (this.aGrid.firstChild) this.aGrid.firstChild.remove()

		this[`${this.#view}View`](this.#dateTimePos)
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
			
			this.#preRender({ view: target.dataset.view })
		}

		document.querySelector('._a-btn-now').onclick = () => this.#preRender({ time: dayjs() }) 
		document.querySelector('._a-btn-prev').onclick = () => this.#preRender({ time: this.#dateTimePos.subtract(1, this.#view) })
		document.querySelector('._a-btn-next').onclick = () => this.#preRender({ time: this.#dateTimePos.add(1, this.#view) })
		
	}

	setTlbrHeading = (str) => this.agendaRoot.querySelector('._a-heading').innerText = str

	monthView = (time) => {
		
		this.setTlbrHeading(time.format('MMMM YYYY'))
		
		let monthEndDate = time.daysInMonth(),
			prevMonthDaysLenght = time.startOf('month').startOf('week').diff( time.startOf('month'), 'day' ),
			nextMonthDaysLenght = time.endOf('month').endOf('week').diff( time.endOf('month'), 'day' ),
			days = this.#options.firstIsSunday ?
				dayjs.weekdaysShort() :
				dayjs.weekdaysShort().slice(-6).concat( dayjs.weekdaysShort().shift() ),
			dates = []
						
		if (prevMonthDaysLenght) {
			let prevMonthStartDate = time.startOf('month').startOf('week').get('date'),
				prevMonthEndDate = time.startOf('month').startOf('week').daysInMonth()
			dates = dates.concat( this._range(prevMonthStartDate, prevMonthEndDate) )
		}
		
		dates = dates.concat( this._range(1, monthEndDate) )
		
		if (nextMonthDaysLenght) {
			let nextMonthEndDate = time.endOf('month').endOf('week').get('date')
			dates = dates.concat( this._range(1, nextMonthEndDate) )
		}
		
		days.forEach( d => this._r('div', ['_a-cell', '_a-cell-day'], this.aGrid).innerText = d )
		dates.forEach(d => this._r('div', ['_a-cell', '_a-cell-date'], this.aGrid).innerText = d)

		this.log([days, dates], 'Month grid')

	}

	weekView = (time) => {
		
		time = time.startOf('week') 
			
		let weekStart = time,
			weekEnd = time.endOf('week'),
			heading = weekStart.format('MMMM D, YYYY') + ' - ' + weekEnd.format('MMMM D, YYYY'),
			isMonthBoard = weekStart.get('month') != weekEnd.get('month'),
			hCells = []
		
		this.setTlbrHeading(heading)
		
		if ( isMonthBoard ) {					
			this._range( weekStart.get('date'), weekStart.endOf('month').get('date') ).forEach( d => {
				hCells.push({
					date: d,
					month: weekStart.get('month'),
					year: weekStart.get('year')
				})
			})
		} 

		this._range( isMonthBoard ? 1 : weekStart.get('date'), weekEnd.get('date') ).forEach( d => {
			hCells.push({
				date: d,
				month: weekEnd.get('month'),
				year: weekEnd.get('year')
			})
		})

		hCells.forEach( d => {
			let a = dayjs().year(d.year).month(d.month).date(d.date).format('ddd M/D')
			this._r('div', ['_a-cell', '_a-cell-weekday'], this.aGrid).innerText = a
		})

		this.log(hCells, 'Week grid')

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
		if (!this.#options.logToConsole) return
		console.group(`${ h }:`)
		Array.isArray(c) ? console.log(...c) : console.log(c)
		// if (Array.isArray(c)) {
		// 	c.forEach(val => {
		// 		(typeof val === 'object') ? console.dir(val) : console.log(val)
		// 	})
		// } else {
		// 	console.log(c)
		// }
		console.groupEnd()
	}
	
}