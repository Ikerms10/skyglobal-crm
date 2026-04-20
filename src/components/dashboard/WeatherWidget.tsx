'use client'
import { useState, useEffect } from 'react'

const WMO: Record<number, { emoji: string; label: string }> = {
  0:  { emoji: '☀️',  label: 'Clear' },
  1:  { emoji: '🌤️', label: 'Mostly Clear' },
  2:  { emoji: '⛅',  label: 'Partly Cloudy' },
  3:  { emoji: '☁️',  label: 'Overcast' },
  45: { emoji: '🌫️', label: 'Foggy' },
  48: { emoji: '🌫️', label: 'Foggy' },
  51: { emoji: '🌦️', label: 'Drizzle' },
  53: { emoji: '🌦️', label: 'Drizzle' },
  55: { emoji: '🌦️', label: 'Drizzle' },
  61: { emoji: '🌧️', label: 'Rain' },
  63: { emoji: '🌧️', label: 'Rain' },
  65: { emoji: '🌧️', label: 'Heavy Rain' },
  71: { emoji: '🌨️', label: 'Snow' },
  73: { emoji: '🌨️', label: 'Snow' },
  75: { emoji: '🌨️', label: 'Heavy Snow' },
  80: { emoji: '🌧️', label: 'Showers' },
  81: { emoji: '🌧️', label: 'Showers' },
  82: { emoji: '🌧️', label: 'Heavy Showers' },
  95: { emoji: '⛈️',  label: 'Thunderstorm' },
}

function getWeatherInfo(code: number) {
  return WMO[code] ?? { emoji: '🌡️', label: 'Unknown' }
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const CACHE_KEY = 'sg_weather_cache'
const CACHE_TTL = 30 * 60 * 1000 // 30 min

interface WeatherData {
  temp: number
  weatherCode: number
  windSpeed: number
  rainChance: number
  forecast: Array<{
    day: string
    code: number
    high: number
    low: number
    rain: number
  }>
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchWeather = async () => {
      // Check cache first
      try {
        const cached = localStorage.getItem(CACHE_KEY)
        if (cached) {
          const { data, ts } = JSON.parse(cached)
          if (Date.now() - ts < CACHE_TTL) {
            setWeather(data)
            return
          }
        }
      } catch {}

      try {
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?' +
          'latitude=28.5383&longitude=-81.3792' +
          '&current=temperature_2m,weather_code,wind_speed_10m,precipitation_probability' +
          '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
          '&temperature_unit=fahrenheit&wind_speed_unit=mph' +
          '&timezone=America%2FNew_York&forecast_days=4'
        )
        if (!res.ok) throw new Error('fetch failed')
        const json = await res.json()
        const { current, daily } = json

        const data: WeatherData = {
          temp: Math.round(current.temperature_2m),
          weatherCode: current.weather_code,
          windSpeed: Math.round(current.wind_speed_10m),
          rainChance: current.precipitation_probability ?? 0,
          forecast: daily.time.slice(1, 4).map((date: string, i: number) => ({
            day: DAYS[new Date(date + 'T12:00:00').getDay()],
            code: daily.weather_code[i + 1],
            high: Math.round(daily.temperature_2m_max[i + 1]),
            low: Math.round(daily.temperature_2m_min[i + 1]),
            rain: daily.precipitation_probability_max[i + 1] ?? 0,
          })),
        }

        setWeather(data)
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
      } catch {
        setError(true)
      }
    }

    fetchWeather()
  }, [])

  if (error || !weather) {
    return (
      <div style={{
        background: 'var(--c-card)', border: '1px solid var(--c-border-light)',
        borderRadius: 'var(--radius-lg)', padding: '20px 24px', boxShadow: 'var(--s-card), var(--s-card-inset)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 32 }}>🌤️</span>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-1)', margin: 0 }}>Orlando, FL</p>
          <p style={{ fontSize: 12, color: 'var(--c-text-4)', margin: 0 }}>
            {error ? 'Weather unavailable' : 'Loading…'}
          </p>
        </div>
      </div>
    )
  }

  const { emoji, label } = getWeatherInfo(weather.weatherCode)
  const rain = weather.rainChance

  const alertStyle: React.CSSProperties | null =
    rain > 80
      ? { background: 'var(--c-danger-bg)', border: '1px solid var(--c-danger)', color: 'var(--c-danger)' }
      : rain > 50
      ? { background: 'var(--c-gold-bg)', border: '1px solid var(--c-gold-warm)', color: 'var(--c-gold)' }
      : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
      {alertStyle && (
        <div style={{
          ...alertStyle,
          borderRadius: 'var(--radius-md)', padding: '10px 16px',
          fontSize: 13, fontWeight: 500, flexShrink: 0,
        }}>
          {rain > 80
            ? '🚨 High rain chance · Exterior work not recommended today'
            : '⚠️ Rain expected · Consider rescheduling exterior jobs'}
        </div>
      )}

      <div style={{
        background: 'var(--c-card)', border: '1px solid var(--c-border-light)',
        borderRadius: 'var(--radius-lg)', padding: '20px 24px', boxShadow: 'var(--s-card), var(--s-card-inset)',
        flex: 1, display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 44, lineHeight: 1 }}>{emoji}</span>
            <span style={{ fontSize: 32, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: 'var(--c-text-1)', letterSpacing: '-0.02em' }}>
              {weather.temp}°
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text-1)', margin: 0 }}>Orlando, FL</p>
            <p style={{ fontSize: 11, color: 'var(--c-text-4)', margin: 0 }}>for painting crews</p>
          </div>
        </div>

        {/* Details */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--c-text-3)' }}>{label}</span>
          <span style={{ fontSize: 13, color: 'var(--c-text-4)' }}>💨 {weather.windSpeed} mph</span>
          <span style={{ fontSize: 13, color: rain > 50 ? 'var(--c-gold)' : 'var(--c-text-4)' }}>
            🌧️ {rain}%
          </span>
        </div>

        {/* 3-day forecast pushed to bottom */}
        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
          {weather.forecast.map((day, i) => {
            const info = getWeatherInfo(day.code)
            return (
              <div key={i} style={{
                flex: 1, textAlign: 'center', padding: '10px 8px',
                background: 'var(--c-nested)', borderRadius: 'var(--radius-md)',
              }}>
                <p style={{ fontSize: 9, color: 'var(--c-text-4)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px' }}>
                  {day.day}
                </p>
                <span style={{ fontSize: 20 }}>{info.emoji}</span>
                <p style={{ fontSize: 12, color: 'var(--c-text-1)', fontWeight: 600, margin: '4px 0 0' }}>
                  {day.high}° <span style={{ color: 'var(--c-text-4)', fontWeight: 400 }}>{day.low}°</span>
                </p>
                {day.rain > 30 && (
                  <p style={{ fontSize: 10, color: 'var(--c-gold)', margin: '2px 0 0' }}>{day.rain}%</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
