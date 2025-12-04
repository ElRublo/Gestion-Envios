// src/assets/CafeteriaView.jsx
export default function CafeteriaView({ ordenes }) {
  
  const ordenesCafeteria = ordenes.filter(o =>
    o.webhook_url?.includes("cafeteria")
  );

  return (
    <>
      <section className="card">
        <div className="card-section-header">
          <div className="card-section-title">
            <span className="card-section-icon">☕</span>
            Resumen de Cafetería
          </div>
        </div>

        <p className="placeholder-text">
          Órdenes registradas desde el sistema de Cafetería.
        </p>
      </section>

      {ordenesCafeteria.length > 0 && (
        <section className="card">
          <div className="card-section-header">
            <div className="card-section-title">
              <span className="card-section-icon">📋</span>
              Órdenes Cafetería
            </div>
          </div>

          <div className="table-wrapper">
            <table className="tabla">
              <thead>
                <tr>
                  <th>ID Externa</th>
                  <th>Código</th>
                  <th>Estado</th>
                  <th>Ubicación</th>
                </tr>
              </thead>
              <tbody>
                {ordenesCafeteria.map((o) => (
                  <tr key={o.codigo_seguimiento}>
                    <td>{o.id_orden_externa}</td>
                    <td>{o.codigo_seguimiento}</td>
                    <td>{o.estado_actual}</td>
                    <td>{o.ubicacion_actual}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
