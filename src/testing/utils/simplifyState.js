export default state => {
  const {
    events,

    users,
    rounds,
    games,
    courses,
    tees,

    main,
    drawer,
    modal,

    _game,
    _course,
    _tee,
    
    token,
    location,

    ...st
  } = state

  return st
}