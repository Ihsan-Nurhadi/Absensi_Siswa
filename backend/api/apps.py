import os
import sys
from django.apps import AppConfig

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        # Avoid running listener during migrations or runserver reloader initialization
        if 'manage.py' in sys.argv and any(arg in sys.argv for arg in ['migrate', 'makemigrations', 'collectstatic', 'test']):
            return
        
        # Start MQTT listener in background if running server or ENABLE_MQTT is set
        enable_mqtt = os.environ.get('ENABLE_MQTT', '').lower() in ['1', 'true', 'yes']
        if os.environ.get('RUN_MAIN') == 'true' or 'runserver' in sys.argv or enable_mqtt:
            try:
                from api.mqtt_service import mqtt_service
                mqtt_service.start()
            except Exception as e:
                print(f"[MQTT] Init warning: {e}")
