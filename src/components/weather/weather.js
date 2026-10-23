function setWeatherClickable(city) {
    const weatherEl = document.getElementById('weather');
    weatherEl.style.cursor = 'pointer';
    weatherEl.onclick = () => window.open(`https://www.google.com/search?q=Weather+${encodeURIComponent(city)}`, '_blank');
}

const weatherCodes = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Depositing rime fog", 51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
    61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
    71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
    80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
    95: "Thunderstorm", 96: "Thunderstorm w/ hail", 99: "Severe thunderstorm"
};

const svg = (inner) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

const CLOUD = `<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>`;
const SUN = `<circle cx="12" cy="12" r="4"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`;
const SUN_CLOUD = `${CLOUD}<line x1="22" y1="6" x2="22" y2="8"/><line x1="19" y1="3" x2="19" y2="5"/><line x1="16" y1="6" x2="16" y2="8"/>`;
const FOG = `${CLOUD}<line x1="4" y1="15" x2="20" y2="15"/><line x1="4" y1="18" x2="20" y2="18"/>`;
const DRIZZLE = `${CLOUD}<line x1="8" y1="13" x2="8" y2="15"/><line x1="16" y1="13" x2="16" y2="15"/>`;
const RAIN = `${CLOUD}<line x1="16" y1="13" x2="16" y2="21"/><line x1="8" y1="13" x2="8" y2="21"/><line x1="12" y1="15" x2="12" y2="23"/>`;
const SNOW = `${CLOUD}<circle cx="8" cy="14" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="15.5" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="14" r="1" fill="currentColor" stroke="none"/>`;
const THUNDER = `${CLOUD}<polyline points="13 11 9 17 15 17 11 23"/>`;
const DROP = `<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>`;

const weatherIcons = {
    0: svg(SUN),
    1: svg(SUN),
    2: svg(SUN_CLOUD),
    3: svg(CLOUD),
    45: svg(FOG),
    48: svg(FOG),
    51: svg(DRIZZLE),
    53: svg(DRIZZLE),
    55: svg(DRIZZLE),
    61: svg(RAIN),
    63: svg(RAIN),
    65: svg(RAIN),
    71: svg(SNOW),
    73: svg(SNOW),
    75: svg(SNOW),
    80: svg(RAIN),
    81: svg(RAIN),
    82: svg(RAIN),
    95: svg(THUNDER),
    96: svg(THUNDER),
    99: svg(THUNDER)
};

function getClockFormat() {
    try {
        const settingsStr = localStorage.getItem("settings");
        if (settingsStr) {
            const settings = JSON.parse(settingsStr);
            return settings.clockFormat || "24h";
        }
    } catch {}
    return "24h";
}

function formatHour(date, clockFormat) {
    const h = date.getHours();
    if (clockFormat === "12h") {
        const h12 = h % 12 || 12;
        return `${h12}${h >= 12 ? "p" : "a"}`;
    }
    return String(h).padStart(2, "0");
}

function renderForecast(hourly, tempUnit, clockFormat) {
    const forecastEl = document.getElementById('weather-forecast');
    if (!forecastEl || !hourly || !hourly.time) return;

    const now = new Date();
    const times = hourly.time;

    // Start from the first full hour at or after the current time
    let startIndex = 0;
    for (let i = 0; i < times.length; i++) {
        if (new Date(times[i]) >= now) {
            startIndex = i;
            break;
        }
    }

    const slots = [];
    for (let i = startIndex; i < startIndex + 8 && i < times.length; i++) {
        const t = new Date(times[i]);
        const hour = formatHour(t, clockFormat);
        const temp = Math.round(hourly.temperature_2m[i]);
        const code = hourly.weathercode[i];
        const precip = hourly.precipitation_probability ? hourly.precipitation_probability[i] : null;
        const icon = weatherIcons[code] || svg(CLOUD);

        slots.push(
            `<div class="forecast-slot">` +
            `<span class="forecast-hour">${hour}</span>` +
            `<span class="forecast-icon">${icon}</span>` +
            `<span class="forecast-temp">${temp}°</span>` +
            (precip != null ? `<span class="forecast-precip">${svg(DROP)}${precip}%</span>` : '') +
            `</div>`
        );
    }

    forecastEl.innerHTML = slots.join('');
}

