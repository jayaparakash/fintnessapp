import { useEffect, useMemo, useState } from 'react'
import { workoutPlan, weekDays } from './data/workoutPlan'
import workoutIllustration from './assets/workout-hero.svg'

const AUTH_KEY = 'fitness-goal-journey-auth-v1'
const USERS_KEY = 'fitness-goal-journey-users-v1'
const DEFAULT_USERNAME = 'murali'
const DEFAULT_PASSWORD = '6packgoal'

const motivationalLabels = [
  'Starting strong',
  'Momentum building',
  'Discipline in motion',
  'Abs loading',
  'Consistency streak',
]

const gitaQuotes = [
  {
    quote: 'You have the right to perform your actions, but not to the fruits of those actions.',
    reference: 'Bhagavad Gita 2.47',
  },
  {
    quote: 'Let a man lift himself by himself; let him not degrade himself.',
    reference: 'Bhagavad Gita 6.5',
  },
  {
    quote: 'Yoga is excellence in action.',
    reference: 'Bhagavad Gita 2.50',
  },
  {
    quote: 'For one who has conquered the mind, the mind is the best of friends.',
    reference: 'Bhagavad Gita 6.6',
  },
]

function addDays(date, amount) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function toInputDateValue(date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getTodayKey() {
  return toInputDateValue(new Date())
}

function createSchedule(startDateValue) {
  const startDate = new Date(`${startDateValue}T00:00:00`)
  const schedule = []

  workoutPlan.weeks.forEach((weekConfig, weekIndex) => {
    weekDays.forEach((weekday, dayIndex) => {
      const currentDate = addDays(startDate, weekIndex * 7 + dayIndex)
      const template = weekConfig.days[weekday]
      const id = `${weekConfig.week}-${weekday}-${toInputDateValue(currentDate)}`
      schedule.push({
        id,
        week: weekConfig.week,
        phase: weekConfig.phase,
        weekday,
        title: template.theme,
        date: toInputDateValue(currentDate),
        fullDate: formatDate(currentDate),
        shortDate: formatShortDate(currentDate),
        monthLabel: currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
        isRestDay: template.exercises.length === 0,
        exercises: template.exercises.map((exercise, index) => ({
          id: `${id}-exercise-${index}`,
          label: exercise,
        })),
        notes: template.notes ?? [],
      })
    })
  })

  return schedule
}

function createDefaultUserState() {
  return {
    [DEFAULT_USERNAME]: {
      name: 'Murali',
      username: DEFAULT_USERNAME,
      password: DEFAULT_PASSWORD,
      startDate: toInputDateValue(new Date()),
      completions: {},
      journal: {},
      selectedDate: toInputDateValue(new Date()),
    },
  }
}

function loadUsers() {
  if (typeof window === 'undefined') {
    return createDefaultUserState()
  }

  try {
    const raw = window.localStorage.getItem(USERS_KEY)
    if (!raw) {
      return createDefaultUserState()
    }

    const parsed = JSON.parse(raw)
    return {
      ...createDefaultUserState(),
      ...parsed,
    }
  } catch {
    return createDefaultUserState()
  }
}

function loadAuthState() {
  if (typeof window === 'undefined') {
    return { isAuthenticated: false, name: '' }
  }

  try {
    const raw = window.localStorage.getItem(AUTH_KEY)
    if (!raw) {
      return { isAuthenticated: false, name: '' }
    }
    const parsed = JSON.parse(raw)
    return {
      isAuthenticated: Boolean(parsed.isAuthenticated),
      name: parsed.name || '',
    }
  } catch {
    return { isAuthenticated: false, name: '' }
  }
}

function App() {
  const initialUsers = useMemo(() => loadUsers(), [])
  const initialAuth = useMemo(() => loadAuthState(), [])
  const [users, setUsers] = useState(initialUsers)
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth.isAuthenticated)
  const [activeUsername, setActiveUsername] = useState(initialAuth.username || DEFAULT_USERNAME)
  const [loginName, setLoginName] = useState(initialAuth.name)
  const [username, setUsername] = useState(DEFAULT_USERNAME)
  const [password, setPassword] = useState(DEFAULT_PASSWORD)
  const [registerName, setRegisterName] = useState('')
  const [registerUsername, setRegisterUsername] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [loginError, setLoginError] = useState('')
  const [registerError, setRegisterError] = useState('')

  const activeUser =
    users[activeUsername] ||
    createDefaultUserState()[DEFAULT_USERNAME]
  const profileName = activeUser?.name || ''
  const [startDate, setStartDate] = useState(activeUser.startDate)
  const [completions, setCompletions] = useState(activeUser.completions)
  const [journal, setJournal] = useState(activeUser.journal)
  const [selectedDate, setSelectedDate] = useState(activeUser.selectedDate)

  const schedule = useMemo(() => createSchedule(startDate), [startDate])
  const currentQuote = useMemo(() => {
    const index = (selectedDayIndex(selectedDate, schedule) + profileName.length) % gitaQuotes.length
    return gitaQuotes[index]
  }, [profileName.length, schedule, selectedDate])

  useEffect(() => {
    if (!schedule.some((item) => item.date === selectedDate)) {
      setSelectedDate(schedule[0]?.date ?? startDate)
    }
  }, [schedule, selectedDate, startDate])

  useEffect(() => {
    const nextUser = users[activeUsername]
    if (!nextUser) {
      return
    }

    setStartDate(nextUser.startDate)
    setCompletions(nextUser.completions || {})
    setJournal(nextUser.journal || {})
    setSelectedDate(nextUser.selectedDate || nextUser.startDate)
    setLoginName(nextUser.name || '')
  }, [activeUsername, users])

  useEffect(() => {
    setUsers((current) => {
      const currentActive = current[activeUsername]
      if (!currentActive) {
        return current
      }

      if (
        currentActive.name === profileName &&
        currentActive.startDate === startDate &&
        currentActive.selectedDate === selectedDate &&
        JSON.stringify(currentActive.completions || {}) === JSON.stringify(completions) &&
        JSON.stringify(currentActive.journal || {}) === JSON.stringify(journal)
      ) {
        return current
      }

      return {
        ...current,
        [activeUsername]: {
          ...currentActive,
          name: profileName,
          username: activeUsername,
          startDate,
          completions,
          journal,
          selectedDate,
        },
      }
    })
  }, [activeUsername, completions, journal, profileName, selectedDate, startDate])

  useEffect(() => {
    window.localStorage.setItem(
      USERS_KEY,
      JSON.stringify(users),
    )
  }, [users])

  useEffect(() => {
    window.localStorage.setItem(
      AUTH_KEY,
      JSON.stringify({ isAuthenticated, name: profileName, username: activeUsername }),
    )
  }, [activeUsername, isAuthenticated, profileName])

  const selectedDay = schedule.find((entry) => entry.date === selectedDate) ?? schedule[0]
  const todayEntry = schedule.find((entry) => entry.date === getTodayKey()) ?? schedule[0]

  const progressStats = useMemo(() => {
    const activeDays = schedule.filter((entry) => !entry.isRestDay)
    const completedDays = activeDays.filter((entry) => {
      const dayStatus = completions[entry.id]
      return dayStatus && entry.exercises.every((exercise) => dayStatus[exercise.id])
    }).length

    const totalExercises = activeDays.reduce((total, entry) => total + entry.exercises.length, 0)
    const completedExercises = activeDays.reduce((total, entry) => {
      const dayStatus = completions[entry.id] || {}
      return total + entry.exercises.filter((exercise) => dayStatus[exercise.id]).length
    }, 0)

    return {
      completedDays,
      activeDays: activeDays.length,
      completedExercises,
      totalExercises,
      percentage:
        totalExercises === 0 ? 0 : Math.round((completedExercises / totalExercises) * 100),
    }
  }, [completions, schedule])

  const monthlyGroups = useMemo(() => {
    return schedule.reduce((groups, entry) => {
      groups[entry.monthLabel] ??= []
      groups[entry.monthLabel].push(entry)
      return groups
    }, {})
  }, [schedule])

  const journalEntries = useMemo(() => {
    return schedule
      .filter((entry) => journal[entry.id]?.trim())
      .map((entry) => ({
        ...entry,
        text: journal[entry.id],
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [journal, schedule])

  const selectedCompletion = completions[selectedDay?.id] || {}

  function toggleExercise(dayId, exerciseId) {
    setCompletions((current) => ({
      ...current,
      [dayId]: {
        ...current[dayId],
        [exerciseId]: !current[dayId]?.[exerciseId],
      },
    }))
  }

  function markFullDay(day) {
    const nextStatus = {}
    day.exercises.forEach((exercise) => {
      nextStatus[exercise.id] = true
    })
    setCompletions((current) => ({
      ...current,
      [day.id]: nextStatus,
    }))
  }

  function resetPlan(newStartDate) {
    setStartDate(newStartDate)
    setCompletions({})
    setJournal({})
    setSelectedDate(newStartDate)
  }

  function updateJournal(dayId, value) {
    setJournal((current) => ({
      ...current,
      [dayId]: value,
    }))
  }

  function handleLogin(event) {
    event.preventDefault()

    if (!username.trim() || !password.trim()) {
      setLoginError('Please enter your username and password.')
      return
    }

    const existingUser = users[username.trim()]

    if (!existingUser || existingUser.password !== password) {
      setLoginError('Invalid login details. Register first or use username murali and password 6packgoal.')
      return
    }

    setActiveUsername(existingUser.username)
    setLoginName(existingUser.name)
    setIsAuthenticated(true)
    setLoginError('')
  }

  function handleRegister(event) {
    event.preventDefault()

    const trimmedName = registerName.trim()
    const trimmedUsername = registerUsername.trim().toLowerCase()
    const trimmedPassword = registerPassword.trim()

    if (!trimmedName || !trimmedUsername || !trimmedPassword) {
      setRegisterError('Please fill name, username, and password.')
      return
    }

    if (users[trimmedUsername]) {
      setRegisterError('That username already exists. Please choose another one.')
      return
    }

    const today = toInputDateValue(new Date())
    const nextUsers = {
      ...users,
      [trimmedUsername]: {
        name: trimmedName,
        username: trimmedUsername,
        password: trimmedPassword,
        startDate: today,
        completions: {},
        journal: {},
        selectedDate: today,
      },
    }

    setUsers(nextUsers)
    setActiveUsername(trimmedUsername)
    setIsAuthenticated(true)
    setUsername(trimmedUsername)
    setPassword(trimmedPassword)
    setLoginName(trimmedName)
    setRegisterName('')
    setRegisterUsername('')
    setRegisterPassword('')
    setRegisterError('')
    setAuthMode('login')
  }

  function handleLogout() {
    setIsAuthenticated(false)
    setLoginError('')
  }

  const milestoneDate = schedule[schedule.length - 1]?.fullDate

  if (!isAuthenticated) {
    return (
      <div className="auth-shell">
        <section className="auth-card">
          <div className="auth-copy">
            <p className="eyebrow">Fitness login</p>
            <h1>Start your 6 Pack Goal journey</h1>
            <p className="hero-text">
              Enter your name and default credentials to open your personal workout planner,
              daily checklist, and fitness blog timeline.
            </p>
            <div className="auth-credentials">
              <span>Default username: {DEFAULT_USERNAME}</span>
              <span>Default password: {DEFAULT_PASSWORD}</span>
            </div>
            <blockquote className="quote-card">
              <p>{gitaQuotes[0].quote}</p>
              <footer>{gitaQuotes[0].reference}</footer>
            </blockquote>
          </div>

          <div className="auth-form">
            <div className="auth-switch">
              <button
                className={authMode === 'login' ? 'solid-button' : 'ghost-button'}
                type="button"
                onClick={() => setAuthMode('login')}
              >
                Login
              </button>
              <button
                className={authMode === 'register' ? 'solid-button' : 'ghost-button'}
                type="button"
                onClick={() => setAuthMode('register')}
              >
                Register
              </button>
            </div>

            {authMode === 'login' ? (
              <form className="auth-form" onSubmit={handleLogin}>
                <label className="field-card">
                  <span>Username</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value.toLowerCase())}
                  />
                </label>
                <label className="field-card">
                  <span>Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </label>
                {loginError ? <p className="error-text">{loginError}</p> : null}
                <button className="solid-button" type="submit">
                  Open workout plan
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleRegister}>
                <label className="field-card">
                  <span>Your name</span>
                  <input
                    type="text"
                    value={registerName}
                    onChange={(event) => setRegisterName(event.target.value)}
                    placeholder="Add your name"
                  />
                </label>
                <label className="field-card">
                  <span>Create username</span>
                  <input
                    type="text"
                    value={registerUsername}
                    onChange={(event) => setRegisterUsername(event.target.value)}
                    placeholder="Choose username"
                  />
                </label>
                <label className="field-card">
                  <span>Create password</span>
                  <input
                    type="password"
                    value={registerPassword}
                    onChange={(event) => setRegisterPassword(event.target.value)}
                    placeholder="Create password"
                  />
                </label>
                {registerError ? <p className="error-text">{registerError}</p> : null}
                <button className="solid-button" type="submit">
                  Create account
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Krishna-inspired fitness journey</p>
          <h1>{workoutPlan.title}</h1>
          <p className="hero-text">
            {profileName}, plan your 5-month transformation with a custom start date, daily checklist,
            progress tracking, and a fitness journey diary that grows with you.
          </p>
          <div className="blessing-banner">
            <span className="blessing-mark">Om</span>
            <div>
              <strong>Discipline with devotion</strong>
              <p>
                Build your body with courage, calm focus, and the steady spirit of Lord Krishna.
              </p>
            </div>
          </div>
          <div className="hero-actions">
            <label className="field-card">
              <span>Goal start date</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>
            <div className="field-card field-card--static">
              <span>Projected finish</span>
              <strong>{milestoneDate}</strong>
            </div>
            <button className="ghost-button" onClick={() => resetPlan(toInputDateValue(new Date()))}>
              Reset to today
            </button>
            <button className="ghost-button" onClick={handleLogout}>
              Switch user
            </button>
          </div>
        </div>
        <div className="hero-panel">
          <div className="image-card">
            <img src={workoutIllustration} alt="Workout training illustration" />
          </div>
          <div className="krishna-card">
            <span>Krishna energy</span>
            <strong>Strength, balance, clarity</strong>
            <p>
              Train with joy. Stay steady in effort. Let each day of the challenge become a sacred
              promise to yourself.
            </p>
          </div>
          <div className="metric-card">
            <span>Journey progress</span>
            <strong>{progressStats.percentage}%</strong>
            <p>
              {progressStats.completedExercises} of {progressStats.totalExercises} exercises checked
            </p>
          </div>
          <div className="metric-card">
            <span>Finished workout days</span>
            <strong>
              {progressStats.completedDays}/{progressStats.activeDays}
            </strong>
            <p>{motivationalLabels[progressStats.completedDays % motivationalLabels.length]}</p>
          </div>
          <div className="metric-card">
            <span>Today</span>
            <strong>{todayEntry?.shortDate ?? 'Scheduled'}</strong>
            <p>{todayEntry?.title ?? 'Pick a date to begin'}</p>
          </div>
          <blockquote className="quote-card quote-card--compact">
            <p>{currentQuote.quote}</p>
            <footer>{currentQuote.reference}</footer>
          </blockquote>
        </div>
      </header>

      <main className="layout">
        <section className="panel panel--planner">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Daily planner</p>
              <h2>Checklist and schedule</h2>
            </div>
            {selectedDay && !selectedDay.isRestDay ? (
              <button className="solid-button" onClick={() => markFullDay(selectedDay)}>
                Mark day complete
              </button>
            ) : null}
          </div>

          <div className="current-day-card">
            <div>
            <p className="meta-line">
              Week {selectedDay?.week} | {selectedDay?.phase}
            </p>
            <h3>{selectedDay?.title}</h3>
            <p>{selectedDay?.fullDate}</p>
            </div>
            <div className={`status-pill ${selectedDay?.isRestDay ? 'rest' : 'active'}`}>
              {selectedDay?.isRestDay ? 'Rest day' : `${selectedDay?.exercises.length} exercises`}
            </div>
          </div>

          <div className="daily-visual-card">
            <div className="daily-visual-copy">
              <p className="eyebrow">Daily workout image</p>
              <h3>{selectedDay?.title}</h3>
              <p>
                {selectedDay?.isRestDay
                  ? 'Recovery, stretching, and calm breathing for today.'
                  : `Focus on ${selectedDay?.weekday} with ${selectedDay?.exercises.length} planned exercises.`}
              </p>
            </div>
            <div className="daily-visual-image">
              <img src={workoutIllustration} alt="Daily workout visual" />
            </div>
          </div>

          {selectedDay?.notes?.length ? (
            <div className="tip-row">
              {selectedDay.notes.map((note) => (
                <span key={note}>{note}</span>
              ))}
            </div>
          ) : null}

          <div className="checklist">
            {selectedDay?.isRestDay ? (
              <div className="rest-card">
                <h4>Recovery day</h4>
                <p>Take rest, stretch lightly, and come back stronger tomorrow.</p>
              </div>
            ) : (
              selectedDay?.exercises.map((exercise) => (
                <label className="check-item" key={exercise.id}>
                  <input
                    type="checkbox"
                    checked={Boolean(selectedCompletion[exercise.id])}
                    onChange={() => toggleExercise(selectedDay.id, exercise.id)}
                  />
                  <span>{exercise.label}</span>
                </label>
              ))
            )}
          </div>

          <div className="section-heading section-heading--compact">
            <div>
              <p className="eyebrow">Custom month and date view</p>
              <h3>5-month calendar track</h3>
            </div>
          </div>

          <div className="month-groups">
            {Object.entries(monthlyGroups).map(([month, entries]) => (
              <div className="month-card" key={month}>
                <div className="month-card__head">
                  <h4>{month}</h4>
                  <span>{entries.length} days</span>
                </div>
                <div className="day-grid">
                  {entries.map((entry) => {
                    const completedCount = entry.exercises.filter(
                      (exercise) => completions[entry.id]?.[exercise.id],
                    ).length

                    return (
                      <button
                        key={entry.id}
                        className={`day-chip ${selectedDate === entry.date ? 'selected' : ''}`}
                        onClick={() => setSelectedDate(entry.date)}
                      >
                        <strong>{entry.shortDate}</strong>
                        <span>W{entry.week}</span>
                        <small>
                          {entry.isRestDay
                            ? 'Rest'
                            : `${completedCount}/${entry.exercises.length} done`}
                        </small>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="panel panel--journal">
          <div className="section-heading section-heading--compact">
            <div>
              <p className="eyebrow">Fitness journey blog</p>
              <h2>Daily story log</h2>
            </div>
          </div>

          <div className="journal-editor">
            <p className="meta-line">
              {selectedDay?.fullDate} | Week {selectedDay?.week}
            </p>
            <h3>{selectedDay?.title}</h3>
            <textarea
              placeholder="Write how your workout felt today, what was hard, and what improved..."
              value={journal[selectedDay?.id] || ''}
              onChange={(event) => updateJournal(selectedDay.id, event.target.value)}
            />
          </div>

          <div className="timeline">
            {journalEntries.length === 0 ? (
              <div className="empty-state">
                <h4>Your journey posts will appear here</h4>
                <p>
                  Pick any day, add your workout note, and this section becomes your month-by-month
                  fitness blog.
                </p>
              </div>
            ) : (
              journalEntries.map((entry) => (
                <article className="timeline-card" key={entry.id}>
                  <p className="meta-line">
                    {entry.fullDate} | Week {entry.week}
                  </p>
                  <h4>{entry.title}</h4>
                  <p>{entry.text}</p>
                </article>
              ))
            )}
          </div>
        </aside>
      </main>
    </div>
  )
}

function selectedDayIndex(selectedDate, schedule) {
  const index = schedule.findIndex((entry) => entry.date === selectedDate)
  return index === -1 ? 0 : index
}

export default App
