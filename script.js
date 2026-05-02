const apiKey = "4e0a043ba3f3f85ea746c19c134bcf7e";

const state = {
  city: "New Delhi",
  unit: "metric",
  coords: null,
  suggestions: [],
  activeSuggestion: -1,
};

const els = {
  openingAnimation: document.querySelector("#openingAnimation"),
  shell: document.querySelector(".weather-shell"),
  cityBackdrop: document.querySelector("#cityBackdrop"),
  landmarkLabel: document.querySelector("#landmarkLabel"),
  form: document.querySelector("#searchForm"),
  input: document.querySelector("#cityInput"),
  suggestions: document.querySelector("#citySuggestions"),
  locationBtn: document.querySelector("#locationBtn"),
  unitBtns: document.querySelectorAll(".unit"),
  statusLine: document.querySelector("#statusLine"),
  placeName: document.querySelector("#placeName"),
  conditionText: document.querySelector("#conditionText"),
  weatherIcon: document.querySelector("#weatherIcon"),
  tempValue: document.querySelector("#tempValue"),
  unitSymbol: document.querySelector("#unitSymbol"),
  feelsLike: document.querySelector("#feelsLike"),
  localTime: document.querySelector("#localTime"),
  highLow: document.querySelector("#highLow"),
  windValue: document.querySelector("#windValue"),
  windHint: document.querySelector("#windHint"),
  humidityValue: document.querySelector("#humidityValue"),
  pressureValue: document.querySelector("#pressureValue"),
  visibilityValue: document.querySelector("#visibilityValue"),
  chartRange: document.querySelector("#chartRange"),
  chart: document.querySelector("#hourlyChart"),
  hourlyStrip: document.querySelector("#hourlyStrip"),
  forecastList: document.querySelector("#forecastList"),
  updatedAt: document.querySelector("#updatedAt"),
  sunriseTime: document.querySelector("#sunriseTime"),
  sunsetTime: document.querySelector("#sunsetTime"),
  sunDot: document.querySelector("#sunDot"),
  toast: document.querySelector("#toast"),
};

document.body.classList.add("intro-lock");

function finishOpeningAnimation() {
  document.body.classList.add("intro-done");
  document.body.classList.remove("intro-lock");
  els.openingAnimation.classList.add("is-hidden");
}

window.addEventListener("load", () => {
  window.setTimeout(finishOpeningAnimation, 2500);
});

const unitLabel = () => state.unit === "metric" ? "C" : "F";
const speedLabel = () => state.unit === "metric" ? "m/s" : "mph";
const apiUnit = () => `units=${state.unit}`;
const iconUrl = (code) => `https://openweathermap.org/img/wn/${code}@2x.png`;
const round = (value) => Math.round(value);
let suggestionTimer;
let suggestionRequest;

const cityLandmarks = [
  { keys: ["new delhi", "delhi"], landmark: "delhi", label: "India Gate" },
  { keys: ["agra"], landmark: "agra", label: "Taj Mahal" },
  { keys: ["mumbai", "bombay"], landmark: "mumbai", label: "Gateway of India" },
  { keys: ["jaipur"], landmark: "jaipur", label: "Hawa Mahal" },
  { keys: ["paris"], landmark: "paris", label: "Eiffel Tower" },
  { keys: ["london"], landmark: "london", label: "Big Ben" },
  { keys: ["new york", "nyc"], landmark: "new-york", label: "Statue of Liberty" },
  { keys: ["tokyo"], landmark: "tokyo", label: "Tokyo Tower" },
  { keys: ["dubai"], landmark: "dubai", label: "Burj Khalifa" },
  { keys: ["rome", "roma"], landmark: "rome", label: "Colosseum" },
  { keys: ["sydney"], landmark: "sydney", label: "Sydney Opera House" },
  { keys: ["cairo"], landmark: "cairo", label: "Pyramids of Giza" },
  { keys: ["san francisco"], landmark: "san-francisco", label: "Golden Gate Bridge" },
  { keys: ["rio de janeiro", "rio"], landmark: "rio", label: "Christ the Redeemer" },
  { keys: ["beijing"], landmark: "beijing", label: "Temple of Heaven" },
];

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 3200);
}

