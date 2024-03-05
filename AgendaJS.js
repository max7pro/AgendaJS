	class AgendaJS {

		#options = {
			firstIsSunday: false
		}

		constructor (rootSelector, opts = {}) {
			this.loadJSLibs( () => 
				this.initialize(rootSelector, opts)
			)
		}

		loadJSLibs = async (callback) => {

			const
				plugins = [
					'utc', 'timezone', 'localeData', //'updateLocale'
				],
				imports = [
					'https://cdn.jsdelivr.net/npm/dayjs@1/dayjs.min.js',
					...plugins.map(p => `https://cdn.jsdelivr.net/npm/dayjs@1/plugin/${ p }.js`)
				]
			
			for (const url of imports) await import(url)
			plugins.forEach(p => dayjs.extend(window[`dayjs_plugin_${ p }`]))
			 
			this.log(['Timezone:', dayjs.tz.guess()])

			callback()
		}

		initialize = (rootSelector, opts) => {

			console.log('init2')
			this.#options = {
				...this.#options,
				...opts
			}

			this.agendaRoot = document.querySelector(rootSelector)

			this.log([this.agendaRoot, this.#options], 'Initialize')

			this.renderMonth()
		}

		renderMonth = () => {

			let lastDateCM = dayjs().daysInMonth(),
				// firstDayCM = dayjs().date(1).get('day'),
				// lastDayPM = dayjs().date(0).get('day'),
				firstDatePM = dayjs()
					.set('date', 0)
					.set('day', this.#options.firstIsSunday ? 0 : 1)
					.get('date'),
				lastDatePM = dayjs().date(0).daysInMonth()
			
			let
				aGrid = this._r('div', ['aGrid', 'aGrid_view_month'], this.agendaRoot),
				days = this.#options.firstIsSunday ?
					dayjs.weekdaysShort() : dayjs.weekdaysShort().slice(-6).concat( dayjs.weekdaysShort().shift() ),
				dates = this._range(firstDatePM, lastDatePM).concat( this._range(1, lastDateCM) )

			this.log([days, dates], 'Month grid')

			days.forEach(d => {
				let cell = this._r('div', ['aCell', 'aCell_day'], aGrid)
				cell.innerText = d
			})

			dates.forEach(d => {
				let cell = this._r('div', ['aCell', 'aCell_date'], aGrid)
				cell.innerText = d
			})

			
		}

		_range = (from, to) =>
			Array.from(
				{ length: (to - from) + 1 },
				(_, i) => from + i
			)
		_r = (tag, classes, parent) => {
			const el = document.createElement(tag)
			el.classList.add(...classes)
			return parent.appendChild(el)
		}

		log = (c, h = 'Log') => {
			console.group(`${ h }:`)
			Array.isArray(c) ?
				console.log(...c) :
				console.log(c)
			console.groupEnd()
		}
	}