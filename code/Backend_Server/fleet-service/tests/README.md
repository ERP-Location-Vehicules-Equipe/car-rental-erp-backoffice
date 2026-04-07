# Test Cases

This folder groups the API test cases that can be referenced in the report.

## Vehicle tests

- `test_create_vehicle_returns_201_and_persists_data`
- `test_update_vehicle_status_endpoint_updates_only_status`
- `test_update_vehicle_with_invalid_status_returns_422`
- `test_delete_vehicle_also_deletes_related_entretiens`

## Entretien tests

- `test_create_entretien_sets_vehicle_status_to_entretien`
- `test_list_vehicle_entretiens_returns_created_items`
- `test_update_entretien_to_terminee_restores_vehicle_status`
- `test_create_entretien_with_invalid_dates_returns_422`

## Run tests

```powershell
pytest tests
```
