/**
 * Gráficas del dashboard de inicio, con ECharts (CDN, ver admin/index.html)
 * a partir de los mismos /api/admin/productos y /api/admin/pedidos que ya
 * carga cargarStats() — no se agrega ninguna llamada nueva a la API. El
 * filtro de rango solo reprocesa los datos ya traídos, nunca vuelve a
 * pedirlos.
 *
 * Colores: dorado de marca para todo lo que es "cantidad" (pedidos,
 * productos); verde para dinero (asociación visual estándar); los estados
 * pendiente/aprobado/rechazado usan colores semánticos fijos que nunca se
 * tocan con el tema, para que un estado nunca se confunda con "un color de
 * marca más".
 */
const COLOR_ORO_GRAFICA = "#b8963e";
const COLOR_VERDE_GRAFICA = "#0ca30c";
const ESTADOS_PEDIDO_GRAFICA = {
  pendiente: { color: "#fab219", etiqueta: "Pendiente" },
  aprobado: { color: "#0ca30c", etiqueta: "Aprobado" },
  rechazado: { color: "#d03b3b", etiqueta: "Rechazado" },
};
const FUENTE_GRAFICA = '"Helvetica Neue", Arial, sans-serif';
const EJE_TEXTO = { color: "#6b675f", fontSize: 11, fontFamily: FUENTE_GRAFICA };
const LINEA_GRILLA = { lineStyle: { color: "#e5dfd2" } };

function escaparTextoGrafica(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function tooltipBase() {
  return {
    backgroundColor: "#14120f",
    borderWidth: 0,
    padding: [8, 12],
    textStyle: { color: "#faf7f2", fontFamily: FUENTE_GRAFICA, fontSize: 12 },
  };
}

/* ===== Estado del dashboard: datos ya traídos por cargarStats() + rango
   de fechas elegido con los botones. Reprocesar es barato (unos cuantos
   pedidos), así que no hace falta memoizar nada más. ===== */
let datosDashboard = { productos: [], pedidos: [] };
let diasRangoActual = 14;
const instanciasEcharts = {};

function obtenerInstancia(idElemento) {
  const el = document.getElementById(idElemento);
  if (!el) return null;
  if (!instanciasEcharts[idElemento]) instanciasEcharts[idElemento] = echarts.init(el);
  return instanciasEcharts[idElemento];
}

window.addEventListener("resize", () => {
  Object.values(instanciasEcharts).forEach((chart) => chart.resize());
});

/* ===== Agrupado por período compartido entre "pedidos por día" y
   "tendencia de ventas": un pedido cuenta y suma en el mismo cubo. Con
   "todo el histórico" y más de 60 días de rango, se agrupa por semana en
   vez de por día para que el eje no quede ilegible. ===== */
function construirCubosPeriodo(pedidos, rangoDias) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let fechaInicio;
  if (rangoDias) {
    fechaInicio = new Date(hoy);
    fechaInicio.setDate(fechaInicio.getDate() - (rangoDias - 1));
  } else {
    const fechasPedidos = pedidos.map((p) => new Date(p.creadoEn)).filter((d) => !isNaN(d));
    fechaInicio = fechasPedidos.length ? new Date(Math.min(...fechasPedidos)) : new Date(hoy);
    fechaInicio.setHours(0, 0, 0, 0);
  }

  const totalDias = Math.max(Math.round((hoy - fechaInicio) / 86400000) + 1, 1);
  const porSemana = !rangoDias && totalDias > 60;
  const pasoDias = porSemana ? 7 : 1;
  const numCubos = Math.max(Math.ceil(totalDias / pasoDias), 1);

  const cubos = [];
  for (let i = 0; i < numCubos; i++) {
    const inicioCubo = new Date(fechaInicio);
    inicioCubo.setDate(inicioCubo.getDate() + i * pasoDias);
    cubos.push({ inicio: inicioCubo, cantidad: 0, total: 0 });
  }

  for (const pedido of pedidos) {
    if (!pedido.creadoEn) continue;
    const fecha = new Date(pedido.creadoEn);
    if (isNaN(fecha)) continue;
    fecha.setHours(0, 0, 0, 0);
    if (fecha < fechaInicio) continue;
    const indice = Math.floor((fecha - fechaInicio) / 86400000 / pasoDias);
    if (indice < 0 || indice >= cubos.length) continue;
    cubos[indice].cantidad++;
    cubos[indice].total += Number(pedido.total) || 0;
  }

  const formatearEtiqueta = (fecha) => fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
  cubos.forEach((c) => {
    c.etiqueta = porSemana
      ? formatearEtiqueta(c.inicio)
      : c.inicio.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
  });

  return { cubos, porSemana };
}

