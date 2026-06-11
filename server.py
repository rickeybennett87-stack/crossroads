#!/usr/bin/env python3
"""Crossroads proxy server — serves static files + proxies JPL Horizons API."""
import http.server, urllib.request, urllib.parse, json, os, sys
import concurrent.futures
from datetime import datetime, timezone

DIR = os.path.dirname(os.path.abspath(__file__))

JPL_BODIES = {
    'Sun': '10', 'Moon': '301',
    'Mercury': '199', 'Venus': '299', 'Mars': '499',
    'Jupiter': '599', 'Saturn': '699',
    'Uranus': '799', 'Neptune': '899', 'Pluto': '999',
}

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def do_GET(self):
        if self.path.startswith('/api/jpl-chart'):
            self._jpl_chart()
        elif self.path.startswith('/api/jpl'):
            self._jpl_single()
        elif self.path.startswith('/api/geocode'):
            self._geocode()
        elif self.path.startswith('/api/timezone'):
            self._timezone()
        else:
            super().do_GET()

    # ── Single-body endpoint (kept for compatibility) ──────────────────────────
    def _jpl_single(self):
        qs = urllib.parse.parse_qs(self.path.split('?', 1)[1] if '?' in self.path else '')
        body_name = qs.get('body', ['Sun'])[0]
        utc_str   = qs.get('date', [''])[0]
        cmd       = JPL_BODIES.get(body_name, '10')
        try:
            start, stop = _jd_window(utc_str)
        except Exception:
            self._json({'error': f'bad date: {utc_str}'}, 400); return
        try:
            lon = _fetch_elon_retry(cmd, start, stop)
            if lon is None:
                raise ValueError('could not parse ecliptic longitude')
            self._json({'lon': lon, 'body': body_name, 'source': 'NASA JPL Horizons'})
        except Exception as e:
            self._json({'error': str(e)}, 502)

    # ── Full-chart endpoint — all 10 bodies + velocities ───────────────────────
    def _jpl_chart(self):
        qs = urllib.parse.parse_qs(self.path.split('?', 1)[1] if '?' in self.path else '')
        utc_str = qs.get('date', [''])[0]
        try:
            start, stop = _jd_window(utc_str)
            # yesterday window for velocity calculation
            dt = datetime.fromisoformat(utc_str.replace('Z', '+00:00'))
            epoch = datetime(2000, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
            jd_now  = 2451545.0 + (dt - epoch).total_seconds() / 86400.0
            jd_yest = jd_now - 1.0
            y_start = f'JD{jd_yest:.6f}'
            y_stop  = f'JD{jd_yest + 1/1440:.6f}'
        except Exception:
            self._json({'error': f'bad date: {utc_str}'}, 400); return

        positions  = {}
        velocities = {}
        errors     = []

        def fetch_both(name, cmd):
            pos_now  = _fetch_elon_retry(cmd, start, stop)
            pos_yest = _fetch_elon_retry(cmd, y_start, y_stop)
            return name, pos_now, pos_yest

        # JPL rate-limits aggressive concurrency; 4 workers keeps us under the limit
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
            futures = {ex.submit(fetch_both, name, cmd): name
                       for name, cmd in JPL_BODIES.items()}
            for fut in concurrent.futures.as_completed(futures):
                try:
                    name, pos_now, pos_yest = fut.result()
                    if pos_now is None:
                        errors.append(name); continue
                    positions[name] = pos_now
                    if pos_yest is not None:
                        raw = pos_now - pos_yest
                        # wrap to (-180, +180] to handle 0°/360° boundary
                        if raw > 180:  raw -= 360
                        if raw < -180: raw += 360
                        velocities[name] = raw
                except Exception as e:
                    errors.append(f'{futures[fut]}:{e}')

        self._json({
            'positions':  positions,
            'velocities': velocities,
            'source':     'NASA JPL Horizons',
            'jd':         jd_now,
            'errors':     errors,
        })

    # ── Geocoding via Nominatim (OpenStreetMap) ────────────────────────────────
    def _geocode(self):
        qs      = urllib.parse.parse_qs(self.path.split('?',1)[1] if '?' in self.path else '')
        query   = qs.get('q', [''])[0].strip()
        if not query:
            self._json({'error': 'missing q parameter'}, 400); return
        params  = urllib.parse.urlencode({'q': query, 'format': 'json', 'limit': '1',
                                          'addressdetails': '1'})
        url     = 'https://nominatim.openstreetmap.org/search?' + params
        req     = urllib.request.Request(url, headers={
            'User-Agent': 'Crossroads/1.0 (astrology app; contact rickeybennett87@gmail.com)'
        })
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                results = json.loads(r.read())
            if not results:
                self._json({'error': f'No results for: {query}'}); return
            hit = results[0]
            self._json({
                'lat':          float(hit['lat']),
                'lon':          float(hit['lon']),
                'display_name': hit.get('display_name',''),
            })
        except Exception as e:
            self._json({'error': str(e)}, 502)

    # ── Timezone + UTC offset for a lat/lon at a given Unix timestamp ──────────
    def _timezone(self):
        qs  = urllib.parse.parse_qs(self.path.split('?',1)[1] if '?' in self.path else '')
        try:
            lat = float(qs.get('lat',['0'])[0])
            lon = float(qs.get('lon',['0'])[0])
            ts  = int(qs.get('ts',['0'])[0])   # Unix timestamp for DST-aware offset
        except (ValueError, TypeError):
            self._json({'error': 'bad params'}, 400); return
        try:
            from timezonefinder import TimezoneFinder
            import pytz
            from datetime import datetime as dt
            tf       = TimezoneFinder()
            tz_name  = tf.timezone_at(lat=lat, lng=lon)
            if not tz_name:
                self._json({'error': 'timezone not found for this location'}); return
            tz       = pytz.timezone(tz_name)
            aware_dt = dt.fromtimestamp(ts, tz=pytz.utc).astimezone(tz)
            offset_h = aware_dt.utcoffset().total_seconds() / 3600
            self._json({'timezone': tz_name, 'offset': offset_h,
                        'offset_label': aware_dt.strftime('%Z')})
        except Exception as e:
            self._json({'error': str(e)}, 500)

    def _json(self, obj, code=200):
        payload = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, fmt, *args):
        print(f'[crossroads] {self.address_string()} {fmt % args}', flush=True)


