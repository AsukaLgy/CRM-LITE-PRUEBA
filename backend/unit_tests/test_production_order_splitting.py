from decimal import Decimal

import pytest

from app.services import _allocate_advance, _production_order_item_groups


@pytest.mark.parametrize(('count', 'expected'), [(1, 1), (2, 1), (3, 3), (4, 4)])
def test_groups_top_level_form_lines_without_counting_units_or_copies(count, expected):
    items = [
        {'product': 'Cards', 'quantity': Decimal('250'), 'specs': {'copies': 3}, 'line': index}
        for index in range(count)
    ]

    groups = _production_order_item_groups(items, split_products=True)

    assert len(groups) == expected
    assert [item for group in groups for item in group] == items
    if count <= 2:
        assert groups == [items]
    else:
        assert all(len(group) == 1 for group in groups)


def test_generic_conversion_keeps_all_lines_together():
    items = [{'line': index} for index in range(4)]

    assert _production_order_item_groups(items, split_products=False) == [items]


def test_split_advance_preserves_total_and_order_prices_to_the_cent():
    prices = [Decimal('0.01'), Decimal('0.02'), Decimal('0.03')]

    allocated = _allocate_advance(Decimal('0.05'), prices)

    assert sum(allocated, Decimal('0.00')) == Decimal('0.05')
    assert all(advance <= price for advance, price in zip(allocated, prices))

