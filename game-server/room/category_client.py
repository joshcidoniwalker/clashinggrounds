import httpx

from config import Config


class CategoriesUnavailableError(Exception):
    pass


def fetch_active_categories() -> dict[str, str]:
    """Active room categories as slug → name, read from the crud-server, which
    owns the list. Deliberately uncached so a category added or retired by a
    migration is accepted or rejected immediately."""
    try:
        response = httpx.get(
            f"{Config.CRUD_SERVER_URL}/room-categories",
            timeout=Config.CRUD_SERVER_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise CategoriesUnavailableError from exc

    return {category["slug"]: category["name"] for category in response.json()}
