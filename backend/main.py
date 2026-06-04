import unicodedata
import logging
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
logger = logging.getLogger(__name__)


LineStatus = Literal["good_service", "minor_delays", "suspended"]
AlertSeverity = Literal["info", "warning", "critical"]
NormalizedLineStatus = Literal["normal", "interrupted", "closed", "disrupted", "unknown"]
StatusReason = Literal["strike", "closed"]
ArrivalState = Literal[
    "arrivals_available",
    "service_closed",
    "no_arrivals_available",
    "no_live_data",
]
ArrivalEmptyReason = Literal[
    "strike",
    "service_closed",
    "all_arrivals_unavailable",
    "station_not_found_in_wait_times",
]


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


class NormalizedLineRaw(BaseModel):
    shortStatus: str | None
    message: str | None
    messageType: str | None


class NormalizedLine(BaseModel):
    id: str
    namePt: str
    nameEn: str
    color: str
    status: NormalizedLineStatus
    statusReason: StatusReason | None
    message: str
    raw: NormalizedLineRaw


class NormalizedLinesResponse(BaseModel):
    source: str
    updatedAt: str
    lines: list[NormalizedLine]


class NormalizedStationRaw(BaseModel):
    stop_url: str | None
    linha: str | None


class NormalizedStation(BaseModel):
    id: str
    name: str
    latitude: float | None
    longitude: float | None
    lineIds: list[str]
    zone: str | None
    raw: NormalizedStationRaw


class NormalizedStationsResponse(BaseModel):
    source: str
    updatedAt: str
    stations: list[NormalizedStation]


class NormalizedArrival(BaseModel):
    trainId: str
    minutes: int


class NormalizedPlatformArrivals(BaseModel):
    id: str
    destinationCode: str | None
    destinationName: str | None
    outOfService: bool
    rawTimestamp: str | None
    arrivals: list[NormalizedArrival]


class NormalizedStationArrivalsResponse(BaseModel):
    source: str
    updatedAt: str
    stationId: str
    status: str | None = None
    message: str | None = None
    state: ArrivalState
    emptyReason: ArrivalEmptyReason | None
    arrivals: list[NormalizedArrival] = []
    platforms: list[NormalizedPlatformArrivals]


class NormalizedWaitTime(BaseModel):
    stationId: str
    platformId: str
    destinationCode: str | None
    destinationName: str | None
    outOfService: bool
    rawTimestamp: str | None
    arrivals: list[NormalizedArrival]


class NormalizedWaitTimesResponse(BaseModel):
    source: str
    updatedAt: str
    status: str | None = None
    message: str | None = None
    waitTimes: list[NormalizedWaitTime]


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


LINE_METADATA = {
    "azul": {
        "id": "blue",
        "namePt": "Linha Azul",
        "nameEn": "Blue Line",
        "color": "#0072CE",
        "short_key": "azul_curta",
        "message_key": "azul",
        "message_type_key": "tipo_msg_az",
    },
    "amarela": {
        "id": "yellow",
        "namePt": "Linha Amarela",
        "nameEn": "Yellow Line",
        "color": "#FFD200",
        "short_key": "amarela_curta",
        "message_key": "amarela",
        "message_type_key": "tipo_msg_am",
    },
    "verde": {
        "id": "green",
        "namePt": "Linha Verde",
        "nameEn": "Green Line",
        "color": "#00843D",
        "short_key": "verde_curta",
        "message_key": "verde",
        "message_type_key": "tipo_msg_vd",
    },
    "vermelha": {
        "id": "red",
        "namePt": "Linha Vermelha",
        "nameEn": "Red Line",
        "color": "#E30613",
        "short_key": "vermelha_curta",
        "message_key": "vermelha",
        "message_type_key": "tipo_msg_vm",
    },
}

OFFICIAL_LINE_NAME_TO_ID = {
    "azul": "blue",
    "amarela": "yellow",
    "verde": "green",
    "vermelha": "red",
}


