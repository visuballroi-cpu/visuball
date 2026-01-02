from datetime import datetime, timedelta

def get_weekly_schedule():
    # Mock data relative to "today"
    today = datetime.now()
    
    sessions = [
        {
            "id": 101,
            "title": "Passing Drills - U19",
            "date": (today - timedelta(days=2)).strftime("%Y-%m-%d %H:00"),
            "status": "COMPLETED",
            "coach": "Roi"
        },
        {
            "id": 102,
            "title": "Tactical Setups - Defense",
            "date": (today - timedelta(days=1)).strftime("%Y-%m-%d %H:00"),
            "status": "COMPLETED",
            "coach": "Roi"
        },
        {
            "id": 103,
            "title": "Shooting Practice",
            "date": (today + timedelta(days=0)).strftime("%Y-%m-%d 18:00"),
            "status": "UPCOMING",
            "coach": "Roi"
        },
        {
            "id": 104,
            "title": "Fitness & Recovery",
            "date": (today + timedelta(days=2)).strftime("%Y-%m-%d 17:30"),
            "status": "UPCOMING",
            "coach": "Roi"
        },
        {
            "id": 105,
            "title": "Match Prep vs Maccabi",
            "date": (today + timedelta(days=4)).strftime("%Y-%m-%d 19:00"),
            "status": "UPCOMING",
            "coach": "Roi"
        }
    ]
    return sessions
