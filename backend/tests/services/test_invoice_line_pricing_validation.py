"""Schema validation for invoice line pricing (issue #525).

Pydantic only, no database: FastAPI turns these ValidationErrors into
422 responses that name the offending field, which is exactly the
acceptance behaviour for POST /api/invoices/.
"""

import pytest
from pydantic import ValidationError

from src.schemas.invoice import InvoiceCreate, InvoiceItemCreate


def _item(**overrides):
    values = {
        "product_id": 1,
        "quantity": 1,
        "unit_price": 100,
    }
    values.update(overrides)
    return InvoiceItemCreate(**values)


def _invoice(**overrides):
    values = {
        "ledger_id": 1,
        "items": [_item()],
    }
    values.update(overrides)
    return InvoiceCreate(**values)


def test_percentage_line_discount_over_100_rejected():
    with pytest.raises(ValidationError) as excinfo:
        _item(discount_type="percentage", discount_value=150)
    assert "discount_value" in str(excinfo.value)


def test_negative_unit_price_rejected():
    with pytest.raises(ValidationError) as excinfo:
        _item(unit_price=-5)
    assert "unit_price" in str(excinfo.value)


def test_negative_line_discount_rejected():
    with pytest.raises(ValidationError) as excinfo:
        _item(discount_type="net", discount_value=-10)
    assert "discount_value" in str(excinfo.value)


def test_percentage_invoice_discount_over_100_rejected():
    with pytest.raises(ValidationError) as excinfo:
        _invoice(discount_type="percentage", discount_value=150)
    assert "discount_value" in str(excinfo.value)


def test_negative_invoice_discount_rejected():
    with pytest.raises(ValidationError) as excinfo:
        _invoice(discount_type="net", discount_value=-1)
    assert "discount_value" in str(excinfo.value)


def test_zero_unit_price_still_accepted():
    assert _item(unit_price=0).unit_price == 0


def test_full_percentage_discount_still_accepted():
    item = _item(discount_type="percentage", discount_value=100)
    assert item.discount_value == 100


def test_net_discount_over_100_still_accepted():
    # A flat discount has no percentage cap; the processor clamps it to
    # the line total, so it must keep passing schema validation.
    item = _item(discount_type="net", discount_value=1000)
    assert item.discount_value == 1000


def test_discount_without_type_only_needs_non_negative():
    assert _item(discount_value=50).discount_value == 50
    assert _item(discount_value=None).discount_value is None
