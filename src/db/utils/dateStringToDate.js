export default dateStr => {
  const date = new Date(dateStr)

  if (typeof dateStr === 'string' && dateStr.split('/').length < 3) {          // eg: '10/4'
    date.setFullYear(new Date().getFullYear())  // assume current year
  }

  date.setUTCHours(0, 0, 0, 0) 

  return date
}