function fetchWeatherAndCity(lat, lon, tempUnit = 'celsius') {
    const now = new Date();
    const cachedWeather = localStorage.getItem('weatherData');
    const clockFormat = getClockFormat();

    if (cachedWeather) {
        const weatherData = JSON.parse(cachedWeather);
        if ((now - new Date(weatherData.timestamp)) < 30 * 60 * 1000) {
            document.getElementById('weather').textContent = weatherData.text;
            const city = weatherData.text.split(': ')[0];
            setWeatherClickable(city);
            renderForecast(weatherData.hourly, tempUnit, clockFormat);
            return;
        }
    }

    const tempUnitParam = tempUnit === 'fahrenheit' ? '&temperature_unit=fahrenheit' : '';

    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weathercode,precipitation_probability&forecast_days=2${tempUnitParam}`)
        .then(res => res.json())
        .then(data => {
            const temp = Math.round(data.current_weather.temperature);
            const code = data.current_weather.weathercode;
            const desc = weatherCodes[code] || `Code ${code}`;
            let weatherText = `${desc}, ${temp}°${tempUnit === 'celsius' ? 'C' : 'F'}`;

            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
                .then(res => res.json())
                .then(location => {
                    const city = location.address.city || location.address.town || location.address.village || location.address.county || "your area";
                    const weatherString = `${city}: ${weatherText}`;
                    document.getElementById('weather').textContent = weatherString;
                    setWeatherClickable(city);
                    renderForecast(data.hourly, tempUnit, clockFormat);

                    localStorage.setItem('weatherData', JSON.stringify({
                        text: weatherString,
                        hourly: data.hourly,
                        timestamp: now.toISOString()
                    }));
                })
                .catch(() => {
                    document.getElementById('weather').textContent = weatherText;
                    setWeatherClickable("your area");
                    renderForecast(data.hourly, tempUnit, clockFormat);
                });
        })
        .catch(() => {
            document.getElementById('weather').textContent = "Unable to fetch weather.";
        });
}

function fetchWeatherByCity(city, tempUnit = 'celsius') {
    const now = new Date();
    const cachedWeather = localStorage.getItem('weatherData');
    const clockFormat = getClockFormat();

    if (cachedWeather) {
        const weatherData = JSON.parse(cachedWeather);
        if ((now - new Date(weatherData.timestamp)) < 30 * 60 * 1000) {
            document.getElementById('weather').textContent = weatherData.text;
            const cityFromCache = weatherData.text.split(': ')[0];
            setWeatherClickable(cityFromCache);
            renderForecast(weatherData.hourly, tempUnit, clockFormat);
            return;
        }
    }

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`)
        .then(res => res.json())
        .then(data => {
            if (data.length > 0) {
                const { lat, lon } = data[0];
                fetchWeatherAndCity(lat, lon, tempUnit);
            } else {
                document.getElementById('weather').textContent = "City not found";
            }
        })
        .catch(() => {
            document.getElementById('weather').textContent = "Unable to fetch weather";
        });
}

function renderWeather(settings) {
    document.getElementById('weather').textContent = "Fetching weather...";
    const useCustomCity = settings.useCustomCity;
    const tempUnit = settings.tempUnit || 'celsius';
    if (useCustomCity && settings.customCity) {
        const customCity = settings.customCity;
        fetchWeatherByCity(customCity, tempUnit);
    } else {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => fetchWeatherAndCity(pos.coords.latitude, pos.coords.longitude, tempUnit),
                (err) => {
                    setTimeout(() => {
                        navigator.geolocation.getCurrentPosition(
                            pos => fetchWeatherAndCity(pos.coords.latitude, pos.coords.longitude, tempUnit),
                            () => document.getElementById('weather').textContent = "Location access denied."
                        );
                    }, 100);
                }
            );
        } else {
            document.getElementById('weather').textContent = "Geolocation not supported.";
        }
    }
}


export { renderWeather };
