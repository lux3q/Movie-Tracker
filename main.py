from flask import Flask
from app.database import init_db
from app.api import api
from app.views import views

app = Flask(__name__, template_folder="app/templates", static_folder="app/static")

init_db()

app.register_blueprint(api)
app.register_blueprint(views)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)