function mostrarVacio(idElemento, mensaje) {
  const el = document.getElementById(idElemento);
  if (!el) return;
  if (instanciasEcharts[idElemento]) {
    instanciasEcharts[idElemento].dispose();
    delete instanciasEcharts[idElemento];
  }
  el.innerHTML = `<p class="sin-datos-grafica">${mensaje}</p>`;
}

/* ===== 1) Pedidos por día (línea suave + área degradada, dorado) ===== */
function renderPedidosPorDia(cubos) {
  const idElemento = "grafica-pedidos-dia";
  const totalPeriodo = cubos.reduce((s, c) => s + c.cantidad, 0);
  if (totalPeriodo === 0) {
    mostrarVacio(idElemento, "Todavía no hay pedidos en este rango.");
    return;
  }
  const chart = obtenerInstancia(idElemento);
  if (!chart) return;

  chart.setOption(
    {
      textStyle: { fontFamily: FUENTE_GRAFICA },
      grid: { left: 30, right: 12, top: 26, bottom: 24 },
      xAxis: {
        type: "category",
        data: cubos.map((c) => c.etiqueta),
        boundaryGap: false,
        axisLine: LINEA_GRILLA,
        axisTick: { show: false },
        axisLabel: EJE_TEXTO,
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: LINEA_GRILLA,
        axisLabel: EJE_TEXTO,
      },
      tooltip: {
        trigger: "axis",
        ...tooltipBase(),
        formatter: (params) => {
          const p = params[0];
          return `<strong>${p.value}</strong> pedido${p.value === 1 ? "" : "s"}<br>${p.axisValueLabel}`;
        },
      },
      series: [
        {
          type: "line",
          data: cubos.map((c) => c.cantidad),
          smooth: true,
          symbol: "circle",
          symbolSize: 7,
          lineStyle: { width: 3, color: COLOR_ORO_GRAFICA },
          itemStyle: { color: COLOR_ORO_GRAFICA, borderColor: "#ffffff", borderWidth: 2 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(184,150,62,0.35)" },
                { offset: 1, color: "rgba(184,150,62,0.02)" },
              ],
            },
          },
        },
      ],
    },
    true
  );
}

