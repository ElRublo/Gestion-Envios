import { useState } from "react";
import axios from "axios";

const API_URL = "https://gestion-envios-sz3x.onrender.com";

export default function App() {
  const [trackingCode, setTrackingCode] = useState("");
  const [order, setOrder] = useState(null);
  const [estado, setEstado] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const estadosDisponibles = [
    "RECIBIDA",
    "FECHA_SET",
    "EN_CAMINO",
    "ENTREGADO",
  ];

  const buscarOrden = async () => {
    if (!trackingCode) return;
    setLoading(true);
    setMsg("");

    try {
      const res = await axios.get(`${API_URL}/ordenes/${trackingCode}`);
      setOrder(res.data);
    } catch (err) {
      if (err.response) {
        if (err.response.status === 404) {
          setMsg("❌ No se encontró la orden.");
        } else {
          setMsg("⚠️ Error del servidor. Intenta de nuevo.");
        }
      } else {
        setMsg("⚠️ El servidor está iniciando o no responde. Intenta de nuevo.");
      }
      setOrder(null);
    }

    setLoading(false);
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
    } catch (err) {
      setMsg("❌ Error al actualizar estado.");
    }
  };

  return (
    <div className="container">
      <h2>🟦 Panel Interno de Envíos</h2>

      <div className="card">
        <label>Código de seguimiento:</label>
        <input
          value={trackingCode}
          onChange={(e) => setTrackingCode(e.target.value)}
          placeholder="Ej: 8F3A7"
        />
        <button onClick={buscarOrden}>Buscar orden</button>
      </div>

      {loading && <p>Cargando...</p>}
      {msg && <p>{msg}</p>}

      {order && (
        <>
          {/* Información de la orden */}
          <div className="card info">
            <h3>📦 Información de la Orden</h3>
            <p><b>ID Externa:</b> {order.id_orden_externa}</p>
            <p><b>Código:</b> {order.codigo_seguimiento}</p>
            <p><b>Estado actual:</b> {order.estado_actual}</p>
            <p><b>Ubicación actual:</b> {order.ubicacion_actual}</p>
            <p><b>Actualizado:</b> {new Date(order.fecha_actualizacion).toLocaleString()}</p>
          </div>

          {/* Actualizar */}
          <div className="card">
            <h3>🔧 Actualizar Estado</h3>

            <label>Nuevo estado:</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
            >
              <option value="">Seleccione...</option>
              {estadosDisponibles.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>

            <label>Nueva ubicación / detalle:</label>
            <input
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              placeholder="Ej: Centro de distribución"
            />

            <button className="btn-success" onClick={actualizarEstado}>
              Actualizar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
