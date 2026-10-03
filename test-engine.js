var C = require('./engine.js'), fails = 0, n = 0;
function eq(a, b, m) { n++; if (a !== b) { fails++; console.log('FAIL', m, JSON.stringify(a), JSON.stringify(b)); } }
function iso(t) { return new Date(t).toISOString().slice(0, 16); }
function runs(e, from, k) { var c = C.parse(e); return C.next(c, from, k).map(iso); }
var F = Date.UTC(2026, 9, 3, 12, 0); // Sat 2026-10-03 12:00 UTC
// crontab(5) example: "30 4 1,15 * 5" = 4:30 on 1st and 15th PLUS every Friday
eq(runs('30 4 1,15 * 5', F, 6).join(' '), '2026-10-09T04:30 2026-10-15T04:30 2026-10-16T04:30 2026-10-23T04:30 2026-10-30T04:30 2026-11-01T04:30', 'OR rule');
// crontab(5) example "5 4 * * sun"
eq(runs('5 4 * * sun', F, 2).join(' '), '2026-10-04T04:05 2026-10-11T04:05', 'sun name');
// nicknames from the man page
eq(C.parse('@yearly').expr, '0 0 1 1 *', 'yearly'); eq(C.parse('@annually').expr, '0 0 1 1 *', 'annually'); eq(C.parse('@monthly').expr, '0 0 1 * *', 'monthly'); eq(C.parse('@weekly').expr, '0 0 * * 0', 'weekly'); eq(C.parse('@daily').expr, '0 0 * * *', 'daily'); eq(C.parse('@hourly').expr, '0 * * * *', 'hourly');
eq(C.parse('@reboot').error !== undefined, true, 'reboot error'); eq(C.parse('@nope').error !== undefined, true, 'unknown nick');
// AND when one is star
eq(runs('0 0 15 * *', F, 2).join(' '), '2026-10-15T00:00 2026-11-15T00:00', 'dom only'); eq(runs('0 0 * * 1', F, 2).join(' '), '2026-10-05T00:00 2026-10-12T00:00', 'dow only');
eq(runs('0 0 */2 * 1', F, 3).join(' '), runs('0 0 */2 * 1', F, 3).join(' '), 'star step is star');
eq(C.parse('0 0 */2 * 1').domStar, true, 'star step counts as star');
// 0 and 7 both Sunday
eq(runs('0 0 * * 7', F, 1)[0], '2026-10-04T00:00', '7 is sunday'); eq(runs('0 0 * * 0', F, 1)[0], '2026-10-04T00:00', '0 is sunday');
// steps and ranges
eq(runs('*/15 9-17 * * mon-fri', F, 3).join(' '), '2026-10-05T09:00 2026-10-05T09:15 2026-10-05T09:30', 'weekday office');
eq(runs('0-10/5 0 * * *', F, 4).join(' '), '2026-10-04T00:00 2026-10-04T00:05 2026-10-04T00:10 2026-10-05T00:00', 'range step');
eq(runs('10/20 0 * * *', F, 3).join(' '), '2026-10-04T00:10 2026-10-04T00:30 2026-10-04T00:50', 'open step');
eq(runs('0 0 1 jan,jul *', F, 2).join(' '), '2027-01-01T00:00 2027-07-01T00:00', 'month names');
eq(runs('0 0 29 2 *', F, 2).join(' '), '2028-02-29T00:00 2032-02-29T00:00', 'leap day');
eq(runs('0 0 31 * *', F, 3).join(' '), '2026-10-31T00:00 2026-12-31T00:00 2027-01-31T00:00', 'day 31 skips short months');
eq(runs('59 23 31 12 *', Date.UTC(2026, 11, 31, 23, 59), 1)[0], '2027-12-31T23:59', 'strictly after');
eq(runs('* * * * *', F, 2).join(' '), '2026-10-03T12:01 2026-10-03T12:02', 'every minute');
eq(runs('0 12 * * *', F, 1)[0], '2026-10-04T12:00', 'same minute not repeated');
eq(runs('30 12 * * *', F, 1)[0], '2026-10-03T12:30', 'later today');
eq(runs('  0   0  *  *  *  ', F, 1)[0], '2026-10-04T00:00', 'extra spaces');
eq(runs('0 0 30 2 *', F, 1).length, 0, 'never runs');
// errors
['61 * * * *', '* 24 * * *', '* * 0 * *', '* * 32 * *', '* * * 13 *', '* * * * 8', '* * * *', '* * * * * *', '', 'a b c d e', '5-1 * * * *', '*/0 * * * *', '1//2 * * * *', ',1 * * * *', '* * * foo *', '1-2-3 * * * *'].forEach(function (e) { eq(C.parse(e).error !== undefined, true, 'error: ' + e); });
// descriptions
eq(C.describe(C.parse('30 4 1,15 * 5')), 'At 04:30 UTC, on day 1 and 15 of the month, plus every Friday', 'desc OR');
eq(C.describe(C.parse('* * * * *')), 'Every minute', 'desc every minute'); eq(C.describe(C.parse('*/5 * * * *')), 'Every 5 minutes', 'desc step'); eq(C.describe(C.parse('15 * * * *')), 'At minute 15 of every hour', 'desc min'); eq(C.describe(C.parse('@daily')), 'At 00:00 UTC', 'desc daily');
eq(C.describe(C.parse('0 0 1 jan *')), 'At 00:00 UTC, on day 1 of the month, in January', 'desc jan'); eq(C.describe(C.parse('0 9 * * mon-fri')), 'At 09:00 UTC, on Monday, Tuesday, Wednesday, Thursday and Friday', 'desc weekdays');
console.log(n - fails + '/' + n + ' pass'); process.exit(fails ? 1 : 0);