/* ===== 2) Tendencia de ventas (línea suave + área degradada, verde) ===== */
function renderTendenciaVentas(cubos) {
  const idElemento = "grafica-ventas";
  const totalPeriodo = cubos.reduce((s, c) => s + c.total, 0);
  if (totalPeriodo === 0) {
    mostrarVacio(idElemento, "Todavía no hay ventas en este rango.");
    return;
  }
  const chart = obtenerInstancia(idElemento);
  if (!chart) return;

  chart.setOption(
    {
      textStyle: { fontFamily: FUENTE_GRAFICA },
      grid: { left: 54, right: 12, top: 26, bottom: 24 },
      xAxis: {
        type: "category",
        data: cubos.map((c) => c.etiqueta),
        boundaryGap: false,
        axisLine: LINEA_GRILLA,
        axisTick: { show: false },
        axisLabel: EJE_TEXTO,
      },
      yAxis: {
        type: "value",
        splitLine: LINEA_GRILLA,
        axisLabel: { ...EJE_TEXTO, formatter: (v) => "$" + Number(v).toLocaleString("es-CO") },
      },
      tooltip: {
        trigger: "axis",
        ...tooltipBase(),
        formatter: (params) => {
          const p = params[0];
          return `<strong>$${Number(p.value).toLocaleString("es-CO")}</strong><br>${p.axisValueLabel}`;
        },
      },
      series: [
        {
          type: "line",
          data: cubos.map((c) => c.total),
          smooth: true,
          symbol: "circle",
          symbolSize: 7,
          lineStyle: { width: 3, color: COLOR_VERDE_GRAFICA },
          itemStyle: { color: COLOR_VERDE_GRAFICA, borderColor: "#ffffff", borderWidth: 2 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(12,163,12,0.28)" },
                { offset: 1, color: "rgba(12,163,12,0.02)" },
              ],
            },
          },
        },
      ],
    },
    true
  );
}

/* ===== 3) Pedidos por estado (donut + filas de conteo/porcentaje) ===== */
function contarPedidosPorEstado(pedidos) {
  const conteo = { pendiente: 0, aprobado: 0, rechazado: 0 };
  for (const p of pedidos) {
    if (conteo[p.estado] !== undefined) conteo[p.estado]++;
  }
  return conteo;
}

function renderPedidosPorEstado(pedidos) {
  const conteo = contarPedidosPorEstado(pedidos);
  const total = conteo.pendiente + conteo.aprobado + conteo.rechazado;
  const leyenda = document.getElementById("leyenda-estados");

  if (total === 0) {
    mostrarVacio("grafica-estados", "Todavía no hay pedidos.");
    if (leyenda) leyenda.innerHTML = "";
    return;
  }

  const orden = ["aprobado", "pendiente", "rechazado"];
  const chart = obtenerInstancia("grafica-estados");
  if (chart) {
    chart.setOption(
      {
        textStyle: { fontFamily: FUENTE_GRAFICA },
        tooltip: {
          trigger: "item",
          ...tooltipBase(),
          formatter: (p) => `<strong>${p.value}</strong> ${p.name.toLowerCase()} (${p.percent}%)`,
        },
        series: [
          {
            type: "pie",
            radius: ["64%", "92%"],
            avoidLabelOverlap: false,
            label: { show: false },
            labelLine: { show: false },
            data: orden
              .filter((clave) => conteo[clave] > 0)
              .map((clave) => ({
                name: ESTADOS_PEDIDO_GRAFICA[clave].etiqueta,
                value: conteo[clave],
                itemStyle: { color: ESTADOS_PEDIDO_GRAFICA[clave].color },
              })),
          },
        ],
        graphic: {
          elements: [
            { type: "text", left: "center", top: "42%", style: { text: String(total), fontSize: 24, fontWeight: 700, fill: "#14120f", fontFamily: FUENTE_GRAFICA } },
            { type: "text", left: "center", top: "58%", style: { text: "pedidos", fontSize: 11, fill: "#6b675f", fontFamily: FUENTE_GRAFICA } },
          ],
        },
      },
      true
    );
  }

  if (leyenda) {
    leyenda.innerHTML = orden
      .map((clave) => {
        const valor = conteo[clave];
        const pct = Math.round((valor / total) * 100);
        return `
          <div class="fila-leyenda-estado">
            <span class="punto-leyenda" style="background:${ESTADOS_PEDIDO_GRAFICA[clave].color}"></span>
            <span class="nombre-leyenda">${ESTADOS_PEDIDO_GRAFICA[clave].etiqueta}</span>
            <span class="cuenta-leyenda">${valor}</span>
            <span class="pct-leyenda">${pct}%</span>
          </div>`;
      })
      .join("");
  }
}

