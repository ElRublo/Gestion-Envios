import { useState, useEffect } from "react";
import axios from "axios";
import "./styles.css";
import CafeteriaView from "./assets/CafeteriaView.jsx";
import VandentialsView from "./assets/VandentialsView.jsx";

const API_URL = "https://gestion-envios-sz3x.onrender.com";

export default function App() {
  const [trackingCode, setTrackingCode] = useState("");
  const [order, setOrder] = useState(null);
  const [estado, setEstado] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [ordenes, setOrdenes] = useState([]);
  const [vistaActual, setVistaActual] = useState("core");

  const estadosDisponibles = [
    "RECIBIDA",
    "FECHA_SET",
    "EN_CAMINO",
    "ENTREGADO",
  ];

  const formatEstado = (estado) => (estado ? estado.replace(/_/g, " ") : "");

  const getEstadoClass = (estado) => {
    switch (estado) {
      case "RECIBIDA":
        return "pill pill-recibida";
      case "FECHA_SET":
        return "pill pill-fecha";
      case "EN_CAMINO":
        return "pill pill-camino";
      case "ENTREGADO":
        return "pill pill-entregado";
      default:
        return "pill";
    }
  };

  const buscarOrden = async () => {
    if (!trackingCode) return;
    setLoading(true);
    setMsg("");

    try {
      const res = await axios.get(
        `${API_URL}/interna/ordenes-completa/${trackingCode}`
      );
      setOrder(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setMsg("❌ No se encontró la orden.");
      } else {
        setMsg("⚠️ No se pudo conectar al servidor.");
      }
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };


  const actualizarEstado = async () => {
    if (!estado || !ubicacion) {
      setMsg("⚠️ Estado y ubicación son obligatorios.");
      return;
    }

    try {
      const res = await axios.patch(
        `${API_URL}/interna/ordenes/${trackingCode}/estado`,
        { estado, ubicacion }
      );
      setOrder(res.data);
      setMsg("✅ Estado actualizado correctamente.");
      setUbicacion("");
      setEstado("");
    } catch (err) {
      setMsg("❌ Error al actualizar estado.");
    }
  };

  const cargarOrdenes = async () => {
    try {
      const res = await axios.get(`${API_URL}/interna/ordenes`);
      setOrdenes(res.data);
    } catch (err) {
      setMsg("⚠️ No se pudieron cargar las órdenes.");
    }
  };

  useEffect(() => {
    cargarOrdenes();
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-title">MÓDULOS</div>
        <div className="sidebar-buttons">
          <button
            className={`sidebar-btn ${vistaActual === "core" ? "active" : ""}`}
            onClick={() => {
              setVistaActual("core");
              setOrder(null);
              setTrackingCode("");
              setMsg("");
            }}
          >
            <span className="sidebar-icon">🧩</span>
            Planet Express
          </button>
          <button
            className={`sidebar-btn ${
              vistaActual === "vandentials" ? "active" : ""
            }`}
            onClick={() => setVistaActual("vandentials")}
          >
            <span className="sidebar-icon">📦</span>
            Vandentials
          </button>
          <button
            className={`sidebar-btn ${
              vistaActual === "cafeteria" ? "active" : ""
            }`}
            onClick={() => setVistaActual("cafeteria")}
          >
            <span className="sidebar-icon">☕</span>
            Cafetería
          </button>
        </div>
        <div className="sidebar-footer">© 2025 Planet Express Panel</div>
      </aside>
      <div className="main-area">
        {vistaActual === "core" && (
          <section className="card card-header-main header-core">
            <div className="header-core-left">
              <h1>PLANET EXPRESS</h1>
              <p className="header-description">
                Panel de Búsqueda y Administración de Órdenes (VISTA PRINCIPAL)
              </p>
            </div>
            {order && (
              <button
                className="btn-small back-btn"
                onClick={() => {
                  setOrder(null);
                  setTrackingCode("");
                  setMsg("");
                }}
              >
                ⬅ Regresar
              </button>
            )}
          </section>
        )}
        {vistaActual === "vandentials" && (
          <section className="card card-header-main header-core">
            <div className="header-core-left">
              <h1>Vandentials | Panel de Envíos</h1>
              <p className="header-description">
                Gestión y resumen de órdenes para el cliente Vandentials.
              </p>
            </div>
            <button
              className="btn-small back-btn"
              onClick={() => setVistaActual("core")}
            >
              ⬅ Volver a PLANET EXPRESS
            </button>
          </section>
        )}
        {vistaActual === "cafeteria" && (
          <section className="card card-header-main header-core">
            <div className="header-core-left">
              <h1>Cafetería | Panel de Envíos</h1>
              <p className="header-description">
                Vista especializada para órdenes ligadas a Cafetería.
              </p>
            </div>
            <button
              className="btn-small back-btn"
              onClick={() => setVistaActual("core")}
            >
              ⬅ Volver a PLANET EXPRESS
            </button>
          </section>
        )}
        {vistaActual === "core" && (
          <>
            <section className="card card-search">
              <div className="card-section-header">
                <div className="card-section-title">
                  <span className="card-section-icon">🔍</span>
                  Buscar Orden
                </div>
              </div>
              <div className="search-row">
                <div>
                  <label>ID o BPV (Código de seguimiento)</label>
                  <input
                    value={trackingCode}
                    onChange={(e) =>
                      setTrackingCode(e.target.value.toUpperCase())
                    }
                    placeholder="Ej: 8F3A7"
                  />
                </div>
                <button
                  className="btn-primary"
                  onClick={buscarOrden}
                  disabled={!trackingCode || loading}
                >
                  {loading ? "Buscando..." : "Buscar Orden"}
                </button>
              </div>
              {msg && <p className="msg">{msg}</p>}
            </section>
            {order && (
              <>
                <section className="card">
                  <div className="card-section-header">
                    <div className="card-section-title">
                      <span className="card-section-icon">📦</span>
                      Detalle de la Orden
                    </div>
                  </div>
                  <div className="info-grid">
                    <div>
                      <span className="info-label">ID Externa</span>
                      <p className="info-value">{order.id_orden_externa}</p>
                    </div>
                    <div>
                      <span className="info-label">Código</span>
                      <p className="info-value">{order.codigo_seguimiento}</p>
                    </div>
                    <div>
                      <span className="info-label">Nombre</span>
                      <p className="info-value">{order?.cliente?.nombre || "No disponible"}</p>
                    </div>
                    <div>
                      <span className="info-label">Dirección</span>
                      <p className="info-value">{order?.cliente?.direccion || "No disponible"}</p>
                    </div>
                    <div>
                      <span className="info-label">Teléfono</span>
                      <p className="info-value">{order?.cliente?.telefono || "No disponible"}</p>
                    </div>
                    <div>
                      <span className="info-label">Email</span>
                      <p className="info-value">{order?.cliente?.email || "No disponible"}</p>
                    </div>
                    <div>
                      <span className="info-label">Estado</span>
                      <p className="info-value">
                        <span className={getEstadoClass(order.estado_actual)}>
                          {formatEstado(order.estado_actual)}
                        </span>
                      </p>
                    </div>
                    <div>
                      <span className="info-label">Ubicación</span>
                      <p className="info-value">{order.ubicacion_actual}</p>
                    </div>
                    <div>
                      <span className="info-label">Actualización</span>
                      <p className="info-value">
                        {new Date(order.fecha_actualizacion).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </section>
                <section className="card card-table">
                  <div className="card-section-header">
                    <div className="card-section-title">
                      <span className="card-section-icon">🛒</span>
                      Productos del Pedido
                    </div>
                  </div>
                  {order.productos && order.productos.length > 0 ? (
                    <div className="table-wrapper">
                      <table className="tabla">
                        <thead>
                          <tr>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Precio</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.productos.map((p, i) => (
                            <tr key={i}>
                              <td>{p.nombre}</td>
                              <td>{p.cantidad}</td>
                              <td>${p.precio_unitario}</td>
                              <td>${p.cantidad * p.precio_unitario}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="msg">⚠️ Esta orden no tiene productos registrados.</p>
                  )}
                </section>
                <section className="card">
                  <div className="card-section-header">
                    <div className="card-section-title">
                      <span className="card-section-icon">⚙️</span>
                      Actualizar Estado
                    </div>
                  </div>
                  <div className="update-grid">
                    <div>
                      <label>Nuevo estado</label>
                      <select
                        value={estado}
                        onChange={(e) => setEstado(e.target.value)}
                      >
                        <option value="">Seleccione...</option>
                        {estadosDisponibles.map((e) => (
                          <option key={e} value={e}>
                            {formatEstado(e)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label>Nueva ubicación</label>
                      <input
                        value={ubicacion}
                        onChange={(e) => setUbicacion(e.target.value)}
                        placeholder="Ej: Centro de distribución"
                      />
                    </div>
                  </div>
                  <button className="btn-success" onClick={actualizarEstado}>
                    Guardar cambios
                  </button>
                </section>
              </>
            )}
            {!order && ordenes.length > 0 && (
              <section className="card card-table">
                <div className="card-section-header">
                  <div className="card-section-title">
                    <span className="card-section-icon">📋</span>
                    Todas las Órdenes Pendientes
                  </div>
                </div>
                <div className="table-wrapper">
                  <table className="tabla">
                    <thead>
                      <tr>
                        <th>ID Externa</th>
                        <th>Código</th>
                        <th>Servicio Origen</th>
                        <th>Estado</th>
                        <th>Ubicación</th>
                        <th>Actualización</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordenes.map((o) => (
                        <tr
                          key={o.codigo_seguimiento}
                          onClick={async () => {
                            try {
                              const res = await axios.get(
                                `${API_URL}/interna/ordenes-completa/${o.codigo_seguimiento}`
                              );
                              setOrder(res.data);
                              setTrackingCode(o.codigo_seguimiento);
                            } catch (err) {
                              console.error("Error al cargar orden completa:", err);
                            }
                          }}
                        >
                          <td>{o.id_orden_externa}</td>
                          <td>{o.codigo_seguimiento}</td>
                          <td>{o.servicio_origen}</td>
                          <td>
                            <span className={getEstadoClass(o.estado_actual)}>
                              {formatEstado(o.estado_actual)}
                            </span>
                          </td>
                          <td>{o.ubicacion_actual}</td>
                          <td>
                            {o.fecha_actualizacion
                              ? new Date(o.fecha_actualizacion).toLocaleString()
                              : "Sin actualización"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
        {vistaActual === "vandentials" && <VandentialsView ordenes={ordenes} />}
        {vistaActual === "cafeteria" && <CafeteriaView ordenes={ordenes} />}
      </div>
    </div>
  );
}
