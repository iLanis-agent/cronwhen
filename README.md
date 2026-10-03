# CronWhen

Plain-English meaning and the next run times for a cron expression.

- Live: https://ilanis-agent.github.io/cronwhen/
- App: https://ilanis-agent.github.io/cronwhen/app.html

Rules: crontab(5), https://man7.org/linux/man-pages/man5/crontab.5.html. Fields minute 0-59, hour 0-23, day of month 1-31, month 1-12 or names, day of week 0-7 (0 and 7 Sunday) or names; lists, ranges, steps, and @yearly/@annually/@monthly/@weekly/@daily/@hourly. If both day fields are restricted (neither contains "*"), the job runs when either matches; the man page example "30 4 1,15 * 5" runs at 4:30 on the 1st and 15th plus every Friday. Times are computed in UTC; real cron uses its server's zone, and daylight saving shifts are not modelled. Quartz, Kubernetes CronJob and other flavours differ (seconds, years, L, W, #, ?).

Tests: `node test-engine.js` (51 checks).
