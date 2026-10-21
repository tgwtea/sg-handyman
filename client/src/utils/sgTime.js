// All timeslots show in Singapore time, whatever the browser time zone is.
const TIME_ZONE = 'Asia/Singapore'

const dayFormat = new Intl.DateTimeFormat('en-SG', {
  timeZone: TIME_ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})
const timeFormat = new Intl.DateTimeFormat('en-SG', {
  timeZone: TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
})
// en-CA gives YYYY-MM-DD, the format of <input type="date">
const dateInputFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE })
const timeInputFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export function formatDay(value) {
  return dayFormat.format(new Date(value))
}

export function formatTime(value) {
  return timeFormat.format(new Date(value))
}

export function toDateInput(value) {
  return dateInputFormat.format(new Date(value))
}

export function toTimeInput(value) {
  return timeInputFormat.format(new Date(value))
}

// "2026-10-22" + "09:00" -> ISO string for 09:00 Singapore time
export function fromInputs(date, time) {
  return new Date(`${date}T${time}:00+08:00`).toISOString()
}
