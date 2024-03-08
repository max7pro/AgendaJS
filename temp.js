monthView = (time) => {

	this.setHeading(time.format('MMMM YYYY'))

	let monthEndDate = time.daysInMonth(),
		prevMonthDaysLenght = time.startOf('month').startOf('week').diff(time.startOf('month'), 'day'),
		nextMonthDaysLenght = time.endOf('month').endOf('week').diff(time.endOf('month'), 'day'),
		hCells = this.#options.firstIsSunday ?
			dayjs.weekdaysShort() :
			dayjs.weekdaysShort().slice(-6).concat(dayjs.weekdaysShort().shift()),
		cells = []

	if (prevMonthDaysLenght) {
		let prevMonthStartDate = time.startOf('month').startOf('week').get('date'),
			prevMonthEndDate = time.startOf('month').startOf('week').daysInMonth()
		cells = cells.concat(this._range(prevMonthStartDate, prevMonthEndDate))
	}

	cells = cells.concat(this._range(1, monthEndDate))

	if (nextMonthDaysLenght) {
		let nextMonthEndDate = time.endOf('month').endOf('week').get('date')
		cells = cells.concat(this._range(1, nextMonthEndDate))
	}

	hCells.forEach(d => this._r('div', ['_a-cell'], this.aGrid).innerText = d)
	cells.forEach(d => this._r('div', ['_a-cell'], this.aGrid).innerText = d)

	this.log([hCells, cells], 'Month grid')

}

weekView = (time) => {

	time = time.startOf('week')

	let weekStart = time,
		weekEnd = time.endOf('week'),
		heading = weekStart.format('MMMM D, YYYY') + ' - ' + weekEnd.format('MMMM D, YYYY'),
		isMonthBoard = weekStart.get('month') != weekEnd.get('month'),
		hCells = []

	this.setHeading(heading)

	if (isMonthBoard) {
		this._range(weekStart.get('date'), weekStart.endOf('month').get('date')).forEach(d => {
			hCells.push({
				date: d,
				month: weekStart.get('month'),
				year: weekStart.get('year')
			})
		})
	}

	this._range(isMonthBoard ? 1 : weekStart.get('date'), weekEnd.get('date')).forEach(d => {
		hCells.push({
			date: d,
			month: weekEnd.get('month'),
			year: weekEnd.get('year')
		})
	})

	this._r('div', ['_a-cell'], this.aGrid)

	hCells.forEach(d => {
		let label = dayjs().year(d.year).month(d.month).date(d.date).format('ddd M/D')
		this._r('div', ['_a-cell'], this.aGrid).innerText = label
	})

	this.log([hCells], 'Week grid')

}