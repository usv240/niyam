"""API behaviour that protects people: sources on every answer, no personal identifiers."""

from fastapi.testclient import TestClient

from niyam.api import app

client = TestClient(app)


def test_eligibility_returns_reasons_with_sources():
    r = client.post("/api/v1/eligibility", json={"age": 34, "gender": "female", "annual_family_income": 200000, "date": "2024-06-30"})
    assert r.status_code == 200
    res = r.json()["results"][0]
    assert res["eligible"] is True and res["monthly_benefit_inr"] == 1500
    assert all(x["source"]["quote"] and x["source"]["document"]["url"] for x in res["reasons"])


def test_personal_identifiers_are_rejected():
    r = client.post("/api/v1/eligibility", json={"age": 34, "gender": "1234 5678 9012"})
    assert r.status_code == 400 and r.json()["error"]["code"] == "personal_data_rejected"


def test_rules_on_a_past_date():
    r = client.get("/api/v1/schemes/mh.ladki_bahin/rules", params={"at": "2024-06-30"})
    assert r.status_code == 200
    assert r.json()["parameters"]["age_max"]["value"] == 60


def test_unknown_key_is_refused():
    r = client.get("/api/v1/schemes", headers={"Authorization": "Bearer niyam_live_nope"})
    assert r.status_code == 401
