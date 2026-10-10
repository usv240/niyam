"""Webhooks: signatures verify, internal addresses are refused."""

import hashlib
import hmac

import pytest

from niyam import webhooks


def test_signature_matches_hmac_of_raw_body():
    body = b'{"event":"rule.changed"}'
    expected = "sha256=" + hmac.new(b"whsec_x", body, hashlib.sha256).hexdigest()
    assert webhooks.sign("whsec_x", body) == expected


@pytest.mark.parametrize("url", ["http://example.com/hook", "https://127.0.0.1/hook", "https://localhost/hook",
                                 "https://169.254.169.254/latest/meta-data", "https://10.0.0.5/x"])
def test_unsafe_urls_are_refused(url):
    with pytest.raises(webhooks.WebhookError):
        webhooks.check_url(url)