def normalize_text(value: Any) -> str:
    text = "" if value is None else str(value)
    normalized = unicodedata.normalize("NFD", text.strip().lower())
    without_accents = "".join(char for char in normalized if unicodedata.category(char) != "Mn")
    return without_accents.replace("ã§", "c").replace("a§", "c")


def trim_or_none(value: Any) -> str | None:
    if value is None:
        return None

    trimmed = str(value).strip()
    return trimmed or None


def parse_float(value: Any) -> float | None:
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return None


def parse_arrival_minutes(value: Any) -> int | None:
    arrival_text = "" if value is None else str(value).strip()

    if not arrival_text or arrival_text == "--" or not arrival_text.isdigit():
        return None

    return int(arrival_text)


def parse_station_line_ids(value: Any) -> list[str]:
    line_text = "" if value is None else str(value)

    return [
        line_id
        for line_id in (
            OFFICIAL_LINE_NAME_TO_ID.get(normalize_text(line_name))
            for line_name in line_text.strip("[]").split(",")
        )
        if line_id
    ]


def official_response_data(response: dict[str, Any]) -> Any:
    data = response.get("data")

    if not isinstance(data, dict):
        raise HTTPException(status_code=502, detail="Official Metro API response was not an object")

    if str(data.get("codigo")) != "200":
        raise HTTPException(
            status_code=502,
            detail=f"Official Metro API returned code {data.get('codigo')}",
        )

    return data.get("resposta")


def is_circulation_closed_response(response: dict[str, Any]) -> bool:
    payload = response.get("data")

    if isinstance(payload, dict) and isinstance(payload.get("data"), dict):
        payload = payload["data"]

    if not isinstance(payload, dict):
        return False

    resposta = normalize_text(payload.get("resposta"))
    return "circulacao encerrada" in resposta


def get_circulation_closed_message(response: dict[str, Any]) -> str:
    payload = response.get("data")

    if isinstance(payload, dict) and isinstance(payload.get("data"), dict):
        payload = payload["data"]

    if isinstance(payload, dict):
        return trim_or_none(payload.get("resposta")) or "Circulação encerrada"

    return "Circulação encerrada"


def normalize_line_status(short_status: Any, message: Any) -> NormalizedLineStatus:
    normalized_status = normalize_text(short_status)
    normalized_message = normalize_text(message)
    combined_text = f"{normalized_status} {normalized_message}".strip()

    if "greve" in combined_text:
        return "interrupted"

    if not normalized_status:
        return "unknown"

    if normalized_status == "interrompida":
        return "interrupted"

    if (
        "servico encerrado" in normalized_status
        or "encerrado" in normalized_status
    ):
        return "closed"

    if normalized_status in {"normal", "ok"}:
        return "normal"

    if (
        "condicionada" in normalized_status
        or "perturbada" in normalized_status
        or "atrasos" in normalized_status
    ):
        return "disrupted"

    return "disrupted"


def get_line_status_reason(
    status: NormalizedLineStatus,
    short_status: Any,
    message: Any,
) -> StatusReason | None:
    combined_text = f"{normalize_text(short_status)} {normalize_text(message)}"

    if "greve" in combined_text:
        return "strike"

    if status == "closed":
        return "closed"

    return None


def normalize_lines_response(response: dict[str, Any]) -> NormalizedLinesResponse:
    if is_circulation_closed_response(response):
        message = get_circulation_closed_message(response)
        logger.info("Official Metro API reports operational closure: %s", message)

        return NormalizedLinesResponse(
            source=response["source"],
            updatedAt=response["updatedAt"],
            lines=[
                NormalizedLine(
                    id=metadata["id"],
                    namePt=metadata["namePt"],
                    nameEn=metadata["nameEn"],
                    color=metadata["color"],
                    status="closed",
                    statusReason="closed",
                    message=message,
                    raw=NormalizedLineRaw(
                        shortStatus="closed",
                        message=message,
                        messageType=None,
                    ),
                )
                for metadata in LINE_METADATA.values()
            ],
        )

    official_lines = official_response_data(response)

    if not isinstance(official_lines, dict):
        raise HTTPException(status_code=502, detail="Official Metro line status payload was not an object")

    lines_response: list[NormalizedLine] = []

    for metadata in LINE_METADATA.values():
        short_status = trim_or_none(official_lines.get(metadata["short_key"]))
        message = trim_or_none(official_lines.get(metadata["message_key"])) or ""
        message_type = trim_or_none(official_lines.get(metadata["message_type_key"]))
        status = normalize_line_status(short_status, message)

        lines_response.append(
            NormalizedLine(
                id=metadata["id"],
                namePt=metadata["namePt"],
                nameEn=metadata["nameEn"],
                color=metadata["color"],
                status=status,
                statusReason=get_line_status_reason(status, short_status, message),
                message=message,
                raw=NormalizedLineRaw(
                    shortStatus=short_status,
                    message=trim_or_none(official_lines.get(metadata["message_key"])),
                    messageType=message_type,
                ),
            )
        )

    return NormalizedLinesResponse(
        source=response["source"],
        updatedAt=response["updatedAt"],
        lines=lines_response,
    )