/* ===== 4) Productos por categoría (columnas doradas, esquinas redondeadas) ===== */
function contarProductosPorCategoria(productos) {
  const conteo = {};
  for (const t of TIPOS_PRODUCTO) conteo[t.valor] = 0;
  for (const p of productos) {
    if (conteo[p.tipo] !== undefined) conteo[p.tipo]++;
  }
  return TIPOS_PRODUCTO.map((t) => ({ etiqueta: t.etiqueta, valor: conteo[t.valor] }));
}

function renderProductosPorCategoria(productos) {
  const datos = contarProductosPorCategoria(productos);
  const total = datos.reduce((s, d) => s + d.valor, 0);
  if (total === 0) {
    mostrarVacio("grafica-categorias", "Todavía no hay productos cargados.");
    return;
  }
  const chart = obtenerInstancia("grafica-categorias");
  if (!chart) return;

  chart.setOption(
    {
      textStyle: { fontFamily: FUENTE_GRAFICA },
      grid: { left: 26, right: 10, top: 26, bottom: 24 },
      xAxis: {
        type: "category",
        data: datos.map((d) => d.etiqueta),
        axisLine: LINEA_GRILLA,
        axisTick: { show: false },
        axisLabel: EJE_TEXTO,
      },
      yAxis: { type: "value", minInterval: 1, splitLine: LINEA_GRILLA, axisLabel: EJE_TEXTO },
      tooltip: {
        trigger: "item",
        ...tooltipBase(),
        formatter: (p) => `<strong>${p.value}</strong> producto${p.value === 1 ? "" : "s"}<br>${p.name}`,
      },
      series: [
        {
          type: "bar",
          data: datos.map((d) => d.valor),
          barWidth: "48%",
          itemStyle: { color: COLOR_ORO_GRAFICA, borderRadius: [6, 6, 0, 0] },
          label: { show: true, position: "top", fontFamily: FUENTE_GRAFICA, fontWeight: 700, fontSize: 11, color: "#14120f", formatter: (p) => (p.value > 0 ? p.value : "") },
        },
      ],
    },
    true
  );
}

