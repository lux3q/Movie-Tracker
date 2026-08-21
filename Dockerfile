FROM python:3.12-slim

WORKDIR /app

# Dependencies are copied on their own first, so this layer is rebuilt
# only when requirements.txt changes, not on every code edit.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5001

CMD ["python", "main.py"]