def normalize_stations_response(response: dict[str, Any]) -> NormalizedStationsResponse:
    official_stations = official_response_data(response)

    if not isinstance(official_stations, list):
        raise HTTPException(status_code=502, detail="Official Metro stations payload was not a list")

    stations_response: list[NormalizedStation] = []

    for station in official_stations:
        if not isinstance(station, dict):
            continue

        station_id = trim_or_none(station.get("stop_id"))
        station_name = trim_or_none(station.get("stop_name"))

        if not station_id or not station_name:
            continue

        stations_response.append(
            NormalizedStation(
                id=station_id,
                name=station_name,
                latitude=parse_float(station.get("stop_lat")),
                longitude=parse_float(station.get("stop_lon")),
                lineIds=parse_station_line_ids(station.get("linha")),
                zone=trim_or_none(station.get("zone_id")),
                raw=NormalizedStationRaw(
                    stop_url=trim_or_none(station.get("stop_url")),
                    linha=trim_or_none(station.get("linha")),
                ),
            )
        )

    return NormalizedStationsResponse(
        source=response["source"],
        updatedAt=response["updatedAt"],
        stations=stations_response,
    )


def normalize_wait_time_row(row: dict[str, Any]) -> NormalizedWaitTime | None:
    station_id = trim_or_none(row.get("stop_id"))
    platform_id = trim_or_none(row.get("cais"))

    if not station_id or not platform_id:
        return None

    arrivals: list[NormalizedArrival] = []

    for train_key, time_key in (
        ("comboio", "tempoChegada1"),
        ("comboio2", "tempoChegada2"),
        ("comboio3", "tempoChegada3"),
    ):
        minutes = parse_arrival_minutes(row.get(time_key))

        if minutes is None:
            continue

        arrivals.append(
            NormalizedArrival(
                trainId=trim_or_none(row.get(train_key)) or "-",
                minutes=minutes,
            )
        )

    return NormalizedWaitTime(
        stationId=station_id,
        platformId=platform_id,
        destinationCode=trim_or_none(row.get("destino")),
        destinationName=None,
        outOfService=trim_or_none(row.get("sairServico")) == "1",
        rawTimestamp=trim_or_none(row.get("hora")),
        arrivals=arrivals,
    )


def normalize_wait_times_response(response: dict[str, Any]) -> NormalizedWaitTimesResponse:
    if is_circulation_closed_response(response):
        message = get_circulation_closed_message(response)
        logger.info("Official Metro API reports operational closure for wait-times: %s", message)

        return NormalizedWaitTimesResponse(
            source=response["source"],
            updatedAt=response["updatedAt"],
            status="closed",
            message=message,
            waitTimes=[],
        )

    official_wait_times = official_response_data(response)

    if not isinstance(official_wait_times, list):
        raise HTTPException(status_code=502, detail="Official Metro wait-times payload was not a list")

    wait_times = [
        normalized_wait_time
        for normalized_wait_time in (
            normalize_wait_time_row(row)
            for row in official_wait_times
            if isinstance(row, dict)
        )
        if normalized_wait_time
    ]

    return NormalizedWaitTimesResponse(
        source=response["source"],
        updatedAt=response["updatedAt"],
        status=None,
        message=None,
        waitTimes=wait_times,
    )


