"""Tests for the deterministic parts the agent's safety depends on."""

from pathlib import Path

import pytest

from niyam.confidence import decide, score
from niyam.models import ChangeSet
from niyam.pdftext import find_quote, read_pdf, skeleton
from niyam.sources.watcher import parse_listing

FIX = Path(__file__).parent / "fixtures"


@pytest.fixture(scope="module")
def amendment():
    return read_pdf(FIX / "amendment.pdf")


def test_skeleton_survives_broken_font_encoding():
    # The text layer prints "महहला" for "महिला" and "पूणण" for "पूर्ण".
    assert skeleton("महिला") == skeleton("महहला")
    assert skeleton("पूर्ण") == skeleton("पूणण")
    assert skeleton("२१") == "21"


def test_real_quote_is_found_on_the_cited_page(amendment):
    m = find_quote(amendment.pages, "किमान वयाची 21 वर्षे पूर्ण व कमाल वयाची 65 वर्ष पूर्ण होईपर्यंत", 2)
    assert m.found and m.page == 2


def test_quote_with_a_wrong_number_is_rejected(amendment):
    # Fuzzy matching alone accepted 75 for 65 (score 0.88); numbers must match exactly.
    m = find_quote(amendment.pages, "किमान वयाची 21 वर्षे पूर्ण व कमाल वयाची 75 वर्ष पूर्ण होईपर्यंत", 2)
    assert not m.found


def test_invented_quote_is_rejected(amendment):
    assert not find_quote(amendment.pages, "Age limit is raised to seventy five years for all women", 2).found


def _cs(change_type="parameter_update", affects="widens", confidence=0.95, ambiguities=()):
    return ChangeSet.model_validate({
        "document_code": "1", "document_date": "2025-01-01", "title_en": "t", "title_original": "t", "supersedes": [],
        "changes": [{"change_id": "c1", "scheme_id": "mh.x", "change_type": change_type, "target": "p", "summary": "s",
                     "old_value": "1", "new_value": "2", "boundary": "inclusive", "effective_from": "2025-01-01",
                     "affects": affects, "confidence": confidence,
                     "citation": {"page": 1, "clause": "1", "quote_original": "q", "quote_english": "q"}}],
        "ambiguities": list(ambiguities), "skipped": [],
    })


AGREE = {"agreement_rate": 1.0, "cases_disagree": 0}


def test_simple_widening_parameter_change_can_merge_alone():
    cs = _cs()
    conf = score(cs, AGREE, True, 0)
    assert conf >= 0.9
    assert decide(cs, conf, AGREE, 0, False)[0] == "auto_merge"


def test_change_that_removes_people_always_goes_to_a_human():
    cs = _cs(affects="narrows")
    assert decide(cs, score(cs, AGREE, True, 0), AGREE, 0, False)[0] != "auto_merge"


def test_uploaded_documents_are_never_merged():
    cs = _cs()
    assert decide(cs, score(cs, AGREE, True, 0), AGREE, 0, True)[0] != "auto_merge"


def test_unresolved_disagreement_needs_a_human():
    cs = _cs()
    assert decide(cs, score(cs, AGREE, True, 0), AGREE, 1, False)[0] == "needs_human"


def test_structural_change_needs_review():
    cs = _cs(change_type="condition_removed")
    assert decide(cs, score(cs, AGREE, True, 0), AGREE, 0, False)[0] == "human_review"


def test_watcher_parses_the_public_listing():
    html = ('<table><tr><th>x</th></tr><tr><td>1</td><td>महिला व बाल विकास विभाग</td><td>Title</td>'
            '<td>202610091237115604</td><td>09-10-2026</td><td>169</td>'
            '<td><a href="../Site/Upload/Government%20Resolutions/Marathi/202610091237115604.pdf">pdf</a></td></tr></table>')
    items = parse_listing(html)
    assert len(items) == 1 and items[0].code == "202610091237115604" and items[0].date == "2026-10-09"
    assert items[0].url.endswith("202610091237115604.pdf")
