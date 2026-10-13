/**
 * Visor 3D interactivo para archivos STL (usado en la ficha de producto).
 * Requiere el importmap de "three" declarado en la página (ver producto.html).
 */
import * as THREE from "three";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/**
 * Aproxima el color de la cera real a partir del texto del campo "material"
 * del producto (p. ej. "Cera casteable rosa" / "Cera casteable verde"),
 * para que el visor se vea parecido a la pieza física. Rosa es el color por
 * defecto porque es el material más común del catálogo.
 */
function colorCeraPorMaterial(material) {
  const texto = String(material || "").toLowerCase();
  if (texto.includes("verde")) return 0x6fae6f;
  return 0xe87da0; // rosa
}

window.iniciarVisorSTL = function iniciarVisorSTL(idContenedor, urlStl, material) {
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
  escena.background = new THREE.Color(0xf1ece1);

  const camara = new THREE.PerspectiveCamera(45, ancho / alto, 0.1, 5000);

  const renderizador = new THREE.WebGLRenderer({ antialias: true });
  renderizador.setSize(ancho, alto);
  renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  contenedor.appendChild(renderizador.domElement);

  escena.add(new THREE.AmbientLight(0xffffff, 0.7));
  const luz1 = new THREE.DirectionalLight(0xffffff, 0.9);
  luz1.position.set(1, 1, 1);
  escena.add(luz1);
  const luz2 = new THREE.DirectionalLight(0xffffff, 0.4);
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

      const materialCera = new THREE.MeshStandardMaterial({
        color: colorCeraPorMaterial(material),
        metalness: 0.05,
        roughness: 0.55,
      });
      escena.add(new THREE.Mesh(geometria, materialCera));

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
