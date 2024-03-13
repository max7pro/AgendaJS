class AgendaJS {
	#options = {
		events: {},
		defaultView: 'month',  // month, week, day
		firstIsSunday: false, // true, false
		dayStartAM: 6, // first hour of event list for week and day view, 1-12 AM 
		dayEndPM: 11, // last hour of event list for week and day view, 1-12 PM
		logToConsole: true,	// true, false
		strings: {
			allDayLabel: 'all-day',
			createEventPopHeading: 'Event for ',
			createEventPopTimeFormat: 'h:mm A, dddd, MMMM D, YYYY'
		}
	}
	#initialized = false
	#apiEvents = {}
	#view
	#agendaRoot
	#aGrid
	#popup = null
	#dateTimePos
	#eventsStorage = {}

	#icons = {
		'calendar-plus': 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGNsYXNzPSJpY29uIGljb24tdGFibGVyIGljb24tdGFibGVyLWNhbGVuZGFyLXBsdXMiIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZT0iY3VycmVudENvbG9yIiBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIHN0cm9rZT0ibm9uZSIgZD0iTTAgMGgyNHYyNEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0xMi41IDIxaC02LjVhMiAyIDAgMCAxIC0yIC0ydi0xMmEyIDIgMCAwIDEgMiAtMmgxMmEyIDIgMCAwIDEgMiAydjUiIC8+PHBhdGggZD0iTTE2IDN2NCIgLz48cGF0aCBkPSJNOCAzdjQiIC8+PHBhdGggZD0iTTQgMTFoMTYiIC8+PHBhdGggZD0iTTE2IDE5aDYiIC8+PHBhdGggZD0iTTE5IDE2djYiIC8+PC9zdmc+'
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

		this.#_l( ['[Timezone:] ' + dayjs.tz.guess(), '[Locale:] ' + dayjs.locale()], 'Initialize dayJS' )
		
	})

	async #initializeApp ( rootSelector, opts ) {

		this.#options = {
			...this.#options,
			...opts
		}
		
		dayjs.updateLocale( dayjs.locale(), {
			weekStart: this.#options.firstIsSunday ? 0 : 1
		} )

		this.#view = this.#options.defaultView
		this.#dateTimePos = dayjs().startOf( 'D' )

		this.#agendaRoot = this.#_r( 'div', ['_a-canvas', '_a-m3'], document.querySelector( rootSelector ) )
		this.#initializeToolbar()
		this.#aGrid = this.#_r( 'div', ['_a-grid'], this.#agendaRoot )

		Object.keys( this.#options.events ).length ?
			this.events = this.#options.events :
			this.#preRender()
		
		this.#_l( [[this.#agendaRoot], this], 'AgendaJS is initialized' )
		
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
				<span data-view="week" class="_a-btn _a-btn-primary">Week</span>
				<span data-view="day" class="_a-btn _a-btn-primary">Day</span>
			</div>
			`
		toolbar.querySelector( '._a-view-switch' ).onclick = ( { target } ) => { this.#preRender( { view: target.dataset.view } ) }
		toolbar.querySelector( '._a-btn-now' ).onclick = () => this.#preRender( { time: dayjs() } )
		toolbar.querySelector( '._a-btn-prev' ).onclick = () => this.#preRender( { time: this.#dateTimePos.subtract( 1, this.#view ) } )
		toolbar.querySelector( '._a-btn-next' ).onclick = () => this.#preRender( { time: this.#dateTimePos.add( 1, this.#view ) } )

		this.#initialized = true
	}

	#preRender ( { view, time } = {} ) {

		this.#view = view ?? this.#view
		this.#dateTimePos = time ?? this.#dateTimePos

		// this.#_eraseDomTree( this.aGrid )
		this.#aGrid.innerHTML = null
		this.#aGrid.className = `_a-grid _a-grid-${ this.#view }`

		document.querySelectorAll( '._a-view-switch ._a-btn' ).forEach( btn => btn.classList.remove( '_a-btn-slctd' ) )
		document.querySelector( `[data-view="${ this.#view }"]` ).classList.add( '_a-btn-slctd' )

		this.#_l( ['[Time:] ' + this.#dateTimePos.format( 'ddd, MMMM D, YYYY HH:mm A' ), '[View:] ' + this.#view], 'Prerender' )
		
		switch ( this.#view ) {
			case 'month': this.#monthView( this.#dateTimePos ); break
			case 'week': this.#weekView( this.#dateTimePos ); break
			case 'day': this.#dayView( this.#dateTimePos ); break
		}
		// this[`${ v }View`]( this.#dateTimePos )
		// eval( `this.#${ this.#view }View( this.#dateTimePos )` )
	}

	#setHeading ( str ) {
		this.#agendaRoot.querySelector( '._a-heading' ).innerText = str
	}
	
	#monthView ( time ) {
						
		let start = time.startOf( 'month' ).startOf( 'week' ),
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
			this.#_r( 'div', ['_a-cell', '_a-cell-label-horizontal'], this.#aGrid ).innerText = label
		)
		cells.forEach( obj => {
			let cell = this.#_r( 'div', ['_a-cell'], this.#aGrid )
			cell.innerText = obj.date()
			cell.dataset.ts = obj.unix()
			cell.onclick = () => this.#preRender( { time: obj, view: 'day' } )
		} )
			
		this.#_l( [hCells, cells], 'Month grid' )
	}

	#weekView ( time ) {
				
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
			this.#_r( 'div', ['_a-cell', '_a-cell-label-horizontal'], this.#aGrid ).innerText = label.format( 'ddd D' )
		)

		this.#_r( 'div', ['_a-cell', '_a-cell-label-vertical'], this.#aGrid ).innerText = this.#options.strings.allDayLabel
		for ( let cell = 1; cell <= hCells.length; cell++ )
			this.#_r( 'div', ['_a-cell'], this.#aGrid )
		
		cells.forEach( obj => {
			const halfHour = obj.minute() ? true : false
			this.#_r( 'div', '_a-cell _a-cell-label-vertical' + ( halfHour ? ' _a-cell-half-hour' : '' ), this.#aGrid )
				.innerText = obj.format( 'h:mm a' )
			for ( let day = 0; day < hCells.length; day++ ) {
				let cell = this.#_r( 'div', '_a-cell' + ( halfHour ? ' _a-cell-half-hour' : '' ), this.#aGrid )
				cell.dataset.ts = hCells[day].hour( obj.hour() ).minute( obj.minute() ).unix()

				let btnPlus = this.#_r( 'span', ['_a-cel-btn-plus'], cell )
				btnPlus.innerHTML = `<img src=${ this.#icons['calendar-plus'] }>`
				btnPlus.addEventListener( 'click', e => {
					e.stopPropagation()
					this.#addEvent( cell.dataset.ts )
				} )
				cell.onclick = () => {
					this.#preRender( { time: hCells[day], view: 'day' } )
				}
				cell.onmouseenter = () =>
					this.#_getPrvsSblng( cell, '_a-cell-label-vertical' ).classList.add( '_a-cell-row-hover' )
				cell.onmouseleave = () =>
					this.#_getPrvsSblng( cell, '_a-cell-label-vertical' ).classList.remove( '_a-cell-row-hover' )
			}
		} )

		this.#_l( [hCells, cells], 'Week grid' )

	}

	#dayView ( time ) {

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

		this.#_r( 'div', ['_a-cell', '_a-cell-label-horizontal'], this.#aGrid ).innerText = hCell
		
		this.#_r( 'div', ['_a-cell', '_a-cell-label-vertical'], this.#aGrid ).innerText = this.#options.strings.allDayLabel
		this.#_r( 'div', ['_a-cell'], this.#aGrid )

		cells.forEach( obj => {
			const halfHour = obj.minute() ? true : false
			this.#_r( 'div', '_a-cell _a-cell-label-vertical' + ( halfHour ? ' _a-cell-half-hour' : '' ), this.#aGrid )
				.innerText = obj.format( 'h:mm a' )
			let cell = this.#_r( 'div', '_a-cell' + ( halfHour ? ' _a-cell-half-hour' : '' ), this.#aGrid )
			cell.dataset.ts = time.hour( obj.hour() ).minute( obj.minute() ).unix()

			let btnPlus = this.#_r( 'span', ['_a-cel-btn-plus'], cell )
			btnPlus.innerHTML = `<img src=${ this.#icons['calendar-plus'] }>`

			btnPlus.addEventListener( 'click', e => {
				e.stopPropagation()
				this.#addEvent( cell.dataset.ts )
			} )
			cell.onmouseenter = () =>
				this.#_getPrvsSblng( cell, '_a-cell-label-vertical' ).classList.add( '_a-cell-row-hover' )
			cell.onmouseleave = () =>
				this.#_getPrvsSblng( cell, '_a-cell-label-vertical' ).classList.remove( '_a-cell-row-hover' )
		} )

		this.#_l( [cells], 'Day grid' )

	}

	#addEvent ( time ) {
		if ( this.#popup ) return 
		this.#popup = this.#_r( 'div', ['_a-popup-overlay'], this.#agendaRoot )
		const
			popup = this.#_r( 'div', ['_a-event-popup', '_a-flex', '_a-flex-column', '_a-p4'], this.#popup ),
			save = () => {
				const
					name = this.#popup.querySelector( '#_a-name' ).value,
					phone = this.#popup.querySelector( '#_a-phone' ).value
				if ( !name.length && !phone.length ) return
				
				this.#eventsStorage[time] = { name, phone }
				this.#fireEvnt( 'onNewEventCreated', { time, name, phone } )
				close()
				this.#_l( this.#eventsStorage, 'Event storage' )
			},
			close = () => {
				document.removeEventListener( 'keydown', check )
				this.#popup.remove()
				this.#popup = null
			},
			check = ( event ) => {
				if ( event.key === 'Escape' ) close()
			}

		const heading = dayjs.unix( time ).format( this.#options.strings.createEventPopHeading + this.#options.strings.createEventPopTimeFormat )
		
		popup.innerHTML = `
			<div class="_a-popup-heading _a-mt3">${ heading }</div>
			<div class="_a-input-label _a-mt4">
				<input type="text" id="_a-name"  placeholder="">
				<label for="_a-name">Name</label>
			</div>
			<div class="_a-input-label _a-mt4">
				<input type="text" id="_a-phone" placeholder="">
				<label for="_a-phone">Phone</label>
			</div>
			<div class="_a-flex _a-justify-space-evenly _a-mt4 _a-mb3 ">
				<button class="_a-btn _a-btn-primary _a-btn-save">Save</button>
				<button class="_a-btn _a-btn-primary _a-btn-cancel">Cancel</button>
			</div>
		`
		
		this.#popup.querySelector( '._a-btn-save' ).onclick = save
		this.#popup.querySelector( '._a-btn-cancel' ).onclick = close
		this.#popup.onkeydown = ( event ) => {
			if ( event.key === 'Enter' ) save()
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

	#_eraseDomTree ( element ) {
		while ( element.firstChild ) {
			this.#_eraseDomTree( element.firstChild )
			element.firstChild.remove() 
			setTimeout( () => delete (element.firstChild), 5);
		}
	}

	#_getPrvsSblng (element, className) {
		while (element) {
			element = element.previousElementSibling;
			if ( element && element.classList.contains(className) )
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

	#bindEvntListener ( eventName, callback ) {
		if ( !this.#apiEvents[eventName] ) {
			this.#apiEvents[eventName] = []
		}
		this.#apiEvents[eventName].push( callback )
	}

	#unbindEvntListener ( eventName, callback ) {
		if ( this.#apiEvents[eventName] ) {
			this.#apiEvents[eventName] =
				this.#apiEvents[eventName].filter( cb => cb !== callback )
		}
	}

	#fireEvnt ( eventName, ...args ) {
		if ( this.#apiEvents[eventName] ) {
			this.#apiEvents[eventName].forEach( callback => callback( ...args ) )
		}
	}

	// AgentaJS API
	get events () {
		return this.#eventsStorage
	}

	set events ( value ) {
		let interval = setInterval( () => {
			if ( this.#initialized ) {
				clearInterval( interval )
				this.#preRender()
				this.#eventsStorage = value
				this.#_l( [this.#eventsStorage], 'Load events' )
			}
		}, 25 )
	}

	async loadEvents ( events ) {
		this.events = events
	}

	onEventCreated ( callback ) {
		this.#bindEvntListener( 'onNewEventCreated', callback )
	}
	
}