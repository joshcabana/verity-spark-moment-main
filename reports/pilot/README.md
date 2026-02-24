# Pilot Reports

This directory stores generated pilot operations evidence.

## File conventions

- Daily ops report:
  - `daily-ops-YYYY-MM-DD.json`
  - Produced by: `npm run pilot:ops:daily`
- Gate report:
  - `gate-a-YYYY-MM-DD.json`
  - `gate-b-YYYY-MM-DD.json`
  - `gate-final-YYYY-MM-DD.json`
  - Produced by: `npm run pilot:gate -- --gate <A|B|FINAL>`

## Tracker sync

After generating a report, sync the tracker:

```bash
npm run pilot:tracker:update -- --daily-report reports/pilot/daily-ops-YYYY-MM-DD.json --date YYYY-MM-DD
npm run pilot:tracker:update -- --gate-report reports/pilot/gate-a-YYYY-MM-DD.json --gate A
```

Wrappers (recommended):

```bash
npm run pilot:run:daily -- --date YYYY-MM-DD
npm run pilot:run:gate -- --gate A
```