/* ===== 5) Más vendidos (barra horizontal dorada, ranking) ===== */
function calcularTopProductos(pedidos, productos, top) {
  const mapaNombres = new Map(productos.map((p) => [p.referencia, p.nombre]));
  const cantidadPorReferencia = new Map();
  for (const pedido of pedidos) {
    const items = Array.isArray(pedido.items) ? pedido.items : [];
    for (const item of items) {
      const ref = item.referencia;
      if (!ref || ref === "PERSONALIZADO") continue;
      const cantidad = Number(item.cantidad) || 0;
      cantidadPorReferencia.set(ref, (cantidadPorReferencia.get(ref) || 0) + cantidad);
    }
  }
  return [...cantidadPorReferencia.entries()]
    .map(([referencia, cantidad]) => ({ referencia, cantidad, nombre: mapaNombres.get(referencia) || referencia }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, top);
}

function renderTopProductos(pedidos, productos) {
  const datos = calcularTopProductos(pedidos, productos, 5);
  if (datos.length === 0) {
    mostrarVacio("grafica-top-productos", "Todavía no hay unidades vendidas.");
    return;
  }
  const chart = obtenerInstancia("grafica-top-productos");
  if (!chart) return;

  chart.setOption(
    {
      textStyle: { fontFamily: FUENTE_GRAFICA },
      grid: { left: 4, right: 34, top: 6, bottom: 6, containLabel: true },
      xAxis: { type: "value", show: false },
      yAxis: {
        type: "category",
        inverse: true,
        data: datos.map((d) => d.nombre),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { ...EJE_TEXTO, color: "#14120f" },
      },
      tooltip: {
        trigger: "item",
        ...tooltipBase(),
        formatter: (p) => {
          const d = datos[p.dataIndex];
          return `<strong>${d.cantidad}</strong> unidad${d.cantidad === 1 ? "" : "es"} vendidas<br>${escaparTextoGrafica(d.nombre)} (${escaparTextoGrafica(d.referencia)})`;
        },
      },
      series: [
        {
          type: "bar",
          data: datos.map((d) => d.cantidad),
          barWidth: 16,
          itemStyle: { color: COLOR_ORO_GRAFICA, borderRadius: [0, 6, 6, 0] },
          label: { show: true, position: "right", fontFamily: FUENTE_GRAFICA, fontWeight: 700, fontSize: 11, color: "#14120f" },
        },
      ],
    },
    true
  );
}

/* ===== 6) Últimos pedidos (tabla, reusa .tabla-admin y .estado-pago) ===== */
const ETIQUETAS_ESTADO_TABLA = { aprobado: "Aprobado", pendiente: "Pendiente", rechazado: "Rechazado" };

function renderUltimosPedidos(pedidos) {
  const cuerpo = document.getElementById("cuerpo-ultimos-pedidos");
  const vacio = document.getElementById("ultimos-pedidos-vacio");
  if (!cuerpo || !vacio) return;

  if (pedidos.length === 0) {
    cuerpo.innerHTML = "";
    vacio.classList.remove("oculto");
    return;
  }
  vacio.classList.add("oculto");

  cuerpo.innerHTML = pedidos
    .slice(0, 5)
    .map((p) => {
      const estado = ETIQUETAS_ESTADO_TABLA[p.estado] ? p.estado : "pendiente";
      const fecha = p.creadoEn ? new Date(p.creadoEn).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—";
      return `
        <tr>
          <td>${escaparTextoGrafica(p.id)}</td>
          <td>${escaparTextoGrafica(p.cliente?.nombre || "—")}</td>
          <td>${fecha}</td>
          <td><span class="estado-pago ${estado}" style="margin-bottom:0;">${ETIQUETAS_ESTADO_TABLA[estado]}</span></td>
          <td>${formatearPrecioAdmin(p.total)}</td>
        </tr>`;
    })
    .join("");
}

/* ===== Filtro de rango (14/30/todo el histórico) ===== */
function renderGraficasDeTiempo() {
  const { cubos } = construirCubosPeriodo(datosDashboard.pedidos, diasRangoActual);
  renderPedidosPorDia(cubos);
  renderTendenciaVentas(cubos);
}

function conectarFiltroRango() {
  const botones = document.querySelectorAll("#filtro-rango-graficas button");
  botones.forEach((btn) => {
    btn.addEventListener("click", () => {
      botones.forEach((b) => b.classList.remove("activo"));
      btn.classList.add("activo");
      const rango = btn.getAttribute("data-dias");
      diasRangoActual = rango === "todo" ? null : Number(rango);
      renderGraficasDeTiempo();
    });
  });
}

/* ===== Punto de entrada: llamado desde cargarStats() en admin/index.html ===== */
function renderGraficas(productos, pedidos) {
  if (!document.getElementById("grafica-pedidos-dia")) return;
  if (typeof echarts === "undefined") return;

  datosDashboard = { productos, pedidos };

  if (!renderGraficas.filtroConectado) {
    conectarFiltroRango();
    renderGraficas.filtroConectado = true;
  }

  renderGraficasDeTiempo();
  renderPedidosPorEstado(pedidos);
  renderProductosPorCategoria(productos);
  renderTopProductos(pedidos, productos);
  renderUltimosPedidos(pedidos);
}

/* ===== Estadísticas del taller (dinar-3dwax), llamadas desde
   cargarStatsTaller() en admin/index.html ===== */
function renderGraficaTaller(meses) {
  const chart = obtenerInstancia("grafica-taller-ingresos");
  if (!chart) return;

  chart.setOption({
    tooltip: { ...tooltipBase(), trigger: "axis" },
    legend: { data: ["Ingresos", "Ganancia"], top: 0, textStyle: EJE_TEXTO },
    grid: { left: 55, right: 16, top: 36, bottom: 28 },
    xAxis: {
      type: "category",
      data: meses.map((m) => m.etiqueta),
      axisLabel: EJE_TEXTO,
      axisLine: LINEA_GRILLA,
    },
    yAxis: { type: "value", axisLabel: EJE_TEXTO, splitLine: LINEA_GRILLA },
    series: [
      {
        name: "Ingresos",
        type: "bar",
        data: meses.map((m) => m.ingresos),
        itemStyle: { color: COLOR_ORO_GRAFICA },
      },
      {
        name: "Ganancia",
        type: "line",
        smooth: true,
        data: meses.map((m) => m.ganancia),
        itemStyle: { color: COLOR_VERDE_GRAFICA },
      },
    ],
  });
}

function renderTopTallerTablas(topClientes, topServicios) {
  const el = document.getElementById("tablas-taller-top");
  if (!el) return;

  const listaClientes = topClientes.length
    ? topClientes
        .map(
          (c) =>
            `<li>${escaparTextoGrafica(c.nombre)} — ${formatearPrecioAdmin(c.totalFacturado)} (${c.numPedidos} pedido${c.numPedidos === 1 ? "" : "s"})</li>`
        )
        .join("")
    : '<li style="list-style:none; color:var(--gris);">Sin datos todavía</li>';

  const listaServicios = topServicios.length
    ? topServicios
        .map((s) => `<li>${escaparTextoGrafica(s.nombre)} — ${formatearPrecioAdmin(s.ingresos)}</li>`)
        .join("")
    : '<li style="list-style:none; color:var(--gris);">Sin datos todavía</li>';

  el.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; font-size:0.85rem;">
      <div>
        <p style="font-weight:600; font-size:0.82rem; margin:0 0 8px;">Top clientes</p>
        <ol style="margin:0; padding-left:18px;">${listaClientes}</ol>
      </div>
      <div>
        <p style="font-weight:600; font-size:0.82rem; margin:0 0 8px;">Top servicios</p>
        <ol style="margin:0; padding-left:18px;">${listaServicios}</ol>
      </div>
    </div>
  `;
}

/* ===== Cera, ganancias y gastos (llamado desde cargarStatsTaller() en
   admin/index.html). Las series por día/semana/mes de cera, costo de cera
   y ganancia las calcula el taller (lib/estadisticas.ts de dinar-3dwax) en
   hora de Colombia; aquí se les suman los gastos de este admin (Materiales
   y Pagos a colaboradores) con la misma regla de períodos: semanas de lunes
   a domingo con clave "YYYY-MM-DD" del lunes, meses con clave "YYYY-MM". ===== */
const COLOR_ROJO_GRAFICA = "#d03b3b";
const COLOR_GASTO_MATERIALES = "#8c7346";
const COLOR_GASTO_COLABORADORES = "#d9bd76";
const COLOR_GASTO_CERA = "#b8963e";
let datosConsumo = null;
let periodoConsumo = "semana";

function lunesDeFecha(claveDia) {
  const [y, m, d] = claveDia.split("-").map(Number);
  const fecha = new Date(Date.UTC(y, m - 1, d));
  fecha.setUTCDate(fecha.getUTCDate() - ((fecha.getUTCDay() + 6) % 7));
  return fecha.toISOString().slice(0, 10);
}

/** Gastos del admin agrupados en el período ("semana" o "mes"). Las fechas
 * de Materiales/Pagos son DATE: la API las manda como timestamp, se usa
 * solo la parte de fecha. */
function agruparGastosAdmin(gastos, periodo) {
  const cubos = {};
  const sumar = (fecha, campo, valor) => {
    const dia = String(fecha).slice(0, 10);
    const clave = periodo === "mes" ? dia.slice(0, 7) : lunesDeFecha(dia);
    cubos[clave] = cubos[clave] || { materiales: 0, colaboradores: 0 };
    cubos[clave][campo] += Number(valor) || 0;
  };
  for (const m of gastos.materiales || []) sumar(m.fecha, "materiales", m.costoTotal);
  for (const p of gastos.pagos || []) sumar(p.fecha, "colaboradores", p.monto);
  return cubos;
}

/** "−$48.000" en vez de "$-48.000" para una ganancia negativa. */
function formatearDinero(valor) {
  return valor < 0 ? `−${formatearPrecioAdmin(-valor)}` : formatearPrecioAdmin(valor);
}

function formatearGramos(g) {
  return `${(Math.round(g * 10) / 10).toLocaleString("es-CO")} g`;
}

function renderConsumoYGastos(series, gastos) {
  const mensaje = document.getElementById("consumo-mensaje");
  if (!series || !series.semana) {
    // El taller aún no expone las series (versión anterior desplegada).
    mensaje.textContent = "El taller todavía no envía el consumo de cera por período.";
    mensaje.className = "mensaje-admin error";
    return;
  }
  datosConsumo = { series, gastos };
  if (!gastos.ok) {
    mensaje.textContent = "No se pudieron cargar Materiales/Pagos: los gastos muestran solo el costo de la cera.";
    mensaje.className = "mensaje-admin error";
  }
  if (!renderConsumoYGastos.filtroConectado) {
    const botones = document.querySelectorAll("#filtro-periodo-consumo button");
    botones.forEach((btn) =>
      btn.addEventListener("click", () => {
        botones.forEach((b) => b.classList.remove("activo"));
        btn.classList.add("activo");
        periodoConsumo = btn.getAttribute("data-periodo");
        dibujarConsumo();
      })
    );
    renderConsumoYGastos.filtroConectado = true;
  }
  document.getElementById("contenedor-graficas-consumo").style.display = "";
  dibujarConsumo();
}

function dibujarConsumo() {
  if (!datosConsumo) return;
  const periodo = periodoConsumo;
  const puntos = datosConsumo.series[periodo] || [];
  const nombres = { dia: "Últimos 30 días", semana: "Últimas 12 semanas (lunes a domingo)", mes: "Últimos 12 meses" };
  const actual = { dia: "Hoy", semana: "Esta semana", mes: "Este mes" }[periodo];
  const etiquetas = puntos.map((p) => p.etiqueta);

  // Gastos solo por semana y por mes (lo pedido); por día no se muestran.
  const conGastos = periodo !== "dia";
  const cubosGastos = conGastos ? agruparGastosAdmin(datosConsumo.gastos, periodo) : {};
  const materiales = puntos.map((p) => Math.round(cubosGastos[p.clave]?.materiales || 0));
  const colaboradores = puntos.map((p) => Math.round(cubosGastos[p.clave]?.colaboradores || 0));
  const costoCera = puntos.map((p) => Math.round(p.costoCera || 0));

  const ultimo = puntos[puntos.length - 1] || { ceraGramos: 0, ganancia: 0 };
  const i = puntos.length - 1;
  const gastoActual = conGastos ? materiales[i] + colaboradores[i] + costoCera[i] : null;
  const tarjetas = [
    { valor: formatearGramos(ultimo.ceraGramos), etiqueta: `Cera usada · ${actual.toLowerCase()}`, icono: "🕯️" },
    { valor: formatearDinero(ultimo.ganancia), etiqueta: `Ganancia · ${actual.toLowerCase()}`, icono: "📈", alerta: ultimo.ganancia < 0 },
  ];
  if (conGastos) tarjetas.push({ valor: formatearPrecioAdmin(gastoActual), etiqueta: `Gastos · ${actual.toLowerCase()}`, icono: "🧾" });
  document.getElementById("grid-kpi-consumo").innerHTML = tarjetas
    .map(
      (t) => `
      <div class="tarjeta-stat ${t.alerta ? "icono-alerta" : ""}">
        <div class="tarjeta-stat-cabecera"><span class="icono-stat">${t.icono}</span></div>
        <div class="valor">${t.valor}</div>
        <div class="etiqueta">${escaparTextoGrafica(t.etiqueta)}</div>
      </div>`
    )
    .join("");

  document.getElementById("subtitulo-consumo-cera").textContent = `${nombres[periodo]} · por fecha de impresión`;
  document.getElementById("subtitulo-consumo-ganancia").textContent = `${nombres[periodo]} · precio menos costo de la cera`;
  document.getElementById("subtitulo-consumo-gastos").textContent = nombres[periodo];
  document.getElementById("tarjeta-grafica-gastos").style.display = conGastos ? "" : "none";

  const ejeX = { type: "category", data: etiquetas, axisLabel: { ...EJE_TEXTO, hideOverlap: true }, axisLine: LINEA_GRILLA };
  const grilla = { left: 60, right: 16, top: 16, bottom: 28 };

  const cera = obtenerInstancia("grafica-consumo-cera");
  if (cera) {
    cera.setOption(
      {
        tooltip: { ...tooltipBase(), trigger: "axis", valueFormatter: (v) => formatearGramos(v) },
        grid: grilla,
        xAxis: ejeX,
        yAxis: { type: "value", axisLabel: { ...EJE_TEXTO, formatter: "{value} g" }, splitLine: LINEA_GRILLA },
        series: [{ name: "Cera", type: "bar", data: puntos.map((p) => Math.round(p.ceraGramos * 10) / 10), itemStyle: { color: COLOR_ORO_GRAFICA, borderRadius: [4, 4, 0, 0] } }],
      },
      true
    );
  }

  const ganancia = obtenerInstancia("grafica-consumo-ganancia");
  if (ganancia) {
    ganancia.setOption(
      {
        tooltip: { ...tooltipBase(), trigger: "axis", valueFormatter: (v) => formatearDinero(v) },
        grid: grilla,
        xAxis: ejeX,
        yAxis: { type: "value", axisLabel: { ...EJE_TEXTO, formatter: (v) => v.toLocaleString("es-CO") }, splitLine: LINEA_GRILLA },
        series: [
          {
            name: "Ganancia",
            type: "bar",
            data: puntos.map((p) => ({
              value: Math.round(p.ganancia),
              itemStyle: { color: p.ganancia < 0 ? COLOR_ROJO_GRAFICA : COLOR_VERDE_GRAFICA, borderRadius: [4, 4, 0, 0] },
            })),
          },
        ],
      },
      true
    );
  }

  if (conGastos) {
    const gastosChart = obtenerInstancia("grafica-consumo-gastos");
    if (gastosChart) {
      const apilada = (name, data, color) => ({ name, type: "bar", stack: "gastos", data, itemStyle: { color } });
      gastosChart.setOption(
        {
          tooltip: { ...tooltipBase(), trigger: "axis", valueFormatter: (v) => formatearDinero(v) },
          legend: { data: ["Materiales", "Colaboradores", "Costo de cera"], top: 0, textStyle: EJE_TEXTO },
          grid: { ...grilla, top: 36 },
          xAxis: ejeX,
          yAxis: { type: "value", axisLabel: { ...EJE_TEXTO, formatter: (v) => v.toLocaleString("es-CO") }, splitLine: LINEA_GRILLA },
          series: [
            apilada("Materiales", materiales, COLOR_GASTO_MATERIALES),
            apilada("Colaboradores", colaboradores, COLOR_GASTO_COLABORADORES),
            apilada("Costo de cera", costoCera, COLOR_GASTO_CERA),
          ],
        },
        true
      );
      // Al volver de "Por día" la tarjeta estaba oculta (ancho 0): se
      // recalcula el tamaño ya visible.
      gastosChart.resize();
    }
  }
}
