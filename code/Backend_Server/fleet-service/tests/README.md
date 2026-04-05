# Test Cases

This folder groups the API test cases that can be referenced in the report.

## Vehicle tests

- `test_create_vehicle_returns_201_and_persists_data`
  Validates vehicle creation and returned payload.
- `test_update_vehicle_status_endpoint_updates_only_status`
  Validates the dedicated status endpoint.
- `test_update_vehicle_with_invalid_status_returns_422`
  Validates status enum rejection.

## Maintenance tests

- `test_create_maintenance_sets_vehicle_status_to_maintenance`
  Validates maintenance creation and vehicle status sync.
- `test_list_vehicle_maintenances_returns_created_items`
  Validates maintenance listing for one vehicle.
- `test_update_maintenance_to_terminee_restores_vehicle_status`
  Validates maintenance completion and vehicle status restoration.
- `test_create_maintenance_with_invalid_dates_returns_422`
  Validates date consistency rules.

## Run tests

```powershell
pytest tests
```