def _jd_window(utc_str):
    """Return (start_jd_str, stop_jd_str) from an ISO UTC string."""
    dt    = datetime.fromisoformat(utc_str.replace('Z', '+00:00'))
    epoch = datetime(2000, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    jd    = 2451545.0 + (dt - epoch).total_seconds() / 86400.0
    return f'JD{jd:.6f}', f'JD{jd + 1/1440:.6f}'


def _fetch_elon(cmd, start, stop):
    """Fetch a single tropical ecliptic longitude from JPL Horizons."""
    params = urllib.parse.urlencode({
        'format': 'json', 'COMMAND': cmd,
        'OBJ_DATA': 'NO', 'MAKE_EPHEM': 'YES',
        'EPHEM_TYPE': 'OBSERVER', 'CENTER': '500@399',
        'START_TIME': start, 'STOP_TIME': stop,
        'STEP_SIZE': '1m', 'QUANTITIES': '31',
    })
    url = 'https://ssd.jpl.nasa.gov/api/horizons.api?' + params
    req = urllib.request.Request(url, headers={'User-Agent': 'Crossroads/1.0'})
    with urllib.request.urlopen(req, timeout=20) as r:
        data = json.loads(r.read())
    return _parse_elon(data.get('result', ''))


def _fetch_elon_retry(cmd, start, stop, retries=3):
    """Fetch with exponential backoff on 503."""
    import time
    for attempt in range(retries):
        try:
            return _fetch_elon(cmd, start, stop)
        except Exception as e:
            if attempt < retries - 1 and ('503' in str(e) or '429' in str(e)):
                time.sleep(1.5 ** attempt)
            else:
                raise
    return None


def _parse_elon(text):
    in_data = False
    for line in text.split('\n'):
        if '$$SOE' in line:
            in_data = True; continue
        if '$$EOE' in line: break
        if in_data and line.strip():
            for p in line.split()[2:]:
                try:
                    v = float(p)
                    if 0 <= v < 360: return v
                except ValueError:
                    pass
    return None


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    print(f'Crossroads server at http://localhost:{port}/', flush=True)
    with http.server.HTTPServer(('', port), Handler) as s:
        s.serve_forever()