def group_station_platforms(wait_times: list[NormalizedWaitTime]) -> list[NormalizedPlatformArrivals]:
    platforms_by_id: dict[str, NormalizedPlatformArrivals] = {}

    for wait_time in wait_times:
        platform = platforms_by_id.get(wait_time.platformId)

        if platform is None:
            platform = NormalizedPlatformArrivals(
                id=wait_time.platformId,
                destinationCode=wait_time.destinationCode,
                destinationName=wait_time.destinationName,
                outOfService=wait_time.outOfService,
                rawTimestamp=wait_time.rawTimestamp,
                arrivals=[],
            )
            platforms_by_id[wait_time.platformId] = platform

        platform.arrivals = (platform.arrivals + wait_time.arrivals)[:3]

    return list(platforms_by_id.values())


def all_service_closed_due_to_strike(lines_response: NormalizedLinesResponse) -> bool:
    return bool(lines_response.lines) and all(
        line.status == "closed" and line.statusReason == "strike"
        for line in lines_response.lines
    )


def all_service_closed(lines_response: NormalizedLinesResponse) -> bool:
    return bool(lines_response.lines) and all(
        line.status == "closed"
        for line in lines_response.lines
    )


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
        logger.exception("Metro API configuration error while fetching %s", endpoint_name)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except MetroApiAuthError as exc:
        logger.exception("Metro API authentication error while fetching %s", endpoint_name)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except MetroApiRequestError as exc:
        logger.exception("Metro API request error while fetching %s", endpoint_name)
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


@app.get("/metro/lines/status", response_model=NormalizedLinesResponse)
def get_normalized_line_status() -> NormalizedLinesResponse:
    return normalize_lines_response(get_official_metro_response("lines"))


@app.get("/metro/stations", response_model=NormalizedStationsResponse)
def get_normalized_stations() -> NormalizedStationsResponse:
    return normalize_stations_response(get_official_metro_response("stations"))


@app.get("/metro/wait-times", response_model=NormalizedWaitTimesResponse)
def get_normalized_wait_times() -> NormalizedWaitTimesResponse:
    return normalize_wait_times_response(get_official_metro_response("wait-times"))


@app.get("/metro/stations/{station_id}/arrivals", response_model=NormalizedStationArrivalsResponse)
def get_normalized_station_arrivals(station_id: str) -> NormalizedStationArrivalsResponse:
    wait_times_response = normalize_wait_times_response(get_official_metro_response("wait-times"))

    if wait_times_response.status == "closed":
        return NormalizedStationArrivalsResponse(
            source=wait_times_response.source,
            updatedAt=wait_times_response.updatedAt,
            stationId=station_id,
            status="closed",
            message=wait_times_response.message or "Circulação encerrada",
            state="service_closed",
            emptyReason="service_closed",
            arrivals=[],
            platforms=[],
        )

    lines_response = normalize_lines_response(get_official_metro_response("lines"))
    station_wait_times = [
        wait_time for wait_time in wait_times_response.waitTimes if wait_time.stationId == station_id
    ]
    platforms = group_station_platforms(station_wait_times)

    if all_service_closed(lines_response):
        state: ArrivalState = "service_closed"
        empty_reason: ArrivalEmptyReason | None = "service_closed"
    elif not station_wait_times:
        state = "no_live_data"
        empty_reason = "station_not_found_in_wait_times"
    elif any(platform.arrivals for platform in platforms):
        state = "arrivals_available"
        empty_reason = None
    else:
        state = "no_arrivals_available"
        empty_reason = "all_arrivals_unavailable"

    return NormalizedStationArrivalsResponse(
        source=wait_times_response.source,
        updatedAt=wait_times_response.updatedAt,
        stationId=station_id,
        status="closed" if state == "service_closed" else None,
        message=lines_response.lines[0].message if state == "service_closed" and lines_response.lines else None,
        state=state,
        emptyReason=empty_reason,
        arrivals=[],
        platforms=platforms,
    )
