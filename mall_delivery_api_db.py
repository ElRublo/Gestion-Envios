from fastapi import FastAPI, HTTPException, Depends
import httpx
import json
from pydantic import Field
from datetime import datetime
import uuid
from typing import List, Dict, Any, Optional
from sqlmodel import SQLModel, Field as SQLField, Session, create_engine, select
from sqlalchemy import Column
from sqlalchemy.types import JSON
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(
    title="API de Gestión de Envíos del Mall (DB Integrada)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Configuración de la Base de Datos ---
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("La variable de entorno DATABASE_URL no está configurada.")

if DATABASE_URL.startswith("mysql://"):
    DATABASE_URL = DATABASE_URL.replace("mysql://", "mysql+pymysql://", 1)

engine = create_engine(
    DATABASE_URL, 
    echo=True, 
    pool_recycle=3600,
    pool_size=10 
)

def create_db_and_tables():
    """Crea las tablas en la base de datos si no existen."""
    SQLModel.metadata.create_all(engine)

def get_session():
    """Función generadora para las dependencias de FastAPI."""
    with Session(engine) as session:
        yield session

# --- Modelos de SQLModel (Base de Datos) ---

class DatosClienteEntrante(SQLModel):
    nombre: str = Field(..., description="Nombre completo del cliente.")
    direccion: str = Field(..., description="Dirección de envío completa.")
    telefono: str = Field(..., description="Número de teléfono de contacto.")
    email: Optional[str] = Field(None, description="Correo electrónico del cliente (opcional).")

class ProductoEntrante(SQLModel):
    sku: str
    nombre: str
    cantidad: int = Field(1, ge=1)
    precio_unitario: float = Field(..., ge=0)

# Modelo principal de la ORDEN (mapeo a tabla 'ordenes')
class Orden(SQLModel, table=True):
    id: Optional[int] = SQLField(default=None, primary_key=True)
    codigo_seguimiento: str = SQLField(default_factory=lambda: str(uuid.uuid4()).split('-')[0].upper(), unique=True, index=True)
    
    id_orden_externa: str = SQLField(index=True)
    id_orden_original: str
    servicio_origen: str
    webhook_url: Optional[str] = SQLField(default=None)
    
    datos_cliente_json: str
    productos_json: str
    
    # Campos de Estado y Seguimiento
    estado_interno: str = "RECIBIDA"
    estado_actual: str = "Solicitud Recibida"
    ubicacion_actual: str
    fecha_creacion: datetime = SQLField(default_factory=datetime.now)
    fecha_actualizacion: datetime = SQLField(default_factory=datetime.now)
    cierre_diario: bool = False
    
    # Clases Pydantic para la ENTRADA
class OrdenEntrante(SQLModel):
    id_orden_externa: str = Field(..., description="ID único de la orden.")
    id_orden_original: str = Field(..., description="ID de la orden original.")
    servicio_origen: str = Field(..., description="Nombre del negocio.")
    webhook_url: Optional[str] = Field(None, description="URL para notificaciones.")
    datos_cliente: DatosClienteEntrante
    productos: List[ProductoEntrante] = Field(..., min_items=1)

# Clases Pydantic para la RESPUESTA
class EstadoEnvio(SQLModel):
    id_orden_externa: str
    codigo_seguimiento: str
    estado_actual: str
    ubicacion_actual: str
    fecha_actualizacion: datetime

class ActualizacionEstado(SQLModel):
    estado: str = Field(..., description="Nuevo estado de la orden.")
    ubicacion: str = Field(..., description="Nueva ubicación o detalle del estado.")

# Estados de envío predefinidos
STATUS_MAP = {
    "RECIBIDA": "Solicitud Recibida",
    "FECHA_SET": "Fecha de Envío Establecida",
    "EN_CAMINO": "El producto fue enviado y está en camino",
    "ENTREGADO": "El producto fue entregado al cliente",
}

# Ejecuta esta función al iniciar la aplicación
@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# --- Funciones Auxiliares (Simplificadas) ---

def crear_respuesta_estado_from_orden(orden: Orden) -> EstadoEnvio:
    """Convierte un objeto Orden a la estructura de respuesta externa."""
    return EstadoEnvio(
        id_orden_externa=orden.id_orden_externa,
        codigo_seguimiento=orden.codigo_seguimiento,
        estado_actual=orden.estado_actual,
        ubicacion_actual=orden.ubicacion_actual,
        fecha_actualizacion=orden.fecha_actualizacion
    )

# --- Endpoints de la API (Con Conexión a BD) ---

@app.post("/ordenes", response_model=EstadoEnvio, status_code=201, tags=["Negocios / Creación"])
async def crear_orden_envio(orden_entrante: OrdenEntrante, session: Session = Depends(get_session)):
    """Recibe una nueva solicitud de envío y la guarda en la base de datos."""
    
    # 1. Verificar duplicados
    statement = select(Orden).where(
        (Orden.id_orden_externa == orden_entrante.id_orden_externa) & 
        (Orden.servicio_origen == orden_entrante.servicio_origen)
    )
    existing_order = session.exec(statement).first()
    
    if existing_order:
        raise HTTPException(
            status_code=400,
            detail=f"La orden externa ID '{orden_entrante.id_orden_externa}' del servicio '{orden_entrante.servicio_origen}' ya existe y tiene el código de seguimiento '{existing_order.codigo_seguimiento}'."
        )

    # 2. Crear el objeto Orden a guardar
    new_order = Orden(
        id_orden_externa=orden_entrante.id_orden_externa,
        id_orden_original=orden_entrante.id_orden_original,
        servicio_origen=orden_entrante.servicio_origen,
        webhook_url=orden_entrante.webhook_url,
        datos_cliente_json=json.dumps(orden_entrante.datos_cliente.model_dump()),
        productos_json=json.dumps([p.model_dump() for p in orden_entrante.productos]),
        ubicacion_actual=f"Solicitud recibida de {orden_entrante.servicio_origen}",
    )
    # codigo_seguimiento, fecha_creacion, etc. se generan por defecto
    
    # 3. Guardar en la BD
    session.add(new_order)
    session.commit()
    session.refresh(new_order)
    
    return crear_respuesta_estado_from_orden(new_order)

@app.get("/ordenes/{tracking_code}", response_model=EstadoEnvio, tags=["Negocios / Seguimiento"])
async def obtener_estado_orden(tracking_code: str, session: Session = Depends(get_session)):
    """Consulta el estado actual de una orden usando el código de seguimiento."""
    
    statement = select(Orden).where(Orden.codigo_seguimiento == tracking_code)
    order = session.exec(statement).first()
    
    if not order:
        raise HTTPException(
            status_code=404, 
            detail="Código de seguimiento no encontrado."
        )

    return crear_respuesta_estado_from_orden(order)

@app.patch("/interna/ordenes/{tracking_code}/estado", response_model=EstadoEnvio, tags=["Interno / Operaciones"])
async def actualizar_estado_orden(tracking_code: str, actualizacion: ActualizacionEstado, session: Session = Depends(get_session)):
    """Endpoint interno para actualizar el estado de una orden."""
    
    statement = select(Orden).where(Orden.codigo_seguimiento == tracking_code)
    order = session.exec(statement).first()
    
    if not order:
        raise HTTPException(
            status_code=404, 
            detail="Código de seguimiento no encontrado."
        )

    new_status_key = actualizacion.estado.upper().replace(" ", "_")

    if new_status_key not in STATUS_MAP:
        raise HTTPException(
            status_code=400,
            detail=f"Estado inválido. Estados permitidos: {', '.join(STATUS_MAP.keys())}"
        )
    
    # 1. Actualizar campos
    order.estado_interno = new_status_key
    order.estado_actual = STATUS_MAP[new_status_key]
    order.ubicacion_actual = actualizacion.ubicacion
    order.fecha_actualizacion = datetime.now()

    # 2. Marcar para cierre si es Entregado
    if new_status_key == "ENTREGADO":
        order.cierre_diario = True
    
    # 3. Guardar cambios
    session.add(order)
    session.commit()
    session.refresh(order)

    # 4. Notificar vía webhook si está configurado
    if order.webhook_url:
        notification_payload = {
            "codigo_seguimiento": order.codigo_seguimiento,
            "id_orden_externa": order.id_orden_externa,
            "estado_actual": order.estado_actual,
            "ubicacion_actual": order.ubicacion_actual,
            "fecha_actualizacion": order.fecha_actualizacion.isoformat(),
        }
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(order.webhook_url, json=notification_payload)
                # Opcional: Registrar si la notificación falló.
                if response.status_code >= 400:
                    print(f"ERROR: Webhook a {order.webhook_url} falló con estado {response.status_code}")
        except httpx.RequestError as e:
            print(f"ERROR: No se pudo conectar al Webhook {order.webhook_url}. Error: {e}")

    return crear_respuesta_estado_from_orden(order)

@app.get("/interna/cierre-diario", tags=["Interno / Reporte"])
async def obtener_cierre_diario(session: Session = Depends(get_session)):
    """Genera el reporte de entregas cerradas/entregadas."""
    
    statement = select(Orden).where(Orden.cierre_diario == True)
    entregas = session.exec(statement).all()
    
    entregas_del_dia = [
        {
            "id_orden_externa": data.id_orden_externa,
            "codigo_seguimiento": data.codigo_seguimiento,
            "servicio_origen": data.servicio_origen,
            
            "cliente": f"{json.loads(data.datos_cliente_json).get('nombre')} ({json.loads(data.datos_cliente_json).get('direccion')})",
            "productos_count": len(json.loads(data.productos_json)),
            
            "entregado_a_tiempo": "Sí (Simulado)",
            "estado": data.estado_actual
        }
        for data in entregas
    ]
    return {
        "fecha_reporte": datetime.now().strftime("%Y-%m-%d"),
        "total_entregas_para_cierre": len(entregas_del_dia),
        "entregas": entregas_del_dia
    }

@app.get("/interna/ordenes", tags=["Interno / Operaciones"])
async def obtener_todas_ordenes(session: Session = Depends(get_session)):
    """Devuelve TODAS las órdenes registradas en la base de datos."""
    
    statement = select(Orden).order_by(Orden.fecha_creacion.desc())
    ordenes = session.exec(statement).all()

    return [
        {
            "id_orden_externa": o.id_orden_externa,
            "codigo_seguimiento": o.codigo_seguimiento,
            "estado_actual": o.estado_actual,
            "ubicacion_actual": o.ubicacion_actual,
            "fecha_actualizacion": o.fecha_actualizacion,
            "servicio_origen": o.servicio_origen,
        }
        for o in ordenes
    ]
