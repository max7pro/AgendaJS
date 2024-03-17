class AgendaJS {
	// Default values for AgendaJS options
	#options = {
		defaultView: 'month',  	// Type of view to on page loading - month, week, day
		firstIsSunday: false, 	// Whether to output Sunday as the first day of the week - true, false
		dayStartAM: 6, 			// First hour of event list for week and day view, 1-12 AM	
		dayEndPM: 11, 			// Last hour of event list for week and day view, 1-12 PM
		logToConsole: false, 	// Whether to output debug messages to console - true, false

		fieldOne: 'name',		// Name of the 1st field to use in event object and its JSON representation
		fieldTwo: 'phone',		// Same for 2nd field

		// Colors for events labels
		colors: [
			'#178bb2FF',
			'#48B4A9FF',
			'#8268AEFF',
			'#F2413DFF',
			'#2FB079FF',
			'#FFD35E',
		],
		// Strings for static text content
		strings: {
			allDayLabel: 'all-day',
			collectBtnLabel: 'Collect',
			popup: {
				fieldOneLabel: 'Name',
				fieldTwoLabel: 'Phone',
				heading: 'Event for',
				timeFormat: 'h:mm A, dddd, MMMM D, YYYY', // dayjs format, see https://day.js.org/docs/en/display/format
				saveBtnLabel: 'Save',
				cancelBtnLabel: 'Cancel'
			}
		},
		// Data to put to AgendaJS instance on page loading 
		payload: {
			// list of events to be output on calendar loading
			events: {},
			// list of dates, to block ability to create new events
			// because 'all-days' button was clicked and events for this date was saved
			freezed: [],
		}
	}

	#initialized = false
	#apiEvents = {}
	#view
	#agendaRoot
	#aGrid
	#popup = null
	#datetime
	#eventsStorage = {}
	#freezedStorage = []

	#icons = {
		'calendar-plus': 'data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiAgd2lkdGg9IjI0IiAgaGVpZ2h0PSIyNCIgIHZpZXdCb3g9IjAgMCAyNCAyNCIgIGZpbGw9Im5vbmUiICBzdHJva2U9ImN1cnJlbnRDb2xvciIgIHN0cm9rZS13aWR0aD0iMSIgIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgIHN0cm9rZS1saW5lam9pbj0icm91bmQiICBjbGFzcz0iaWNvbiBpY29uLXRhYmxlciBpY29ucy10YWJsZXItb3V0bGluZSBpY29uLXRhYmxlci1jYWxlbmRhci1wbHVzIj48cGF0aCBzdHJva2U9Im5vbmUiIGQ9Ik0wIDBoMjR2MjRIMHoiIGZpbGw9Im5vbmUiLz48cGF0aCBkPSJNMTIuNSAyMWgtNi41YTIgMiAwIDAgMSAtMiAtMnYtMTJhMiAyIDAgMCAxIDIgLTJoMTJhMiAyIDAgMCAxIDIgMnY1IiAvPjxwYXRoIGQ9Ik0xNiAzdjQiIC8+PHBhdGggZD0iTTggM3Y0IiAvPjxwYXRoIGQ9Ik00IDExaDE2IiAvPjxwYXRoIGQ9Ik0xNiAxOWg2IiAvPjxwYXRoIGQ9Ik0xOSAxNnY2IiAvPjwvc3ZnPg==',
	}

	constructor ( rootSelector, opts = {} ) {
		( async () => {
			await this.#loadJSLibs()
			this.#initializeApp( rootSelector, opts )
		} )()
	}

	#loadJSLibs = () => new Promise( async ( resolve ) => {
		const
			plugins = [
				'timezone', 
				'localeData', 
				'updateLocale'
			],
			imports = [
				'https://cdn.jsdelivr.net/npm/dayjs@1/dayjs.min.js',
				...plugins.map( p => `https://cdn.jsdelivr.net/npm/dayjs@1/plugin/${ p }.js` )
			]
		
		for ( const url of imports ) await import( url )
		plugins.forEach( p => dayjs.extend( window[`dayjs_plugin_${ p }`] ) )
		resolve()

		this.#_l( ['[Timezone:] ' + dayjs.tz.guess(), '[Locale:] ' + dayjs.locale()], 'dayJS has been initialized' )
		
	} )
	
	#initializeApp ( rootSelector, opts ) {

		this.#options = {
			...this.#options,
			...opts
		}
		
		dayjs.updateLocale( dayjs.locale(), {
			weekStart: this.#options.firstIsSunday ? 0 : 1
		} )

		this.#datetime = dayjs().startOf( 'D' )
		this.#view = this.#options.defaultView
		this.#eventsStorage = this.#options.payload.events ?? {}
		this.#freezedStorage = this.#options.payload.freezed ?? []

		this.#agendaRoot = this.#_r( 'div', ['_a-canvas', '_a-m3'], document.querySelector( rootSelector ) )
		this.#initializeToolbar()
		this.#aGrid = this.#_r( 'div', ['_a-grid'], this.#agendaRoot )
		
		this.#initialized = true

		this.#_l( this, 'AgendaJS has been initialized' )

		this.#preRender()
	}

	#initializeToolbar () {
		const toolbar = this.#_r( 'div', ['_a-toolbar', '_a-flex', '_a-justify-between', '_a-mb3'], this.#agendaRoot )
		toolbar.innerHTML = `
			<div>
				<span class="_a-btn _a-btn-prev"><</span>
				<span class="_a-btn _a-btn-next">></span>
				<span class="_a-btn _a-btn-now">Today</span>
			</div>
			<div class="_a-heading"></div>
			<div class="_a-view-switch _a-flex">
				<span data-view="month" class="_a-btn _a-btn-primary">Month</span>
				<span data-view="week" class="_a-btn _a-btn-primary _a-br0 _a-bl0">Week</span>
				<span data-view="day" class="_a-btn _a-btn-primary">Day</span>
			</div>
			`
		toolbar.querySelector( '._a-view-switch' ).onclick = ( { target } ) => this.#preRender( { view: target.dataset.view } )
		toolbar.querySelector( '._a-btn-now' ).onclick = () => this.#preRender( { time: dayjs().startOf( 'D' ) } )
		toolbar.querySelector( '._a-btn-prev' ).onclick = () => this.#preRender( { time: this.#datetime.subtract( 1, this.#view ) } )
		toolbar.querySelector( '._a-btn-next' ).onclick = () => this.#preRender( { time: this.#datetime.add( 1, this.#view ) } )
		
	}

	#preRender ( { view, time } = {} ) {

		this.#view = view ?? this.#view
		this.#datetime = time ?? this.#datetime

		this.#aGrid.innerHTML = null
		this.#aGrid.className = `_a-grid _a-grid-${ this.#view }`
		document.querySelectorAll( '._a-view-switch ._a-btn' ).forEach( btn => btn.classList.remove( '_a-btn-slctd' ) )
		document.querySelector( `[data-view="${ this.#view }"]` ).classList.add( '_a-btn-slctd' )

		this.#_l( [
			'[Time:] ' + this.#datetime.format( 'ddd, MMMM D, YYYY HH:mm A' ),
			'[View:] ' + this.#view,
			// '[Events:] ', this.#eventsStorage
		], 'Prerender' )

		// this[`dayView`]( this.#datetime )
		// eval( `this.#${ this.#view }View( this.#datetime )` )
		switch ( this.#view ) {
			case 'month':
				this.#monthGrid( this.#datetime )
				if ( Object.keys(this.#eventsStorage).length ) this.#monthEvents( this.#eventsStorage )
				break
			case 'week':
				this.#weekGrid( this.#datetime )
				if ( Object.keys(this.#eventsStorage).length ) this.#weekEvents( this.#eventsStorage )
				break
			case 'day':
				this.#dayGrid( this.#datetime )
				if ( Object.keys(this.#eventsStorage).length ) this.#dayEvents( this.#eventsStorage )
				break
			default: return
		}
	}

	#dayGrid ( time ) {

		let rowStart = dayjs( `1/1/1 ${ this.#options.dayStartAM }:00 AM` ),
			rowEnd = dayjs( `1/1/1 ${ this.#options.dayEndPM }:00 PM` ),
			heading = time.format( 'MMMM D, YYYY' ),
			hCell = time.format( 'dddd' ),
			cells = []

		let rowTime = rowStart
		cells.push( rowTime )
		while ( rowTime.hour() < rowEnd.hour() ) {
			rowTime = rowTime.add( 30, 'minute' )
			cells.push( rowTime )
		}

		this.#setHeading( heading )

		this.#_r( 'div', ['_a-cell', '_a-center-align'], this.#aGrid ).innerText = hCell

		this.#_r( 'div', ['_a-cell', '_a-right-align'], this.#aGrid ).innerText = this.#options.strings.allDayLabel
		// this.#_r( 'div', ['_a-cell'], this.#aGrid )

		const isActive = Object.keys( this.#eventsStorage ).some( ts =>
			time.startOf( 'date' ).unix() == dayjs.unix( ts ).startOf( 'date' ).unix()
		)
		let btn = this.#_r( 'div', ['_a-cell', '_a-center-align'], this.#aGrid )
		if (isActive) {
			btn = this.#_r( 'div', ['_a-btn', '_a-btn-primary', '_a-btn-link'], btn )

			btn.innerText = this.#options.strings.collectBtnLabel
			btn.dataset.min = time.hour( rowStart.hour() ).minute( rowStart.minute() ).unix()
			btn.dataset.max = time.hour( rowEnd.hour() ).minute( rowEnd.minute() ).unix()

			btn.onclick = () => {
				const events = Object.fromEntries(
					Object.entries( this.#eventsStorage ).filter( ( [ts] ) => ts >= btn.dataset.min && ts <= btn.dataset.max )
				)
				if ( Object.keys( events ).length ) {
					if ( !this.#freezedStorage.includes( time.unix() ) ) {
						this.#freezedStorage.push( time.unix() )
						this.#preRender()
					}
					this.#fireEvt( 'onDayEventsObtained', time.unix(), events )
				}
			}
		}

		cells.forEach( obj => {

			const halfHour = obj.minute() ? true : false

			this.#_r(
				'div', '_a-cell _a-right-align' + ( halfHour ? ' _a-label-30-mins' : '' ),
				this.#aGrid
			)
			.innerText = obj.format( 'h:mm a' )

			let cell = this.#_r( 'div', '_a-cell' + ( halfHour ? ' _a-cell-30-mins' : '' ), this.#aGrid )
			cell.dataset.ts = time.hour( obj.hour() ).minute( obj.minute() ).unix()

			if (
				cell.dataset.ts > dayjs().unix() &&
				!this.#eventsStorage[cell.dataset.ts] &&
				!this.#freezedStorage.includes( time.unix() )
			) {

				let btnPlus = this.#_r( 'span', ['_a-cell-btn-plus'], cell )
				btnPlus.innerHTML = `<img src=${ this.#icons['calendar-plus'] }>`

				btnPlus.addEventListener( 'click', e => {
					e.stopPropagation()
					this.#newEvent( cell.dataset.ts )
				} )
			}

			cell.onmouseenter = () =>
				this.#_getPrvsSblng( cell, '_a-right-align' ).classList.add( '_a-row-hover' )
			cell.onmouseleave = () =>
				this.#_getPrvsSblng( cell, '_a-right-align' ).classList.remove( '_a-row-hover' )
		} )

		this.#_l( [cells], 'Day grid rendering' )

	}
	#dayEvents ( evnts ) {

		let min = Number.parseInt( this.#aGrid.querySelector( '._a-cell[data-ts]' ).dataset.ts ),
			max = Number.parseInt( this.#aGrid.querySelector( '._a-cell[data-ts]:last-child' ).dataset.ts ),
			events = Object.fromEntries(
				Object.entries( evnts ).filter( ( [ts] ) => ts >= min && ts <= max )
			)
		
		for ( const ts in events ) {			
			this.#aGrid.querySelector( `[data-ts="${ ts }"]` ).innerText =
				`${ this.#options.strings.popup.fieldOneLabel }: ${ events[ts][this.#options.fieldOne] }` +
				` ${ this.#options.strings.popup.fieldTwoLabel }: ${ events[ts][this.#options.fieldTwo] }`
		}

		this.#_l( [events], 'Events badges rendering' )
	}

	#weekGrid ( time ) {
				
		let start = time.startOf( 'week' ),
			end = time.endOf( 'week' ),
			diff = end.diff( start, 'day' ),
			hCells = [],
			rowStart = dayjs( `1/1/1 ${ this.#options.dayStartAM }:00 AM` ),
			rowEnd = dayjs( `1/1/1 ${ this.#options.dayEndPM }:00 PM` ),
			cells = [],
			heading = start.format( 'MMMM D, YYYY' ) + ' - ' + end.format( 'MMMM D, YYYY' )
		
		while ( hCells.length <= diff )
			hCells.push( start.add( hCells.length, 'day' ) )
		
		let rowTime = rowStart
		cells.push( rowTime )
		while ( rowTime.hour() < rowEnd.hour() ) {
			rowTime = rowTime.add( 30, 'minute' )
			cells.push( rowTime )
		}

		this.#setHeading( heading )

		this.#_r( 'div', ['_a-cell'], this.#aGrid )
		hCells.forEach( label =>
			this.#_r( 'div', ['_a-cell', '_a-center-align'], this.#aGrid ).innerText = label.format( 'ddd D' )
		)

		this.#_r( 'div', ['_a-cell', '_a-right-align'], this.#aGrid ).innerText = this.#options.strings.allDayLabel

		for ( let cell = 0; cell < hCells.length; cell++ ) {
			
			const isActive = Object.keys( this.#eventsStorage ).some( ts =>
				hCells[cell].startOf( 'date' ).unix() == dayjs.unix( ts ).startOf( 'date' ).unix()
			)
			
			let btn = this.#_r( 'div', ['_a-cell', '_a-center-align'], this.#aGrid )
			
			if ( isActive ) {

				btn = this.#_r( 'div', ['_a-btn', '_a-btn-primary', '_a-btn-link'], btn )

				btn.innerText = this.#options.strings.collectBtnLabel
				btn.dataset.min = hCells[cell].hour( rowStart.hour() ).minute( rowStart.minute() ).unix()
				btn.dataset.max = hCells[cell].hour( rowEnd.hour() ).minute( rowEnd.minute() ).unix()
				btn.onclick = () => {
					const events = Object.fromEntries(
						Object.entries( this.#eventsStorage ).filter( ( [ts] ) => ts >= btn.dataset.min && ts <= btn.dataset.max )
					)
					if ( Object.keys( events ).length ) {
						if ( !this.#freezedStorage.includes( hCells[cell].unix() ) ) {
							this.#freezedStorage.push( hCells[cell].unix() )
							this.#preRender()
						}
						this.#fireEvt( 'onDayEventsObtained', hCells[cell].unix(), events )
					}
				}
			}
						
		}

		cells.forEach( obj => {

			const halfHour = obj.minute() ? true : false

			this.#_r(
				'div', '_a-cell _a-right-align' + ( halfHour ? ' _a-label-30-mins' : '' ),
				this.#aGrid
			)
			.innerText = obj.format( 'h:mm a' )
			
			for ( let day = 0; day < hCells.length; day++ ) {

				let cell = this.#_r( 'div', '_a-cell _a-flex _a-flex-align-center' + ( halfHour ? ' _a-cell-30-mins' : '' ), this.#aGrid )
				cell.dataset.ts = hCells[day].hour( obj.hour() ).minute( obj.minute() ).unix()
 
				if (
					cell.dataset.ts > dayjs().unix() &&
					!this.#eventsStorage[cell.dataset.ts] &&
					!this.#freezedStorage.includes( hCells[day].unix() )
				) {
					let btnPlus = this.#_r( 'span', ['_a-cell-btn-plus'], cell )
					btnPlus.innerHTML = `<img src=${ this.#icons['calendar-plus'] }>`
					btnPlus.addEventListener( 'click', e => {
						e.stopPropagation()
						this.#newEvent( cell.dataset.ts )
					} )
				}
				
				cell.onclick = () =>
					this.#preRender( { time: hCells[day], view: 'day' } )
				cell.onmouseenter = () =>
					this.#_getPrvsSblng( cell, '_a-right-align' ).classList.add( '_a-row-hover' )
				cell.onmouseleave = () =>
					this.#_getPrvsSblng( cell, '_a-right-align' ).classList.remove( '_a-row-hover' )
			}
		} )

		this.#_l( [hCells, cells], 'Week grid rendering' )
	}
	#weekEvents ( evnts) {

		let min = Number.parseInt( this.#aGrid.querySelector( '._a-cell[data-ts]' ).dataset.ts ),
			max = Number.parseInt( this.#aGrid.querySelector( '._a-cell[data-ts]:last-child' ).dataset.ts ),
			colors = this.#_clone( this.#options.colors ),
			events = Object.fromEntries(
				Object.entries( evnts ).filter( ( [ts] ) => ts >= min && ts <= max )
			)

		for ( const ts in events ) {
			if ( !colors.length ) colors = this.#_clone( this.#options.colors )
			let badge = this.#_r( 'span', '_a-event-badge', this.#aGrid.querySelector( `[data-ts="${ ts }"]` ) )
			badge.innerHTML = events[ts][this.#options.fieldOne] + ' ' + events[ts][this.#options.fieldTwo]
			badge.style.backgroundColor = colors.shift()
		}

		this.#_l( [events], 'Events badges rendering' )
	}

	#monthGrid ( time ) {

		const
			start = time.startOf( 'month' ).startOf( 'week' ),
			end = time.endOf( 'month' ).endOf( 'week' ),
			diff = end.diff( start, 'day' ),
			heading = time.format( 'MMMM YYYY' ),
			cells = [],
			hCells = this.#options.firstIsSunday ?
				dayjs.weekdaysShort() :
				dayjs.weekdaysShort().slice( -6 ).concat( dayjs.weekdaysShort().shift() )

		while ( cells.length <= diff )
			cells.push( start.add( cells.length, 'day' ) )

		this.#setHeading( heading )

		hCells.forEach( label =>
			this.#_r( 'div', ['_a-cell', '_a-center-align'], this.#aGrid ).innerText = label
		)
		cells.forEach( obj => {
			const cell = this.#_r( 'div', ['_a-cell'], this.#aGrid )
			cell.innerText = obj.date()
			cell.dataset.ts = obj.unix()
			cell.onclick = () => this.#preRender( { time: obj, view: 'day' } )
		} )

		this.#_l( [hCells, cells], 'Month grid rendering' )

	}
	#monthEvents ( evnts ) {

		const
			min = Number.parseInt( this.#aGrid.querySelector( '._a-cell[data-ts]' ).dataset.ts ),
			max = Number.parseInt( this.#aGrid.querySelector( '._a-cell[data-ts]:last-child' ).dataset.ts ),
			events = {}

		for ( let ts in evnts ) {
			if ( ts >= min && ts <= max ) {
				let date = dayjs.unix( ts ).startOf( 'date' ).unix()
				if ( !events.hasOwnProperty( date ) ) events[date] = []
				events[date].push(
					Object.assign( this.#_clone( evnts[ts] ), { timestamp: ts } )
				)
			}
		}

		for ( let date in events ) {
			let colors = this.#_clone( this.#options.colors ),
				group = this.#_r( 'span', ['_a-events-group', '_a-flex', '_a-flex-column'], this.#aGrid.querySelector( `[data-ts="${ date }"]` ) )

			events[date].forEach( event => {
				if ( !colors.length ) colors = this.#_clone( this.#options.colors )
				const badge = this.#_r( 'span', '_a-event-badge', group )
				badge.innerText = dayjs.unix( event.timestamp ).format( 'h:mm A' )
				badge.style.backgroundColor = colors.shift()
			} )
		}

		this.#_l( [events], 'Events badges rendering' )
	}
	
	#setHeading ( str ) {
		this.#agendaRoot.querySelector( '._a-heading' ).innerText = str
	}

	#newEvent ( time ) {

		if ( this.#popup ) return 

		this.#popup = this.#_r( 'div', ['_a-popup-overlay'], this.#agendaRoot )

		const
			popup = this.#_r( 'div', ['_a-event-popup', '_a-flex', '_a-flex-column', '_a-p4'], this.#popup ),
			save = () => {
				const
					field1 = this.#popup.querySelector( '._a-input-label > input' ),
					field2 = this.#popup.querySelector( '._a-input-label + ._a-input-label > input' )
				
				this.#popup.querySelectorAll( 'input' ).forEach( input => {
					if ( !input.value.length ) {
						input.classList.add( '_a-input-error' )
						input.addEventListener( 'input', ( { target } ) => {
							target.classList.remove( '_a-input-error' )
						}, { once: true } )
					}
				})
				if ( !field1.value.length || !field2.value.length ) return
				
				this.#eventsStorage[time] = {}
				this.#eventsStorage[time][this.#options.fieldOne] = field1.value
				this.#eventsStorage[time][this.#options.fieldTwo] = field2.value

				let event = { time }
				event[this.#options.fieldOne] = field1.value
				event[this.#options.fieldTwo] = field2.value
				this.#fireEvt( 'onNewEventCreated', event )

				close()
				this.#preRender()

				this.#_l( this.#eventsStorage, 'Event created' )
			},
			close = () => {
				document.removeEventListener( 'keydown', check )
				this.#popup.remove()
				this.#popup = null
			},
			check = (e) => {
				if ( e.key === 'Escape' ) close()
			}

		const heading = this.#options.strings.popup.heading + ' ' + dayjs.unix( time ).format( this.#options.strings.popup.timeFormat )
		
		popup.innerHTML = `
			<div class="_a-popup-heading">${ heading }</div>
			<div class="_a-input-label _a-mt4">
				<input type="text" placeholder="">
				<label >${ this.#options.strings.popup.fieldOneLabel }</label>
			</div>
			<div class="_a-input-label _a-mt4">
				<input type="text" placeholder="">
				<label>${ this.#options.strings.popup.fieldTwoLabel }</label>
			</div>
			<div class="_a-flex _a-justify-space-evenly _a-mt4">
				<button class="_a-btn _a-btn-primary _a-btn-save">${ this.#options.strings.popup.saveBtnLabel }</button>
				<button class="_a-btn _a-btn-primary _a-btn-cancel">${ this.#options.strings.popup.cancelBtnLabel }</button>
			</div>
		`

		this.#popup.querySelector( '._a-btn-save' ).onclick = save
		this.#popup.querySelector( '._a-btn-cancel' ).onclick = close
		this.#popup.onkeydown = (e) => {
			if ( e.key === 'Enter' ) save()
		}
		document.addEventListener( 'keydown', check)
	}

	// Helpers
	#_r ( tag, classes, parent ) {
		const el = document.createElement( tag )
		if (classes.length) 
			Array.isArray(classes) ? el.classList.add(...classes) : el.classList = classes
		return parent.appendChild(el)
	}

	#_clone(value) {
		return JSON.parse( JSON.stringify( value ) )
	}

	#_getPrvsSblng (element, className) {
		while ( element ) {
			element = element.previousElementSibling;
			if ( element && element.classList.contains( className ) )
				return element;
		}
		return null;
	}

	#_l ( c, h = 'Log' ) {
		if (!this.#options.logToConsole) return
		console.group(`${ h }:`)
		Array.isArray(c) ? console.log(...c) : console.log(c)
		console.groupEnd()
	}

	#bindEvtListener ( eventName, callback ) {
		if ( !this.#apiEvents[eventName] ) {
			this.#apiEvents[eventName] = []
		}
		this.#apiEvents[eventName].push( callback )
	}
	#unbindEvtListener ( eventName, callback ) {
		if ( this.#apiEvents[eventName] ) {
			this.#apiEvents[eventName] =
				this.#apiEvents[eventName].filter( cb => cb !== callback )
		}
	}
	#fireEvt ( eventName, ...args ) {
		if ( this.#apiEvents[eventName] ) {
			this.#apiEvents[eventName].forEach( callback => callback( ...args ) )
		}
	}


	// Public API methods
	get events () {
		return this.#eventsStorage
	}
	set events ( value ) {
		const interval = setInterval( () => {
			if ( this.#initialized ) {
				clearInterval( interval )
				this.#eventsStorage = value
				this.#_l( [this.#eventsStorage], 'Events has been loaded' )
				this.#preRender()
			}
		}, 25 )
	}

	get freezed () {
		return this.#freezedStorage
	}
	set freezed ( value ) {
		const interval = setInterval( () => {
			if ( this.#initialized ) {
				clearInterval( interval )
				this.#freezedStorage = value
				this.#_l( [this.#freezedStorage], 'Freezed dates has been loaded' )
				this.#preRender()
			}
		}, 25 )
	}

	setEvents ( events ) {
		this.events = events
	}
	getEvents () {
		return this.#eventsStorage
	}

	setFreezed ( freezed ) {
		this.freezed = freezed
	}
	getFreezed () {
		return this.#freezedStorage
	}

	onEventCreated ( callback ) {
		this.#bindEvtListener( 'onNewEventCreated', callback )
	}
	onDayEventsObtained ( callback ) {
		this.#bindEvtListener( 'onDayEventsObtained', callback )
	}
	
}