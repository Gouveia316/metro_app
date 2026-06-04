import base64
import json
import os
import ssl
import time
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


TOKEN_REFRESH_BUFFER_SECONDS = 60
REQUEST_TIMEOUT_SECONDS = 15


def _normalize_text(value: Any) -> str:
    text = "" if value is None else str(value)
    normalized = unicodedata.normalize("NFD", text.strip().lower())
    return "".join(char for char in normalized if unicodedata.category(char) != "Mn")


def _is_circulation_closed_payload(payload: Any) -> bool:
    if isinstance(payload, dict) and isinstance(payload.get("data"), dict):
        payload = payload["data"]

    if not isinstance(payload, dict):
        return False

    return "circulacao encerrada" in _normalize_text(payload.get("resposta"))


class MetroApiError(Exception):
    """Base exception for official Metro Lisboa API integration errors."""


class MetroApiConfigError(MetroApiError):
    """Raised when required Metro API environment variables are missing."""


class MetroApiAuthError(MetroApiError):
    """Raised when OAuth token generation fails."""


class MetroApiRequestError(MetroApiError):
    """Raised when an official Metro API request fails."""


@dataclass
class CachedAccessToken:
    value: str
    expires_at: float


class MetroOfficialApiClient:
    def __init__(self) -> None:
        self._cached_token: CachedAccessToken | None = None
        self._env_loaded = False

    def get_lines(self) -> dict[str, Any]:
        return self._wrap_response(self._get_json("/estadoLinha/todos"))

    def get_stations(self) -> dict[str, Any]:
        return self._wrap_response(self._get_json("/infoEstacao/todos"))

    def get_wait_times(self) -> dict[str, Any]:
        return self._wrap_response(self._get_json("/tempoEspera/Estacao/todos"))

    def _wrap_response(self, data: Any) -> dict[str, Any]:
        return {
            "source": "metrolisboa_official_api",
            "updatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "data": data,
        }

    def _get_json(self, path: str) -> Any:
        access_token = self._get_access_token()
        url = f"{self._get_required_env('METRO_API_BASE_URL').rstrip('/')}/{path.lstrip('/')}"
        request = Request(
            url,
            headers={
                "Accept": "application/json",
                "Authorization": f"Bearer {access_token}",
            },
            method="GET",
        )

        try:
            with urlopen(
                request,
                timeout=REQUEST_TIMEOUT_SECONDS,
                context=self._get_ssl_context(),
            ) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            try:
                payload = json.loads(detail)
            except json.JSONDecodeError:
                payload = None

            if _is_circulation_closed_payload(payload):
                return payload

            raise MetroApiRequestError(
                f"Metro API request failed with HTTP {exc.code}: {detail}"
            ) from exc
        except URLError as exc:
            raise MetroApiRequestError(f"Metro API request failed: {exc.reason}") from exc
        except json.JSONDecodeError as exc:
            raise MetroApiRequestError("Metro API returned invalid JSON.") from exc

    def _get_access_token(self) -> str:
        if self._cached_token and time.time() < self._cached_token.expires_at:
            return self._cached_token.value

        self._cached_token = self._fetch_access_token()
        return self._cached_token.value

    def _fetch_access_token(self) -> CachedAccessToken:
        consumer_key = self._get_required_env("METRO_API_CONSUMER_KEY")
        consumer_secret = self._get_required_env("METRO_API_CONSUMER_SECRET")
        token_url = self._get_required_env("METRO_API_TOKEN_URL")

        credentials = f"{consumer_key}:{consumer_secret}".encode("utf-8")
        encoded_credentials = base64.b64encode(credentials).decode("ascii")
        body = urlencode({"grant_type": "client_credentials"}).encode("utf-8")
        request = Request(
            token_url,
            data=body,
            headers={
                "Accept": "application/json",
                "Authorization": f"Basic {encoded_credentials}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            method="POST",
        )

        try:
            with urlopen(
                request,
                timeout=REQUEST_TIMEOUT_SECONDS,
                context=self._get_ssl_context(),
            ) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise MetroApiAuthError(
                f"Metro API token request failed with HTTP {exc.code}: {detail}"
            ) from exc
        except URLError as exc:
            raise MetroApiAuthError(f"Metro API token request failed: {exc.reason}") from exc
        except json.JSONDecodeError as exc:
            raise MetroApiAuthError("Metro API token endpoint returned invalid JSON.") from exc

        access_token = payload.get("access_token")
        expires_in = payload.get("expires_in", 3600)

        if not access_token:
            raise MetroApiAuthError("Metro API token response did not include an access_token.")

        try:
            expires_in_seconds = int(expires_in)
        except (TypeError, ValueError) as exc:
            raise MetroApiAuthError("Metro API token response included an invalid expires_in value.") from exc

        expires_at = time.time() + max(expires_in_seconds - TOKEN_REFRESH_BUFFER_SECONDS, 0)
        return CachedAccessToken(value=access_token, expires_at=expires_at)

    def _get_required_env(self, name: str) -> str:
        self._load_env_file_once()
        value = os.getenv(name)

        if not value:
            raise MetroApiConfigError(f"Missing required environment variable: {name}")

        return value

    def _get_ssl_context(self) -> ssl.SSLContext | None:
        if self._get_verify_ssl():
            return None

        return ssl._create_unverified_context()

    def _get_verify_ssl(self) -> bool:
        self._load_env_file_once()
        value = os.getenv("METRO_API_VERIFY_SSL", "true").strip().lower()

        if value in {"true", "1", "yes", "on"}:
            return True

        if value in {"false", "0", "no", "off"}:
            return False

        raise MetroApiConfigError(
            "METRO_API_VERIFY_SSL must be true or false when set."
        )

    def _load_env_file_once(self) -> None:
        if self._env_loaded:
            return

        self._env_loaded = True
        env_path = Path(__file__).with_name(".env")

        if not env_path.exists():
            return

        for line in env_path.read_text(encoding="utf-8").splitlines():
            stripped_line = line.strip()

            if not stripped_line or stripped_line.startswith("#") or "=" not in stripped_line:
                continue

            key, value = stripped_line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
