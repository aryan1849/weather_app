const apiKey = "4e0a043ba3f85ea746c19c134bcf7e";

const state = {
  city: "New Delhi",
  unit: "metric",
  coords: null,
};

const els = {
  shell: document.querySelector(".weather-shell"),
  form: document.querySelector("#searchForm"),
  input: document.querySelector("#cityInput"),
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

const unitLabel = () => state.unit === "metric" ? "C" : "F";
const speedLabel = () => state.unit === "metric" ? "m/s" : "mph";
const apiUnit = () => `units=${state.unit}`;
const iconUrl = (code) => `https://openweathermap.org/img/wn/${code}@2x.png`;
const round = (value) => Math.round(value);

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

async function fetchJson(url) {
  const response = await fetch(url);
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

async function getWeatherByCoords({ latitude, longitude }) {
  const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&${apiUnit()}`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&${apiUnit()}`;
  return Promise.all([fetchJson(currentUrl), fetchJson(forecastUrl)]);
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
      <strong>${round(item.main.temp)}&deg;${unitLabel()}</strong>
      <span>${round(item.pop * 100)}% rain</span>
    </article>
  `).join("");

  els.chartRange.textContent = `${round(Math.min(...points.map((item) => item.main.temp)))}&deg; to ${round(Math.max(...points.map((item) => item.main.temp)))}&deg;`;
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
        <span>${round(day.min)}&deg; / ${round(day.max)}&deg;</span>
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
  els.feelsLike.textContent = `Feels like ${round(current.main.feels_like)}&deg;${unitLabel()}`;
  els.localTime.textContent = `Local time ${formatTime(current.dt, timezone, { weekday: "short" })}`;
  els.highLow.textContent = `H ${round(current.main.temp_max)}&deg; / L ${round(current.main.temp_min)}&deg;`;
  els.windValue.textContent = `${round(current.wind.speed)} ${speedLabel()}`;
  els.windHint.textContent = `${windDirection(current.wind.deg || 0)} direction`;
  els.humidityValue.textContent = `${current.main.humidity}%`;
  els.pressureValue.textContent = `${current.main.pressure} hPa`;
  els.visibilityValue.textContent = `${(current.visibility / 1000).toFixed(1)} km`;
  els.updatedAt.textContent = `Updated ${formatTime(current.dt, timezone)}`;
  els.sunriseTime.textContent = formatTime(current.sys.sunrise, timezone);
  els.sunsetTime.textContent = formatTime(current.sys.sunset, timezone);
  els.input.value = current.name;

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
  const city = els.input.value.trim();
  if (!city) return;
  state.city = city;
  state.coords = null;
  loadWeather();
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
