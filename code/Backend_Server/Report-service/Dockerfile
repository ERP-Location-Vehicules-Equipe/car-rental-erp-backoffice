FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
COPY logo.png /app/logo.png

EXPOSE 8007

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8007"]
