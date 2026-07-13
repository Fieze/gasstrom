# Consumption calculation rules

GasStrom treats readings as cumulative meter values and keeps full floating-point precision internally. Rounding to one or two decimal places happens only in the user interface.

## Intervals and months

- Dates are calendar dates without a time component. Calendar-day differences are used so daylight-saving transitions do not add or remove consumption days.
- Consumption between two readings is distributed evenly over every calendar day starting at the first reading and ending immediately before the second.
- Monthly coverage reports the number of represented calendar days, not the number of readings.

## Duplicate dates and meter changes

- When several readings have the same date, calculations deterministically use the highest value. The interface displays a warning so the user can correct the source data.
- A lower later value is treated as a meter reset or replacement. The interval crossing the reset is unknowable and excluded instead of inventing consumption. Known positive intervals before and after it remain part of totals.
- These conditions are visible above the monthly charts and do not silently produce negative consumption.

## Billing periods and forecasts

- Billing dates use `DD.MM.`. A configured `29.02.` maps to 28 February in non-leap years and returns to 29 February in leap years.
- Completed periods require data coverage at both boundaries. The active period may end at the most recent reading.
- Forecasts compare the elapsed part of the active period with the same number of calendar days in the latest completed period. Without comparable history, linear extrapolation is used.

## Prices

- Work price is entered in cents per kWh and converted to euros.
- Annual base cost is monthly base price multiplied by 12.
- Annual payments equal monthly payment multiplied by the configured number of payments.
- Gas volume is converted to kWh with the configured conversion factor before cost calculation.
