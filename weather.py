import urllib.request
import json
import threading

# Tel Aviv Coordinates
LAT = 32.0853
LON = 34.7818

def get_weather_desc(code):
    # WMO Weather interpretation codes (WW)
    if code == 0: return "Clear Sky"
    if code in [1, 2, 3]: return "Partly Cloudy"
    if code in [45, 48]: return "Foggy"
    if code in [51, 53, 55]: return "Drizzle"
    if code in [61, 63, 65]: return "Rainy"
    if code in [71, 73, 75]: return "Snowy"
    if code >= 95: return "Thunderstorm"
    return "Cloudy"

def fetch_weather_forecast(callback):
    """
    Fetches 7-day weather forecast in a background thread and calls callback(forecast_dict)
    forecast_dict format: {'YYYY-MM-DD': {'temp': 24, 'desc': 'Clear Sky'}, ...}
    """
    def run():
        try:
            url = f"https://api.open-meteo.com/v1/forecast?latitude={LAT}&longitude={LON}&daily=weathercode,temperature_2m_max&timezone=auto"
            with urllib.request.urlopen(url) as response:
                data = json.loads(response.read().decode())
                daily = data.get('daily', {})
                times = daily.get('time', [])
                codes = daily.get('weathercode', [])
                temps = daily.get('temperature_2m_max', [])
                
                forecast = {}
                for i in range(len(times)):
                    forecast[times[i]] = {
                        'temp': temps[i],
                        'desc': get_weather_desc(codes[i])
                    }
                callback(forecast)
        except Exception as e:
            print(f"Weather Error: {e}")
            callback(None)

    thread = threading.Thread(target=run, daemon=True)
    thread.start()
