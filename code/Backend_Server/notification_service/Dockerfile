FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better layer caching
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir --default-timeout=180 --retries 10 -r requirements.txt

# Copy app source
COPY . .

EXPOSE 8006

# Default command (FastAPI)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8006"]
