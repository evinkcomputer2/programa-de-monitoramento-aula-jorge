
const $ = id => document.getElementById(id);

const state = {
  people: 12,
  temp: 23.5,
  humidity: 54,
  automation: true,
  chart: "temp",

  devices: {
    ac: true,
    light: true,
    projector: true
  },

  data: {
    temp: [22.2, 22.5, 22.4, 23.1, 23.4, 23, 23.7, 23.5, 23.8, 23.5],
    humidity: [48, 49, 51, 50, 52, 55, 53, 56, 54, 54]
  }
};

const deviceInfo = {
  ac: {
    name: "Ar-condicionado",
    icon: "❄",
    text: "acText",
    on: "Ligado · ajuste ilustrativo em 23 °C",
    off: "Desligado"
  },
  light: {
    name: "Iluminação",
    icon: "☼",
    text: "lightText",
    on: "Ligada · luz confortável",
    off: "Desligada"
  },
  projector: {
    name: "Projetor",
    icon: "▣",
    text: "projectorText",
    on: "Ligado · apresentação pronta",
    off: "Desligado"
  }
};

let toastTimer;

function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    $("toast").classList.remove("show");
  }, 2300);
}

function currentTime() {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

// Adiciona uma atividade ao histórico.
function log(icon, title, description) {
  const row = document.createElement("div");
  row.className = "event";

  const iconElement = document.createElement("em");
  iconElement.textContent = icon;

  const copy = document.createElement("span");

  const titleElement = document.createElement("b");
  titleElement.textContent = title;

  const descriptionElement = document.createElement("small");
  descriptionElement.textContent = description;

  const timeElement = document.createElement("time");
  timeElement.textContent = currentTime();

  copy.append(titleElement, descriptionElement);
  row.append(iconElement, copy, timeElement);

  $("activity").prepend(row);

  // Mantém apenas os cinco eventos mais recentes.
  while ($("activity").children.length > 5) {
    $("activity").lastElementChild.remove();
  }
}

// Liga ou desliga um equipamento no painel.
function setDevice(id, on, writeLog = true) {
  state.devices[id] = on;

  const button = document.querySelector(
    `[data-device="${id}"]`
  );

  button.classList.toggle("on", on);
  button.setAttribute("aria-pressed", String(on));

  const info = deviceInfo[id];

  $(info.text).textContent = on ? info.on : info.off;

  if (writeLog) {
    log(
      info.icon,
      info.name + (on ? " ligado" : " desligado"),
      "Alteração no painel de demonstração."
    );

    toast(info.name + (on ? " ligado." : " desligado."));
  }
}

// Atualiza a quantidade de pessoas e o gráfico de ocupação.
function updateOccupancy() {
  const people = state.people;
  const percentage = Math.round((people / 30) * 100);

  $("people").textContent = people;
  $("donutNum").textContent = people;
  $("percent").textContent = percentage + "% ocupado";

  $("progress").style.width = percentage + "%";

  $("donut").style.background =
    `conic-gradient(#245a85 0 ${percentage}%, #e3eaf1 ${percentage}% 100%)`;

  $("peopleStatus").textContent =
    people > 25
      ? "● Atenção: sala quase cheia"
      : "● Dentro da capacidade";

  $("presence").textContent =
    people > 0
      ? "Pessoas detectadas na sala"
      : "Nenhuma presença detectada";

  $("presenceState").textContent =
    people > 0 ? "ATIVO" : "VAZIO";

  $("presenceState").style.color =
    people > 0 ? "#39764a" : "#87919c";

  // Regra automática de demonstração.
  if (state.automation) {
    Object.keys(state.devices).forEach(id => {
      setDevice(id, people > 0, false);
    });
  }
}

// Desenha o gráfico dos sensores.
function drawChart(type) {
  state.chart = type;

  const values = state.data[type];

  const config = type === "temp"
    ? {
        min: 20,
        max: 26,
        ticks: [26, 24, 22, 20],
        color: "#245a85",
        label: "Temperatura (°C)"
      }
    : {
        min: 35,
        max: 65,
        ticks: [65, 55, 45, 35],
        color: "#4f91b9",
        label: "Umidade (%)"
      };

  const width = 600;
  const height = 230;
  const left = 42;
  const right = 12;
  const top = 14;
  const bottom = 29;

  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  const x = index =>
    left + index * plotWidth / (values.length - 1);

  const y = value =>
    top + (config.max - value) /
    (config.max - config.min) * plotHeight;

  const labels = [
    "08h", "09h", "10h", "11h", "12h",
    "13h", "14h", "15h", "16h", "17h"
  ];

  let svg = "";

  // Linhas de referência do gráfico.
  config.ticks.forEach(value => {
    svg += `
      <line class="gridline"
        x1="${left}" y1="${y(value)}"
        x2="${width - right}" y2="${y(value)}" />

      <text class="chartlabel"
        x="${left - 9}" y="${y(value) + 3}"
        text-anchor="end">${value}</text>
    `;
  });

  // Horários no eixo horizontal.
  labels.forEach((label, index) => {
    svg += `
      <text class="chartlabel"
        x="${x(index)}" y="${height - 5}"
        text-anchor="middle">${label}</text>
    `;
  });

  // Traçado da linha.
  const path = values.map((value, index) =>
    (index === 0 ? "M" : "L") +
    x(index) + "," + y(value)
  ).join(" ");

  // Área preenchida abaixo da linha.
  svg += `
    <path
      d="${path} L${x(values.length - 1)},${top + plotHeight}
      L${x(0)},${top + plotHeight} Z"
      fill="${config.color}" opacity="0.1" />

    <path class="line"
      d="${path}"
      style="stroke:${config.color}" />
  `;

  // Pontos das medições.
  values.forEach((value, index) => {
    svg += `
      <circle class="dot"
        cx="${x(index)}"
        cy="${y(value)}"
        r="${index === values.length - 1 ? 4 : 2.5}"
        style="stroke:${config.color}" />
    `;
  });

  $("chart").innerHTML = svg;
  $("legendText").textContent = config.label;
  $("legendDot").style.background = config.color;

  document.querySelectorAll("[data-chart]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.chart === type
    );
  });
}

