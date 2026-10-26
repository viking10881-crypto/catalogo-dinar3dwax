/**
 * Visor 3D interactivo para archivos STL (usado en la ficha de producto).
 * Requiere el importmap de "three" declarado en la página (ver producto.html).
 */
import * as THREE from "three";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/**
 * El modelo se muestra como la joya terminada en oro (pedido del cliente),
 * no del color de la cera: dorado metálico sobre fondo oscuro, a juego con
 * la paleta negro + dorado del sitio. Un metal sin nada que reflejar se ve
 * casi negro, por eso la escena lleva un entorno de estudio (RoomEnvironment)
 * como reflejo, además de las luces.
 */
const COLOR_FONDO = 0x0e0e0f;
const COLOR_ORO = 0xd4af37;

// El tercer parámetro (material) se conserva por compatibilidad con
// js/producto.js, pero ya no cambia el color del modelo.
window.iniciarVisorSTL = function iniciarVisorSTL(idContenedor, urlStl) {
  const contenedor = document.getElementById(idContenedor);
  if (!contenedor || !urlStl) return;
  contenedor.innerHTML = "";

  // Los archivos STL de este catálogo pueden pesar varios MB (son modelos
  // 3D densos, no una foto): sin esto, la sección se queda en blanco un
  // buen rato y se siente "trabada" en vez de "cargando".
  const avisoCarga = document.createElement("div");
  avisoCarga.className = "visor-stl-cargando";
  avisoCarga.innerHTML = `
    <div class="visor-stl-barra"><div class="visor-stl-relleno" style="width:0%"></div></div>
    <span class="visor-stl-texto">Cargando modelo 3D...</span>
  `;
  contenedor.appendChild(avisoCarga);
  const textoCarga = avisoCarga.querySelector(".visor-stl-texto");
  const barraCarga = avisoCarga.querySelector(".visor-stl-relleno");

  const ancho = contenedor.clientWidth || 600;
  const alto = contenedor.clientHeight || 420;

  const escena = new THREE.Scene();
  escena.background = new THREE.Color(COLOR_FONDO);

  const camara = new THREE.PerspectiveCamera(45, ancho / alto, 0.1, 5000);

  const renderizador = new THREE.WebGLRenderer({ antialias: true });
  renderizador.setSize(ancho, alto);
  renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderizador.toneMapping = THREE.ACESFilmicToneMapping;
  renderizador.toneMappingExposure = 1.05;
  contenedor.appendChild(renderizador.domElement);

  // Reflejos del metal: entorno de estudio pre-filtrado (no se ve de fondo,
  // solo en el brillo de la pieza).
  const pmrem = new THREE.PMREMGenerator(renderizador);
  escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  escena.add(new THREE.AmbientLight(0xffffff, 0.25));
  const luz1 = new THREE.DirectionalLight(0xfff4e0, 1.4);
  luz1.position.set(1, 1, 1);
  escena.add(luz1);
  const luz2 = new THREE.DirectionalLight(0xffffff, 0.5);
  luz2.position.set(-1, -0.5, -1);
  escena.add(luz2);

  const controles = new OrbitControls(camara, renderizador.domElement);
  controles.enableDamping = true;
  controles.dampingFactor = 0.08;

  const cargador = new STLLoader();
  cargador.load(
    urlStl,
    (geometria) => {
      avisoCarga.remove();

      geometria.center();
      geometria.computeVertexNormals();
      geometria.computeBoundingSphere();

      const materialOro = new THREE.MeshStandardMaterial({
        color: COLOR_ORO,
        metalness: 1,
        roughness: 0.28,
      });
      escena.add(new THREE.Mesh(geometria, materialOro));

      const radio = geometria.boundingSphere ? geometria.boundingSphere.radius : 10;
      camara.position.set(radio * 1.8, radio * 1.4, radio * 1.8);
      camara.near = radio / 100;
      camara.far = radio * 100;
      camara.updateProjectionMatrix();
      controles.target.set(0, 0, 0);
      controles.update();

      animar();
    },
    (evento) => {
      // event.total viene del Content-Length del archivo (Vercel Blob sí lo
      // manda); sin eso no hay de dónde sacar un porcentaje real, así que
      // se deja el mensaje genérico en vez de inventar un número.
      if (evento.lengthComputable && evento.total > 0) {
        const pct = Math.min(100, Math.round((evento.loaded / evento.total) * 100));
        barraCarga.style.width = `${pct}%`;
        textoCarga.textContent = `Cargando modelo 3D... ${pct}% (${(evento.total / 1024 / 1024).toFixed(1)} MB)`;
      }
    },
    () => {
      contenedor.innerHTML =
        '<p style="padding:20px;color:#b23b3b;">No se pudo cargar el modelo 3D.</p>';
    }
  );

  let activo = true;
  function animar() {
    if (!contenedor.isConnected) {
      activo = false;
      return;
    }
    if (!activo) return;
    requestAnimationFrame(animar);
    controles.update();
    renderizador.render(escena, camara);
  }

  window.addEventListener("resize", () => {
    if (!contenedor.isConnected) return;
    const w = contenedor.clientWidth || ancho;
    const h = contenedor.clientHeight || alto;
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
    renderizador.setSize(w, h);
  });
};