function titleCase(text) {
  return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatTime(timestamp, timezone, options = {}) {
  const localMs = (timestamp + timezone) * 1000;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
    ...options,
  }).format(localMs);
}

function formatDay(timestamp, timezone, weekday = "short") {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday,
  }).format((timestamp + timezone) * 1000);
}

function windDirection(deg) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round(deg / 45) % 8];
}

function weatherMode(weather, icon) {
  const main = weather.toLowerCase();
  if (icon.includes("n")) return "night";
  if (main.includes("thunder")) return "storm";
  if (main.includes("rain") || main.includes("drizzle")) return "rain";
  if (main.includes("snow")) return "rain";
  if (main.includes("cloud")) return "clouds";
  return "clear";
}

function setCityBackdrop(cityName) {
  const normalized = cityName.toLowerCase();
  const match = cityLandmarks.find((item) => item.keys.some((key) => normalized.includes(key)));

  els.cityBackdrop.dataset.landmark = match ? match.landmark : "generic";
  els.landmarkLabel.textContent = match ? match.label : `${cityName} skyline`;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Weather service is unavailable.");
  }
  return data;
}

async function getWeatherByCity(city) {
  const query = encodeURIComponent(city.trim());
  const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${query}&appid=${apiKey}&${apiUnit()}`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${query}&appid=${apiKey}&${apiUnit()}`;
  return Promise.all([fetchJson(currentUrl), fetchJson(forecastUrl)]);
}

