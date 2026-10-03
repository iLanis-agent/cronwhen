(function (root) {
  var MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  var DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  var MONF = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DOWF = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var NICK = { '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *', '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *' };
  var SPEC = [
    { name: 'minute', lo: 0, hi: 59 }, { name: 'hour', lo: 0, hi: 23 }, { name: 'day of month', lo: 1, hi: 31 },
    { name: 'month', lo: 1, hi: 12, names: MON, off: 1 }, { name: 'day of week', lo: 0, hi: 7, names: DOW, off: 0 }
  ];
  function num(tok, sp) {
    var t = tok.toLowerCase();
    if (sp.names) { var i = sp.names.indexOf(t); if (i >= 0) return i + sp.off; }
    if (!/^\d+$/.test(tok)) return NaN;
    return parseInt(tok, 10);
  }
  function parseField(txt, sp) {
    var set = {}, parts = txt.split(',');
    for (var p = 0; p < parts.length; p++) {
      var part = parts[p]; if (part === '') return { error: 'Empty item in ' + sp.name + ' field.' };
      var step = 1, range = part, sl = part.split('/');
      if (sl.length > 2) return { error: 'Too many "/" in ' + sp.name + ' field.' };
      if (sl.length === 2) { if (!/^\d+$/.test(sl[1]) || parseInt(sl[1], 10) < 1) return { error: 'Step in ' + sp.name + ' field must be a whole number of 1 or more.' }; step = parseInt(sl[1], 10); range = sl[0]; }
      var a, b;
      if (range === '*') { a = sp.lo; b = sp.name === 'day of week' ? 6 : sp.hi; }
      else if (range.indexOf('-') > 0) { var r = range.split('-'); if (r.length !== 2) return { error: 'Bad range in ' + sp.name + ' field.' }; a = num(r[0], sp); b = num(r[1], sp); }
      else { a = num(range, sp); b = sl.length === 2 ? sp.hi : a; }
      if (isNaN(a) || isNaN(b)) return { error: 'Cannot read "' + part + '" in ' + sp.name + ' field.' };
      if (a < sp.lo || b > sp.hi) return { error: sp.name + ' must be ' + sp.lo + ' to ' + sp.hi + '.' };
      if (a > b) return { error: 'Range in ' + sp.name + ' field runs backwards.' };
      for (var v = a; v <= b; v += step) set[sp.name === 'day of week' && v === 7 ? 0 : v] = true;
    }
    return { set: set };
  }
  function parse(expr) {
    if (typeof expr !== 'string') return { error: 'Enter a cron expression.' };
    var e = expr.trim().replace(/\s+/g, ' ');
    if (e === '') return { error: 'Enter a cron expression.' };
    if (e.charAt(0) === '@') { if (e.toLowerCase() === '@reboot') return { error: '@reboot runs at startup, not on a schedule.' }; var nk = NICK[e.toLowerCase()]; if (!nk) return { error: 'Unknown nickname ' + e + '.' }; e = nk; }
    var f = e.split(' ');
    if (f.length !== 5) return { error: 'Need 5 fields (minute hour day-of-month month day-of-week), got ' + f.length + '.' };
    var out = { expr: e, fields: f, sets: [] };
    for (var i = 0; i < 5; i++) { var r = parseField(f[i], SPEC[i]); if (r.error) return { error: r.error }; out.sets.push(r.set); }
    out.domStar = f[2].indexOf('*') >= 0; out.dowStar = f[4].indexOf('*') >= 0;
    return out;
  }
  function dayMatches(c, y, mo, d) {
    var dow = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
    var dm = !!c.sets[2][d], wm = !!c.sets[4][dow];
    if (!c.domStar && !c.dowStar) return dm || wm;
    return dm && wm;
  }
  // all times UTC; returns array of ms timestamps strictly after fromMs
  function next(c, fromMs, count) {
    var res = [], t = new Date(fromMs), y = t.getUTCFullYear(), mo = t.getUTCMonth() + 1, d = t.getUTCDate();
    var startDay = Date.UTC(y, mo - 1, d), guard = 0;
    var mins = Object.keys(c.sets[0]).map(Number).sort(function (a, b) { return a - b; });
    var hrs = Object.keys(c.sets[1]).map(Number).sort(function (a, b) { return a - b; });
    var day = startDay;
    while (res.length < count && guard++ < 366 * 8) {
      var dt = new Date(day); var yy = dt.getUTCFullYear(), mm = dt.getUTCMonth() + 1, dd = dt.getUTCDate();
      if (c.sets[3][mm] && dayMatches(c, yy, mm, dd)) {
        for (var h = 0; h < hrs.length && res.length < count; h++) for (var m = 0; m < mins.length && res.length < count; m++) {
          var ts = day + hrs[h] * 3600000 + mins[m] * 60000; if (ts > fromMs) res.push(ts);
        }
      }
      day += 86400000;
    }
    return res;
  }
  function list(set, sp, full) {
    var ks = Object.keys(set).map(Number).sort(function (a, b) { return a - b; });
    return ks.map(function (k) { return sp.names ? (full ? (sp.name === 'month' ? MONF[k - 1] : DOWF[k]) : sp.names[k - sp.off]) : String(k); });
  }
  function join(a) { return a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function describe(c) {
    var f = c.fields, p = [];
    var minAll = f[0] === '*', hrAll = f[1] === '*';
    var mins = list(c.sets[0], SPEC[0]), hrs = list(c.sets[1], SPEC[1]);
    function hhmm(h, m) { return (h.length < 2 ? '0' : '') + h + ':' + (m.length < 2 ? '0' : '') + m; }
    if (minAll && hrAll) p.push('Every minute');
    else if (/^\*\/\d+$/.test(f[0]) && hrAll) p.push('Every ' + f[0].slice(2) + ' minutes');
    else if (!minAll && hrAll && mins.length === 1) p.push('At minute ' + mins[0] + ' of every hour');
    else if (mins.length === 1 && hrs.length === 1 && !minAll && !hrAll) p.push('At ' + hhmm(hrs[0], mins[0]) + ' UTC');
    else if (mins.length === 1 && !minAll && !hrAll) p.push('At minute ' + mins[0] + ' past hour ' + join(hrs));
    else p.push('At minute ' + join(mins) + ' past ' + (hrAll ? 'every hour' : 'hour ' + join(hrs)));
    var dom = f[2] !== '*', mon = f[3] !== '*', dow = f[4] !== '*';
    if (dom && dow && !c.domStar && !c.dowStar) p.push('on day ' + join(list(c.sets[2], SPEC[2])) + ' of the month, plus every ' + join(list(c.sets[4], SPEC[4], true)));
    else { if (dom) p.push('on day ' + join(list(c.sets[2], SPEC[2])) + ' of the month'); if (dow) p.push('on ' + join(list(c.sets[4], SPEC[4], true))); }
    if (mon) p.push('in ' + join(list(c.sets[3], SPEC[3], true)));
    return p.join(', ');
  }
  var api = { parse: parse, next: next, describe: describe, SPEC: SPEC };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CronWhen = api;
})(typeof window !== 'undefined' ? window : this);
