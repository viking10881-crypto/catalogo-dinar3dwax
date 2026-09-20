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