async function getCitySuggestions(query, signal) {
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=6&appid=${apiKey}`;
  return fetchJson(url, { signal });
}

async function getWeatherByCoords({ latitude, longitude }) {
  const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&${apiUnit()}`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&${apiUnit()}`;
  return Promise.all([fetchJson(currentUrl), fetchJson(forecastUrl)]);
}

function formatSuggestion(place) {
  return [place.name, place.state, place.country].filter(Boolean).join(", ");
}

function hideSuggestions() {
  state.suggestions = [];
  state.activeSuggestion = -1;
  els.suggestions.classList.remove("show");
  els.suggestions.innerHTML = "";
  els.input.setAttribute("aria-expanded", "false");
  els.input.removeAttribute("aria-activedescendant");
}

function setActiveSuggestion(index) {
  state.activeSuggestion = index;
  els.suggestions.querySelectorAll(".suggestion-item").forEach((button, itemIndex) => {
    const isActive = itemIndex === index;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  els.input.setAttribute("aria-activedescendant", `city-suggestion-${index}`);
}

function renderSuggestions(places) {
  state.suggestions = places;
  state.activeSuggestion = -1;
  els.suggestions.innerHTML = "";

  if (!places.length) {
    hideSuggestions();
    return;
  }

  places.forEach((place, index) => {
    const button = document.createElement("button");
    const name = document.createElement("strong");
    const detail = document.createElement("span");

    button.type = "button";
    button.className = "suggestion-item";
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", "false");
    button.id = `city-suggestion-${index}`;
    name.textContent = place.name;
    detail.textContent = [place.state, place.country].filter(Boolean).join(", ");

    button.append(name, detail);
    button.addEventListener("mouseenter", () => setActiveSuggestion(index));
    button.addEventListener("click", () => selectSuggestion(index));
    els.suggestions.appendChild(button);
  });

  els.suggestions.classList.add("show");
  els.input.setAttribute("aria-expanded", "true");
}

function requestSuggestions() {
  const query = els.input.value.trim();
  window.clearTimeout(suggestionTimer);

  if (suggestionRequest) {
    suggestionRequest.abort();
  }

  if (query.length < 2) {
    hideSuggestions();
    return;
  }

  suggestionTimer = window.setTimeout(async () => {
    suggestionRequest = new AbortController();

    try {
      const places = await getCitySuggestions(query, suggestionRequest.signal);
      renderSuggestions(places);
    } catch (error) {
      if (error.name !== "AbortError") {
        hideSuggestions();
      }
    }
  }, 260);
}

function selectSuggestion(index) {
  const place = state.suggestions[index];
  if (!place) return;

  const label = formatSuggestion(place);
  els.input.value = label;
  state.city = label;
  state.coords = {
    latitude: place.lat,
    longitude: place.lon,
  };
  hideSuggestions();
  loadWeather();
}

function aggregateDaily(list, timezone) {
  const days = new Map();

  list.forEach((item) => {
    const day = formatDay(item.dt, timezone, "short");
    if (!days.has(day)) {
      days.set(day, {
        day,
        min: item.main.temp_min,
        max: item.main.temp_max,
        icon: item.weather[0].icon,
        description: item.weather[0].description,
        count: 0,
      });
    }

    const record = days.get(day);
    record.min = Math.min(record.min, item.main.temp_min);
    record.max = Math.max(record.max, item.main.temp_max);
    record.count += 1;
    if (item.dt_txt.includes("12:00:00")) {
      record.icon = item.weather[0].icon;
      record.description = item.weather[0].description;
    }
  });

  return Array.from(days.values()).slice(0, 5);
}

function drawChart(points) {
  const canvas = els.chart;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
  const pad = 28;
  const temps = points.map((point) => point.main.temp);
  const min = Math.min(...temps) - 2;
  const max = Math.max(...temps) + 2;

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i += 1) {
    const y = pad + ((height - pad * 2) / 3) * i;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(width - pad, y);
    ctx.stroke();
  }

  const coords = points.map((point, index) => {
    const x = pad + ((width - pad * 2) / (points.length - 1)) * index;
    const y = height - pad - ((point.main.temp - min) / (max - min)) * (height - pad * 2);
    return { x, y, temp: point.main.temp };
  });

  const gradient = ctx.createLinearGradient(0, pad, 0, height - pad);
  gradient.addColorStop(0, "rgba(98, 214, 255, 0.46)");
  gradient.addColorStop(1, "rgba(98, 214, 255, 0.02)");

  ctx.beginPath();
  coords.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.lineTo(coords[coords.length - 1].x, height - pad);
  ctx.lineTo(coords[0].x, height - pad);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  coords.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.strokeStyle = "#62d6ff";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.stroke();

  coords.forEach((point) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ffd166";
    ctx.fill();
  });
}

function renderHourly(list, timezone) {
  const points = list.slice(0, 8);
  els.hourlyStrip.innerHTML = points.map((item) => `
    <article class="hour-card">
      <span>${formatTime(item.dt, timezone, { hour12: true }).replace(":00", "")}</span>
      <img src="${iconUrl(item.weather[0].icon)}" alt="${item.weather[0].description}">
      <strong>${round(item.main.temp)}°${unitLabel()}</strong>
      <span>${round(item.pop * 100)}% rain</span>
    </article>
  `).join("");

  els.chartRange.textContent = `${round(Math.min(...points.map((item) => item.main.temp)))}° to ${round(Math.max(...points.map((item) => item.main.temp)))}°`;
  drawChart(points);
}

function renderForecast(list, timezone) {
  const daily = aggregateDaily(list, timezone);
  const coldest = Math.min(...daily.map((day) => day.min));
  const hottest = Math.max(...daily.map((day) => day.max));
  const spread = Math.max(1, hottest - coldest);

  els.forecastList.innerHTML = daily.map((day) => {
    const width = 34 + ((day.max - coldest) / spread) * 66;
    return `
      <article class="day-row">
        <strong>${day.day}</strong>
        <img src="${iconUrl(day.icon)}" alt="${day.description}">
        <div class="range-bar"><i style="width:${width}%"></i></div>
        <span>${round(day.min)}° / ${round(day.max)}°</span>
      </article>
    `;
  }).join("");
}

function positionSun(current) {
  const now = current.dt;
  const sunrise = current.sys.sunrise;
  const sunset = current.sys.sunset;
  const progress = Math.min(1, Math.max(0, (now - sunrise) / (sunset - sunrise)));
  const x = 8 + progress * 84;
  const y = 94 - Math.sin(progress * Math.PI) * 76;
  els.sunDot.style.left = `${x}%`;
  els.sunDot.style.top = `${y}px`;
}

function renderCurrent(current, forecast) {
  const weather = current.weather[0];
  const timezone = current.timezone;
  const place = `${current.name}, ${current.sys.country}`;
  const mode = weatherMode(weather.main, weather.icon);

  els.shell.dataset.weather = mode;
  els.statusLine.textContent = `${weather.main} profile`;
  els.placeName.textContent = place;
  els.conditionText.textContent = `${titleCase(weather.description)} with ${current.clouds.all}% cloud cover and live readings from OpenWeather.`;
  els.weatherIcon.src = iconUrl(weather.icon);
  els.weatherIcon.alt = weather.description;
  els.tempValue.textContent = round(current.main.temp);
  els.unitSymbol.textContent = unitLabel();
  els.feelsLike.textContent = `Feels like ${round(current.main.feels_like)}°${unitLabel()}`;
  els.localTime.textContent = `Local time ${formatTime(current.dt, timezone, { weekday: "short" })}`;
  els.highLow.textContent = `H ${round(current.main.temp_max)}° / L ${round(current.main.temp_min)}°`;
  els.windValue.textContent = `${round(current.wind.speed)} ${speedLabel()}`;
  els.windHint.textContent = `${windDirection(current.wind.deg || 0)} direction`;
  els.humidityValue.textContent = `${current.main.humidity}%`;
  els.pressureValue.textContent = `${current.main.pressure} hPa`;
  els.visibilityValue.textContent = `${(current.visibility / 1000).toFixed(1)} km`;
  els.updatedAt.textContent = `Updated ${formatTime(current.dt, timezone)}`;
  els.sunriseTime.textContent = formatTime(current.sys.sunrise, timezone);
  els.sunsetTime.textContent = formatTime(current.sys.sunset, timezone);
  els.input.value = current.name;

  setCityBackdrop(current.name);
  positionSun(current);
  renderHourly(forecast.list, timezone);
  renderForecast(forecast.list, timezone);
}

async function loadWeather() {
  try {
    els.statusLine.textContent = "Syncing live weather";
    const [current, forecast] = state.coords
      ? await getWeatherByCoords(state.coords)
      : await getWeatherByCity(state.city);
    renderCurrent(current, forecast);
  } catch (error) {
    showToast(error.message);
    els.statusLine.textContent = "Weather sync paused";
  }
}

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (state.activeSuggestion >= 0) {
    selectSuggestion(state.activeSuggestion);
    return;
  }

  const city = els.input.value.trim();
  if (!city) return;
  state.city = city;
  state.coords = null;
  hideSuggestions();
  loadWeather();
});

els.input.addEventListener("input", requestSuggestions);

els.input.addEventListener("keydown", (event) => {
  if (!state.suggestions.length) return;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    const nextIndex = state.activeSuggestion + 1 >= state.suggestions.length ? 0 : state.activeSuggestion + 1;
    setActiveSuggestion(nextIndex);
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    const nextIndex = state.activeSuggestion <= 0 ? state.suggestions.length - 1 : state.activeSuggestion - 1;
    setActiveSuggestion(nextIndex);
  }

  if (event.key === "Enter" && state.activeSuggestion >= 0) {
    event.preventDefault();
    selectSuggestion(state.activeSuggestion);
  }

  if (event.key === "Escape") {
    hideSuggestions();
  }
});

document.addEventListener("click", (event) => {
  if (!els.form.contains(event.target)) {
    hideSuggestions();
  }
});

els.locationBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    showToast("Geolocation is not available in this browser.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      state.coords = position.coords;
      loadWeather();
    },
    () => showToast("Location permission was not granted.")
  );
});

els.unitBtns.forEach((button) => {
  button.addEventListener("click", () => {
    state.unit = button.dataset.unit;
    els.unitBtns.forEach((item) => item.classList.toggle("active", item === button));
    loadWeather();
  });
});

window.addEventListener("resize", () => {
  window.clearTimeout(window.chartTimer);
  window.chartTimer = window.setTimeout(loadWeather, 300);
});

loadWeather();
