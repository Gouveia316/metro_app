from typing import Any, Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

try:
    from .metro_client import (
        MetroApiAuthError,
        MetroApiConfigError,
        MetroApiRequestError,
        MetroOfficialApiClient,
    )
except ImportError:
    from metro_client import (
        MetroApiAuthError,
        MetroApiConfigError,
        MetroApiRequestError,
        MetroOfficialApiClient,
    )


app = FastAPI(
    title="Lisbon Metro MVP API",
    description="Lisbon metro mobile app backend with mocked MVP data and official Metro Lisboa API passthroughs.",
    version="0.1.0",
)

metro_official_client = MetroOfficialApiClient()


LineStatus = Literal["good_service", "minor_delays", "suspended"]
AlertSeverity = Literal["info", "warning", "critical"]


class Line(BaseModel):
    id: str
    name: str
    color: str
    status: LineStatus
    status_label: str
    note: str


class Station(BaseModel):
    id: str
    name: str
    lines: list[str]


class Arrival(BaseModel):
    id: str
    destination: str
    line_id: str
    minutes: int
    platform: str


class Alert(BaseModel):
    id: str
    severity: AlertSeverity
    title: str
    message: str
    affected_lines: list[str]


LINES: list[Line] = [
    Line(
        id="blue",
        name="Blue Line",
        color="#2563EB",
        status="good_service",
        status_label="Good service",
        note="Trains are running normally.",
    ),
    Line(
        id="yellow",
        name="Yellow Line",
        color="#EAB308",
        status="minor_delays",
        status_label="Minor delays",
        note="Slight delays near Campo Grande.",
    ),
    Line(
        id="green",
        name="Green Line",
        color="#16A34A",
        status="good_service",
        status_label="Good service",
        note="Trains are running normally.",
    ),
    Line(
        id="red",
        name="Red Line",
        color="#DC2626",
        status="good_service",
        status_label="Good service",
        note="Trains are running normally.",
    ),
]

STATIONS: list[Station] = [
    Station(id="baixa-chiado", name="Baixa-Chiado", lines=["blue", "green"]),
    Station(id="campo-grande", name="Campo Grande", lines=["green", "yellow"]),
    Station(id="marques-pombal", name="Marques de Pombal", lines=["blue", "yellow"]),
    Station(id="oriente", name="Oriente", lines=["red"]),
    Station(id="saldanha", name="Saldanha", lines=["red", "yellow"]),
    Station(id="sao-sebastiao", name="Sao Sebastiao", lines=["blue", "red"]),
]

ARRIVALS_BY_STATION: dict[str, list[Arrival]] = {
    "baixa-chiado": [
        Arrival(id="arr-1", destination="Reboleira", line_id="blue", minutes=3, platform="1"),
        Arrival(id="arr-2", destination="Cais do Sodre", line_id="green", minutes=6, platform="2"),
    ],
    "campo-grande": [
        Arrival(id="arr-3", destination="Telheiras", line_id="green", minutes=2, platform="1"),
        Arrival(id="arr-4", destination="Odivelas", line_id="yellow", minutes=8, platform="3"),
    ],
    "marques-pombal": [
        Arrival(id="arr-5", destination="Santa Apolonia", line_id="blue", minutes=4, platform="2"),
        Arrival(id="arr-6", destination="Rato", line_id="yellow", minutes=7, platform="1"),
    ],
    "oriente": [
        Arrival(id="arr-7", destination="Aeroporto", line_id="red", minutes=5, platform="1"),
        Arrival(id="arr-8", destination="Sao Sebastiao", line_id="red", minutes=11, platform="2"),
    ],
    "saldanha": [
        Arrival(id="arr-9", destination="Aeroporto", line_id="red", minutes=1, platform="1"),
        Arrival(id="arr-10", destination="Odivelas", line_id="yellow", minutes=9, platform="2"),
    ],
    "sao-sebastiao": [
        Arrival(id="arr-11", destination="Aeroporto", line_id="red", minutes=4, platform="1"),
        Arrival(id="arr-12", destination="Reboleira", line_id="blue", minutes=10, platform="2"),
    ],
}

ALERTS: list[Alert] = [
    Alert(
        id="alert-1",
        severity="warning",
        title="Minor delays on Yellow Line",
        message="Mocked alert: allow extra travel time near Campo Grande.",
        affected_lines=["yellow"],
    ),
    Alert(
        id="alert-2",
        severity="info",
        title="Planned maintenance reminder",
        message="Mocked notice: maintenance windows may affect late evening service.",
        affected_lines=["blue", "green"],
    ),
]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/lines", response_model=list[Line])
def get_lines() -> list[Line]:
    # TODO: Replace mocked data with official/approved line status integration.
    return LINES


@app.get("/stations", response_model=list[Station])
def get_stations() -> list[Station]:
    # TODO: Replace mocked data with official/approved station metadata integration.
    return STATIONS


@app.get("/stations/{station_id}/arrivals", response_model=list[Arrival])
def get_station_arrivals(station_id: str) -> list[Arrival]:
    # TODO: Replace mocked data with official/approved next-arrival integration.
    if station_id not in ARRIVALS_BY_STATION:
        raise HTTPException(status_code=404, detail="Station not found")

    return ARRIVALS_BY_STATION[station_id]


@app.get("/alerts", response_model=list[Alert])
def get_alerts() -> list[Alert]:
    # TODO: Replace mocked data with official/approved alerts/news integration.
    return ALERTS


def get_official_metro_response(endpoint_name: str) -> dict[str, Any]:
    try:
        if endpoint_name == "lines":
            return metro_official_client.get_lines()
        if endpoint_name == "stations":
            return metro_official_client.get_stations()
        if endpoint_name == "wait-times":
            return metro_official_client.get_wait_times()
    except MetroApiConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except MetroApiAuthError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except MetroApiRequestError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    raise HTTPException(status_code=404, detail="Official Metro endpoint not found")


@app.get("/metro/official/lines")
def get_official_lines() -> dict[str, Any]:
    return get_official_metro_response("lines")


@app.get("/metro/official/stations")
def get_official_stations() -> dict[str, Any]:
    return get_official_metro_response("stations")


@app.get("/metro/official/wait-times")
def get_official_wait_times() -> dict[str, Any]:
    return get_official_metro_response("wait-times")
