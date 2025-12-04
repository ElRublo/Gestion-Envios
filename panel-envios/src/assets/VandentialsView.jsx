export default function VandentialsView({ ordenes }) {

  const ordenesVandentials = ordenes.filter(o =>
    o.webhook_url?.includes("e-commerce-test-mm6o")
  );

  return (
    <>
      <section className="card">
        <div className="card-section-header">
          <div className="card-section-title">
            <span className="card-section-icon">📦</span>
            Resumen Vandentials
          </div>
        </div>

        <p className="placeholder-text">
          Órdenes recibidas desde Vandentials.
        </p>
      </section>

      {ordenesVandentials.length > 0 ? (
        <section className="card">
          <div className="card-section-header">
            <div className="card-section-title">
              <span className="card-section-icon">📋</span>
              Órdenes Vandentials
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
                {ordenesVandentials.map((o) => (
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
      ) : (
        <p className="placeholder-text">No hay órdenes de Vandentials.</p>
      )}
    </>
  );
}
