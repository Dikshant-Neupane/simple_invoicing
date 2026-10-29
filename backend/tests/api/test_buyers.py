"""Tests for /api/buyers/ routes (issue #481).

Covers create (whitespace stripping and IFSC upper-casing), duplicate GST
in the same company (400), the same GST in a second company succeeding,
the admin/manager only create gate (staff gets 403), list returning only
the active company's buyers, invalid GSTIN rejection by the schema, create
without GST, and unauthenticated access, using the shared TestClient plus
db_session fixtures from tests/conftest.py.

Note on the mount: backend/src/api/routes/buyers.py was not mounted in
app_main.py, so these tests also cover the minimal mount at /api/buyers.
Note on status: the buyers create route sets no explicit status code, so
a successful create returns 200, not 201.
"""

from contextlib import contextmanager

from fastapi.testclient import TestClient

from app_main import app
from src.api.deps import get_current_user
from src.models.company import CompanyProfile
from src.models.user import User, UserRole

GST_A = "27ABCDE1234F1Z0"
GST_B = "29ABCDE1234F1ZW"


def _seed_company(db_session, company_id, name):
    company = CompanyProfile(
        id=company_id,
        name=name,
        address="",
        gst="",
        phone_number="",
        currency_code="USD",
        email="",
        website="",
        bank_name="",
        branch_name="",
        account_name="",
        account_number="",
        ifsc_code="",
    )
    db_session.add(company)
    db_session.commit()
    return company


@contextmanager
def as_role(role):
    """Swap the conftest admin override for another role, then restore it."""
    previous = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = lambda: User(
        id=1, email="test@example.com", role=role
    )
    try:
        yield
    finally:
        if previous is None:
            app.dependency_overrides.pop(get_current_user, None)
        else:
            app.dependency_overrides[get_current_user] = previous


def _create_payload(name="Acme Traders", gst=GST_A):
    return {
        "name": name,
        "address": "1 Market Street",
        "gst": gst,
        "phone_number": "9876543210",
        "ifsc_code": "hdfc0001234",
    }


def _create_buyer(client, payload=None, headers=None):
    response = client.post(
        "/api/buyers/", json=payload or _create_payload(), headers=headers
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_create_strips_whitespace_and_uppercases_ifsc(client, db_session):
    _seed_company(db_session, 1, "Company A")

    payload = _create_payload()
    payload["name"] = "  Acme Traders  "
    payload["address"] = "  1 Market Street  "
    payload["phone_number"] = "  9876543210  "
    payload["ifsc_code"] = "  hdfc0001234  "

    created = _create_buyer(client, payload)
    assert created["name"] == "Acme Traders"
    assert created["address"] == "1 Market Street"
    assert created["phone_number"] == "9876543210"
    assert created["ifsc_code"] == "HDFC0001234"
    assert created["gst"] == GST_A


def test_duplicate_gst_in_the_same_company_returns_400(client, db_session):
    _seed_company(db_session, 1, "Company A")
    _create_buyer(client)

    response = client.post("/api/buyers/", json=_create_payload(name="Other Name"))
    assert response.status_code == 400, response.text
    assert response.json()["detail"] == "Buyer with this GST already exists"


def test_same_gst_in_another_company_succeeds(client, db_session):
    _seed_company(db_session, 1, "Company A")
    _seed_company(db_session, 2, "Company B")

    first = _create_buyer(client)
    second = _create_buyer(
        client,
        _create_payload(name="Acme Branch"),
        headers={"X-Company-Id": "2"},
    )
    assert second["id"] != first["id"]
    assert second["gst"] == GST_A


def test_manager_can_create_but_staff_gets_403(client, db_session):
    _seed_company(db_session, 1, "Company A")

    with as_role(UserRole.manager):
        created = _create_buyer(client, _create_payload(gst=GST_B))
        assert created["gst"] == GST_B

    with as_role(UserRole.staff):
        response = client.post("/api/buyers/", json=_create_payload())
        assert response.status_code == 403, response.text


def test_list_returns_only_the_active_company_buyers(client, db_session):
    _seed_company(db_session, 1, "Company A")
    _seed_company(db_session, 2, "Company B")

    _create_buyer(client, _create_payload(name="Zebra Traders", gst=GST_A))
    _create_buyer(client, _create_payload(name="Acme Traders", gst=GST_B))
    _create_buyer(
        client,
        _create_payload(name="Other Company Buyer", gst=None),
        headers={"X-Company-Id": "2"},
    )

    response = client.get("/api/buyers/")
    assert response.status_code == 200, response.text
    assert [item["name"] for item in response.json()] == [
        "Acme Traders",
        "Zebra Traders",
    ]


def test_invalid_gstin_is_rejected_by_the_schema(client, db_session):
    _seed_company(db_session, 1, "Company A")

    bad_format = client.post(
        "/api/buyers/", json=_create_payload(gst="not-a-gstin")
    )
    assert bad_format.status_code == 422, bad_format.text

    bad_checksum = client.post(
        "/api/buyers/", json=_create_payload(gst="27ABCDE1234F1Z5")
    )
    assert bad_checksum.status_code == 422, bad_checksum.text


def test_create_without_gst_succeeds(client, db_session):
    _seed_company(db_session, 1, "Company A")

    created = _create_buyer(client, _create_payload(gst=None))
    assert created["gst"] == ""


def test_unauthenticated_request_gets_401(db_session):
    _seed_company(db_session, 1, "Company A")
    saved_override = app.dependency_overrides.pop(get_current_user, None)
    try:
        response = TestClient(app).get("/api/buyers/")
        assert response.status_code == 401
    finally:
        if saved_override is not None:
            app.dependency_overrides[get_current_user] = saved_override