// Alternar equipamentos.
document.querySelectorAll("[data-device]").forEach(button => {
  button.addEventListener("click", () => {
    // Ao escolher controle manual, pausa a automação.
    if (state.automation) {
      state.automation = false;

      $("auto").textContent = "Ⅱ Automação pausada";
      $("auto").classList.add("paused");
      $("auto").setAttribute("aria-pressed", "false");

      log(
        "✧",
        "Automação pausada",
        "Controle manual selecionado."
      );
    }

    const id = button.dataset.device;

    setDevice(id, !state.devices[id]);
  });
});

// Ativar ou pausar a automação.
$("auto").addEventListener("click", () => {
  state.automation = !state.automation;

  $("auto").textContent = state.automation
    ? "✦ Automação ligada"
    : "Ⅱ Automação pausada";

  $("auto").classList.toggle(
    "paused",
    !state.automation
  );

  $("auto").setAttribute(
    "aria-pressed",
    String(state.automation)
  );

  if (state.automation) {
    updateOccupancy();
  }

  log(
    "✧",
    state.automation
      ? "Automação ativada"
      : "Automação pausada",
    state.automation
      ? "Dispositivos acompanham a presença simulada."
      : "Controle manual disponível."
  );

  toast(
    state.automation
      ? "Automação ativada."
      : "Automação pausada."
  );
});

// Simular entrada de uma pessoa.
$("in").addEventListener("click", () => {
  if (state.people >= 30) {
    toast("A sala já está na capacidade máxima.");
    return;
  }

  state.people++;

  updateOccupancy();

  log(
    "♙",
    "Entrada simulada",
    state.people + " pessoas na sala."
  );

  toast("Uma pessoa entrou (simulação).");
});

// Simular saída de uma pessoa.
$("out").addEventListener("click", () => {
  if (state.people <= 0) {
    toast("A sala já está vazia.");
    return;
  }

  state.people--;

  updateOccupancy();

  log(
    "♙",
    "Saída simulada",
    state.people + " pessoas na sala."
  );

  toast("Uma pessoa saiu (simulação).");
});

// Alternar o gráfico entre temperatura e umidade.
document.querySelectorAll("[data-chart]").forEach(button => {
  button.addEventListener("click", () => {
    drawChart(button.dataset.chart);
  });
});

// Navegação entre as áreas do painel.
document.querySelectorAll("[data-target]").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-target]").forEach(item => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    const target = $(button.dataset.target);

    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  });
});

// Atualiza os valores simulados dos sensores.
function updateReadings() {
  state.temp = Math.max(
    21,
    Math.min(26, state.temp + (Math.random() - 0.5) * 0.4)
  );

  state.humidity = Math.max(
    40,
    Math.min(65, Math.round(
      state.humidity + (Math.random() - 0.5) * 2
    ))
  );

  $("temp").textContent = state.temp.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });

  $("humidity").textContent = state.humidity;

  $("humidityStatus").textContent =
    state.humidity >= 40 && state.humidity <= 60
      ? "● Nível confortável"
      : "● Atenção à umidade";

  $("air").textContent =
    state.humidity > 62 ? "Atenção" : "Boa";

  // Guarda as últimas dez medições para o gráfico.
  state.data.temp.push(Number(state.temp.toFixed(1)));
  state.data.temp.shift();

  state.data.humidity.push(state.humidity);
  state.data.humidity.shift();

  drawChart(state.chart);
}

// Inicializa o sistema.
updateOccupancy();
drawChart("temp");

// Atualiza os valores simulados a cada cinco segundos.
setInterval(updateReadings, 5000);
